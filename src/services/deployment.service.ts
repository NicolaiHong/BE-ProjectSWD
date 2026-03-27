import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiRepository } from "../repositories/api.repository";
import { GeneratedCodeRepository } from "../repositories/generatedCode.repository";
import { ApiService } from "./api.service";
import { NotFoundError, BadRequestError } from "../middlewares/errorHandler";
import type { CreateDeploymentRequest, UpdateDeploymentRequest, StartDeploymentRequest } from "../dtos/DeploymentDtos";
import type { deployment_provider, deployment_status } from "../generated/prisma/enums";
import { getDeploymentProvider, getAvailableProviders, type DeploymentPrerequisites, type SourceFile } from "./providers";

export class DeploymentService {
  static async list(apiId: string, developerId: string, page: number, limit: number) {
    await ApiService.verifyOwnership(apiId, developerId);
    const [data, total] = await Promise.all([
      DeploymentRepository.listByApi(apiId, page, limit),
      DeploymentRepository.countByApi(apiId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return deployment;
  }

  static async create(apiId: string, developerId: string, data: CreateDeploymentRequest) {
    await ApiService.verifyOwnership(apiId, developerId);
    const deployment = await DeploymentRepository.create(apiId, data);
    return deployment;
  }

  static async update(deploymentId: string, developerId: string, data: UpdateDeploymentRequest) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    const updated = await DeploymentRepository.update(deploymentId, data);
    // Auto-transition workflow state on deployment status change
    if (data.status === "DEPLOYED") {
      await ApiRepository.updateWorkflowState(deployment.api_id, "DEPLOYED").catch(() => {});
    } else if (data.status === "FAILED") {
      await ApiRepository.updateWorkflowState(deployment.api_id, "FAILED").catch(() => {});
    }
    return updated;
  }

  static async delete(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    return DeploymentRepository.delete(deploymentId);
  }

  /**
   * Get available deployment providers
   */
  static getProviders() {
    return getAvailableProviders();
  }

  /**
   * Start a new deployment using the specified provider
   */
  static async startDeployment(
    apiId: string,
    developerId: string,
    data: StartDeploymentRequest
  ) {
    const api = await ApiService.verifyOwnership(apiId, developerId);

    // Check if API is ready to deploy
    if (api.workflow_state !== "READY_TO_DEPLOY" && api.workflow_state !== "CODE_GENERATED") {
      throw BadRequestError(
        `Cannot deploy: API must be in READY_TO_DEPLOY or CODE_GENERATED state. ` +
        `Current state: ${api.workflow_state ?? "null"}`
      );
    }

    // Get generated source files
    const sourceFiles = await this.getSourceFilesForApi(apiId);
    if (sourceFiles.length === 0) {
      throw BadRequestError("No generated source code found. Generate code before deploying.");
    }

    // Get the provider
    const provider = getDeploymentProvider(data.provider);

    // Build prerequisites
    const prereqs: DeploymentPrerequisites = {
      apiId,
      projectName: api.name,
      sourceFiles,
      environment: data.environment,
    };

    // Validate prerequisites
    const validation = await provider.validatePrerequisites(prereqs);
    if (!validation.valid) {
      throw BadRequestError(`Deployment validation failed: ${validation.errors.join(", ")}`);
    }

    // Create deployment record
    const deployment = await DeploymentRepository.create(apiId, {
      environment: data.environment,
      status: "PENDING",
      provider: data.provider,
      generation_session_id: data.generation_session_id,
    });

    // Update API workflow state to DEPLOYING
    await ApiRepository.updateWorkflowState(apiId, "DEPLOYING").catch(() => {});

    // Start deployment asynchronously
    this.executeDeployment(deployment.id, apiId, provider, prereqs, data.options).catch((err) => {
      console.error(`[DeploymentService] Async deployment failed for ${deployment.id}:`, err);
    });

    return deployment;
  }

  /**
   * Execute deployment asynchronously
   */
  private static async executeDeployment(
    deploymentId: string,
    apiId: string,
    provider: ReturnType<typeof getDeploymentProvider>,
    prereqs: DeploymentPrerequisites,
    options?: Record<string, unknown>
  ) {
    try {
      // Update to IN_PROGRESS
      await DeploymentRepository.updateStatus(deploymentId, "IN_PROGRESS", {
        started_at: new Date(),
      });

      // Call provider
      const result = await provider.createDeployment(prereqs, options);

      if (result.success) {
        // Update deployment record with success
        await DeploymentRepository.setDeploymentResult(deploymentId, {
          status: "DEPLOYED",
          deploy_url: result.deployUrl,
          metadata_json: {
            ...result.metadata,
            providerDeploymentId: result.providerDeploymentId,
          },
        });

        // Update API workflow state
        await ApiRepository.updateWorkflowState(apiId, "DEPLOYED").catch(() => {});
        
        console.log(`[DeploymentService] Deployment ${deploymentId} succeeded: ${result.deployUrl}`);
      } else {
        // Update deployment record with failure
        await DeploymentRepository.setDeploymentResult(deploymentId, {
          status: "FAILED",
          error_message: result.errorMessage,
          metadata_json: result.metadata,
        });

        // Update API workflow state
        await ApiRepository.updateWorkflowState(apiId, "FAILED").catch(() => {});
        
        console.log(`[DeploymentService] Deployment ${deploymentId} failed: ${result.errorMessage}`);
      }
    } catch (err: any) {
      console.error(`[DeploymentService] Deployment error for ${deploymentId}:`, err);

      // Update deployment record with error
      await DeploymentRepository.setDeploymentResult(deploymentId, {
        status: "FAILED",
        error_message: err.message || "Unknown deployment error",
      });

      // Update API workflow state
      await ApiRepository.updateWorkflowState(apiId, "FAILED").catch(() => {});
    }
  }

  /**
   * Get deployment status from provider
   */
  static async getDeploymentStatus(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);

    // If deployment has a provider and provider deployment ID, check status
    if (deployment.provider && deployment.metadata_json) {
      const metadata = deployment.metadata_json as Record<string, unknown>;
      const providerDeploymentId = metadata.providerDeploymentId as string | undefined;

      if (providerDeploymentId) {
        try {
          const provider = getDeploymentProvider(deployment.provider);
          const status = await provider.getDeploymentStatus(providerDeploymentId);

          // Update local record if status changed
          if (status.status !== deployment.status) {
            await DeploymentRepository.updateStatus(deploymentId, status.status as deployment_status, {
              deploy_url: status.deployUrl,
              metadata_json: { ...metadata, ...status.metadata },
              finished_at: status.status === "DEPLOYED" || status.status === "FAILED" ? new Date() : null,
            });
          }

          return {
            ...deployment,
            status: status.status,
            deploy_url: status.deployUrl || deployment.deploy_url,
            providerStatus: status,
          };
        } catch (err) {
          console.error(`[DeploymentService] Error checking provider status:`, err);
        }
      }
    }

    return deployment;
  }

  /**
   * Retry a failed deployment
   */
  static async retryDeployment(deploymentId: string, developerId: string) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);

    if (deployment.status !== "FAILED") {
      throw BadRequestError(`Cannot retry: deployment is ${deployment.status}, not FAILED`);
    }

    if (!deployment.provider) {
      throw BadRequestError("Cannot retry: deployment has no provider set");
    }

    // Start a new deployment with same parameters
    return this.startDeployment(deployment.api_id, developerId, {
      provider: deployment.provider,
      environment: deployment.environment,
      generation_session_id: deployment.generation_session_id,
    });
  }

  /**
   * Get source files for an API
   */
  private static async getSourceFilesForApi(apiId: string): Promise<SourceFile[]> {
    // Get all generated codes for this API
    const codes = await GeneratedCodeRepository.listByApi(apiId, 1, 1000);
    
    return codes.map((code) => ({
      path: code.file_path,
      content: code.content,
    }));
  }
}
