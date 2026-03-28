/**
 * DeploymentService.update() Tests
 *
 * Verifies that status updates use atomic state transitions
 * instead of raw updateWorkflowState.
 */

import { DeploymentService } from "../services/deployment.service";
import { ApiRepository } from "../repositories/api.repository";
import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiService } from "../services/api.service";

jest.mock("../repositories/api.repository");
jest.mock("../repositories/deployment.repository");
jest.mock("../services/api.service");

const mockApiRepository = ApiRepository as jest.Mocked<typeof ApiRepository>;
const mockDeploymentRepository = DeploymentRepository as jest.Mocked<
  typeof DeploymentRepository
>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

describe("DeploymentService.update", () => {
  const deploymentId = "dep-123";
  const developerId = "dev-456";
  const apiId = "api-789";

  const mockDeployment = {
    id: deploymentId,
    api_id: apiId,
    status: "IN_PROGRESS",
    provider: "VERCEL",
    environment: "PRODUCTION",
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeploymentRepository.findById.mockResolvedValue(mockDeployment as any);
    mockApiService.verifyOwnership.mockResolvedValue(undefined as any);
    mockDeploymentRepository.update.mockResolvedValue({
      ...mockDeployment,
      status: "DEPLOYED",
    } as any);
  });

  describe("atomic state transitions on status change", () => {
    it("should use atomicStateTransition when status changes to DEPLOYED", async () => {
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { id: apiId, workflow_state: "DEPLOYED" },
      } as any);

      await DeploymentService.update(deploymentId, developerId, {
        status: "DEPLOYED",
      });

      expect(mockApiRepository.atomicStateTransition).toHaveBeenCalledWith(
        apiId,
        ["DEPLOYING", "DEPLOY_QUEUED"],
        "DEPLOYED",
      );
      // Should NOT call raw updateWorkflowState
      expect(mockApiRepository.updateWorkflowState).not.toHaveBeenCalled();
    });

    it("should use atomicStateTransition when status changes to FAILED", async () => {
      mockDeploymentRepository.update.mockResolvedValue({
        ...mockDeployment,
        status: "FAILED",
      } as any);
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { id: apiId, workflow_state: "FAILED" },
      } as any);

      await DeploymentService.update(deploymentId, developerId, {
        status: "FAILED",
      });

      expect(mockApiRepository.atomicStateTransition).toHaveBeenCalledWith(
        apiId,
        ["DEPLOYING", "DEPLOY_QUEUED"],
        "FAILED",
      );
      expect(mockApiRepository.updateWorkflowState).not.toHaveBeenCalled();
    });

    it("should NOT call any state transition when status is not DEPLOYED or FAILED", async () => {
      mockDeploymentRepository.update.mockResolvedValue({
        ...mockDeployment,
        status: "IN_PROGRESS",
      } as any);

      await DeploymentService.update(deploymentId, developerId, {
        status: "IN_PROGRESS",
      });

      expect(mockApiRepository.atomicStateTransition).not.toHaveBeenCalled();
      expect(mockApiRepository.updateWorkflowState).not.toHaveBeenCalled();
    });

    it("should swallow atomicStateTransition errors gracefully", async () => {
      mockApiRepository.atomicStateTransition.mockRejectedValue(
        new Error("Transition rejected: invalid current state"),
      );

      // Should not throw
      const result = await DeploymentService.update(
        deploymentId,
        developerId,
        { status: "DEPLOYED" },
      );

      expect(result).toBeDefined();
      expect(mockApiRepository.atomicStateTransition).toHaveBeenCalled();
    });
  });
});
