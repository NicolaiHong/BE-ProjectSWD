import type { deployment_provider } from "../../generated/prisma/enums";

export interface SourceFile {
  path: string;
  content: string;
}

export interface DeploymentPrerequisites {
  apiId: string;
  projectName: string;
  sourceFiles: SourceFile[];
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DeploymentResult {
  success: boolean;
  deployUrl?: string;
  errorMessage?: string;
  providerDeploymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentStatusResult {
  status: "PENDING" | "IN_PROGRESS" | "DEPLOYED" | "FAILED";
  deployUrl?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface IDeploymentProvider {
  readonly name: string;
  readonly providerType: deployment_provider;

  /**
   * Validate that all prerequisites are met for deployment
   */
  validatePrerequisites(prereqs: DeploymentPrerequisites): Promise<ValidationResult>;

  /**
   * Create and start a deployment
   */
  createDeployment(
    prereqs: DeploymentPrerequisites,
    options?: Record<string, unknown>
  ): Promise<DeploymentResult>;

  /**
   * Check the status of an existing deployment
   */
  getDeploymentStatus(providerDeploymentId: string): Promise<DeploymentStatusResult>;
}
