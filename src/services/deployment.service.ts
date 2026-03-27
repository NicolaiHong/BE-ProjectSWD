import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiRepository } from "../repositories/api.repository";
import { GeneratedCodeRepository } from "../repositories/generatedCode.repository";
import { ApiService } from "./api.service";
import { NotFoundError, BadRequestError } from "../middlewares/errorHandler";
import type {
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  StartDeploymentRequest,
} from "../dtos/DeploymentDtos";
import type {
  deployment_provider,
  deployment_status,
  workflow_state,
} from "../generated/prisma/enums";
import {
  getDeploymentProvider,
  getAvailableProviders,
  type DeploymentPrerequisites,
  type SourceFile,
} from "./providers";
import {
  ApiWorkflowState,
  START_DEPLOYMENT_ALLOWED_FROM,
  DEPLOYMENT_IN_PROGRESS_STATES,
  DEPLOYMENT_COMPLETE_STATES,
  type IdempotentResult,
} from "../constants/workflowStates";
import {
  logStateTransition,
  logIdempotentNoOp,
  logTransitionRejected,
  logDeploymentEvent,
  createLogContext,
} from "../utils/workflowLogger";

/**
 * Result type for deployment operations
 */
export interface DeploymentResult {
  deployment: Awaited<ReturnType<typeof DeploymentRepository.findById>>;
  changed: boolean;
  message: string;
  isExisting: boolean;
}

export class DeploymentService {
  static async list(
    apiId: string,
    developerId: string,
    page: number,
    limit: number,
  ) {
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

  static async create(
    apiId: string,
    developerId: string,
    data: CreateDeploymentRequest,
  ) {
    await ApiService.verifyOwnership(apiId, developerId);
    const deployment = await DeploymentRepository.create(apiId, data);
    return deployment;
  }

  static async update(
    deploymentId: string,
    developerId: string,
    data: UpdateDeploymentRequest,
  ) {
    const deployment = await DeploymentRepository.findById(deploymentId);
    if (!deployment) throw NotFoundError("Deployment not found");
    await ApiService.verifyOwnership(deployment.api_id, developerId);
    const updated = await DeploymentRepository.update(deploymentId, data);
    // Auto-transition workflow state on deployment status change (atomic to prevent race conditions)
    if (data.status === "DEPLOYED") {
      await ApiRepository.atomicStateTransition(
        deployment.api_id,
        ["DEPLOYING", "DEPLOY_QUEUED"] as workflow_state[],
        "DEPLOYED",
      ).catch(() => {});
    } else if (data.status === "FAILED") {
      await ApiRepository.atomicStateTransition(
        deployment.api_id,
        ["DEPLOYING", "DEPLOY_QUEUED"] as workflow_state[],
        "FAILED",
      ).catch(() => {});
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
   * Start a new deployment using the specified provider.
   *
   * Idempotent behavior:
   * - If already DEPLOY_QUEUED or DEPLOYING: return existing active deployment
   * - If already DEPLOYED: allow redeploy (creates new deployment)
   * - If CODE_GENERATED, READY_TO_DEPLOY, or FAILED: start new deployment
   * - Otherwise: return 400 error
   *
   * Duplicate protection:
   * - Checks for active deployment before creating new one
   * - Returns existing deployment if found
   *
   * @param apiId - API ID
   * @param developerId - Developer ID for ownership check
   * @param data - Deployment configuration
   * @param requestId - Optional correlation ID for logging
   * @returns DeploymentResult with deployment data and metadata
   */
  static async startDeployment(
    apiId: string,
    developerId: string,
    data: StartDeploymentRequest,
    requestId?: string
  ): Promise<DeploymentResult> {
    const api = await ApiService.verifyOwnership(apiId, developerId);
    const currentState = api.workflow_state as ApiWorkflowState | null;
    const logCtx = createLogContext(apiId, developerId, "POST /deploy", requestId);

    // Case 1: Deployment already in progress - return existing deployment (idempotent)
    if (currentState && DEPLOYMENT_IN_PROGRESS_STATES.includes(currentState)) {
      const existingDeployment = await DeploymentRepository.findActiveByApiId(apiId);
      if (existingDeployment) {
        logDeploymentEvent({ ...logCtx, deploymentId: existingDeployment.id }, "DEPLOYMENT_DUPLICATE");
        logIdempotentNoOp(logCtx, currentState, "startDeployment");
        return {
          deployment: existingDeployment,
          changed: false,
          message: `Deployment already in progress (${currentState})`,
          isExisting: true,
        };
      }
      // No active deployment found but state says deploying - inconsistent state
      // Fall through to create new deployment
    }

    // Case 2: Already deployed - allow redeploy but mark as explicit redeploy
    const isRedeploy = currentState && DEPLOYMENT_COMPLETE_STATES.includes(currentState);

    // Case 3: Check if state allows deployment
    const allowedStates = [...START_DEPLOYMENT_ALLOWED_FROM];
    if (!currentState || !allowedStates.includes(currentState)) {
      logTransitionRejected(
        logCtx,
        currentState,
        ApiWorkflowState.DEPLOYING,
        `Cannot deploy from state ${currentState}`
      );
      throw BadRequestError(
        `Cannot deploy: API must be in one of [${allowedStates.join(", ")}] state. ` +
        `Current state: ${currentState ?? "null"}`
      );
    }

    // Check for existing active deployment (duplicate protection)
    const activeDeployment = await DeploymentRepository.findActiveByApiId(apiId);
    if (activeDeployment) {
      logDeploymentEvent({ ...logCtx, deploymentId: activeDeployment.id }, "DEPLOYMENT_DUPLICATE");
      return {
        deployment: activeDeployment,
        changed: false,
        message: "Active deployment already exists",
        isExisting: true,
      };
    }

    // Get generated source files
    const sourceFiles = await this.getSourceFilesForApi(apiId);
    if (sourceFiles.length === 0) {
      throw BadRequestError(
        "No generated source code found. Generate code before deploying.",
      );
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
      throw BadRequestError(
        `Deployment validation failed: ${validation.errors.join(", ")}`,
      );
    }

    // Create deployment record
    const deployment = await DeploymentRepository.create(apiId, {
      environment: data.environment,
      status: "PENDING",
      provider: data.provider,
      generation_session_id: data.generation_session_id,
    });

    // Update API workflow state to DEPLOYING atomically
    const { changed } = await ApiRepository.atomicStateTransition(
      apiId,
      allowedStates as workflow_state[],
      "DEPLOYING"
    );

    if (changed) {
      logStateTransition(logCtx, currentState, ApiWorkflowState.DEPLOYING);
    }

    logDeploymentEvent(
      { ...logCtx, deploymentId: deployment.id },
      "DEPLOYMENT_STARTED",
      { provider: data.provider, environment: data.environment, isRedeploy }
    );

    // Start deployment asynchronously
    this.executeDeployment(
      deployment.id,
      apiId,
      provider,
      prereqs,
      data.options,
    ).catch((err) => {
      console.error(
        `[DeploymentService] Async deployment failed for ${deployment.id}:`,
        err,
      );
    });

    return {
      deployment,
      changed: true,
      message: isRedeploy ? "Redeployment started" : "Deployment started",
      isExisting: false,
    };
  }

  /**
   * Execute deployment asynchronously
   */
  private static async executeDeployment(
    deploymentId: string,
    apiId: string,
    provider: ReturnType<typeof getDeploymentProvider>,
    prereqs: DeploymentPrerequisites,
    options?: Record<string, unknown>,
  ) {
    const logCtx = createLogContext(apiId, undefined, "executeDeployment");
    logCtx.deploymentId = deploymentId;

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

        // Update API workflow state atomically
        await ApiRepository.atomicStateTransition(
          apiId,
          ["DEPLOYING"] as workflow_state[],
          "DEPLOYED"
        );

        logStateTransition(logCtx, ApiWorkflowState.DEPLOYING, ApiWorkflowState.DEPLOYED);
        logDeploymentEvent(logCtx, "DEPLOYMENT_SUCCEEDED", {
          deployUrl: result.deployUrl,
          providerDeploymentId: result.providerDeploymentId,
        });
      } else {
        // Update deployment record with failure
        await DeploymentRepository.setDeploymentResult(deploymentId, {
          status: "FAILED",
          error_message: result.errorMessage,
          metadata_json: result.metadata,
        });

        // Update API workflow state to FAILED
        await ApiRepository.atomicStateTransition(
          apiId,
          ["DEPLOYING"] as workflow_state[],
          "FAILED"
        );

        logStateTransition(logCtx, ApiWorkflowState.DEPLOYING, ApiWorkflowState.FAILED);
        logDeploymentEvent(logCtx, "DEPLOYMENT_FAILED", {
          errorMessage: result.errorMessage,
        });
      }
    } catch (err: any) {
      console.error(
        `[DeploymentService] Deployment error for ${deploymentId}:`,
        err,
      );

      // Update deployment record with error
      await DeploymentRepository.setDeploymentResult(deploymentId, {
        status: "FAILED",
        error_message: err.message || "Unknown deployment error",
      });

      // Update API workflow state
      await ApiRepository.atomicStateTransition(
        apiId,
        ["DEPLOYING"] as workflow_state[],
        "FAILED"
      );

      logDeploymentEvent(logCtx, "DEPLOYMENT_FAILED", {
        errorMessage: err.message,
        stack: err.stack,
      });
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
      const providerDeploymentId = metadata.providerDeploymentId as
        | string
        | undefined;

      if (providerDeploymentId) {
        try {
          const provider = getDeploymentProvider(deployment.provider);
          const status =
            await provider.getDeploymentStatus(providerDeploymentId);

          // Update local record if status changed
          if (status.status !== deployment.status) {
            await DeploymentRepository.updateStatus(
              deploymentId,
              status.status as deployment_status,
              {
                deploy_url: status.deployUrl,
                metadata_json: { ...metadata, ...status.metadata },
                finished_at:
                  status.status === "DEPLOYED" || status.status === "FAILED"
                    ? new Date()
                    : null,
              },
            );
          }

          return {
            ...deployment,
            status: status.status,
            deploy_url: status.deployUrl || deployment.deploy_url,
            providerStatus: status,
          };
        } catch (err) {
          console.error(
            `[DeploymentService] Error checking provider status:`,
            err,
          );
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
      throw BadRequestError(
        `Cannot retry: deployment is ${deployment.status}, not FAILED`,
      );
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
  private static async getSourceFilesForApi(
    apiId: string,
  ): Promise<SourceFile[]> {
    // Get all generated codes for this API
    const codes = await GeneratedCodeRepository.listByApi(apiId, 1, 1000);

    return codes.map((code) => ({
      path: code.file_path,
      content: code.content,
    }));
  }
}
