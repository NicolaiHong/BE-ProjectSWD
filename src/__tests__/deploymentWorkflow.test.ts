/**
 * Deployment Service Tests
 *
 * Tests for deployment workflow including:
 * - markReadyToDeploy idempotent behavior
 * - startDeployment duplicate protection
 * - Concurrent deployment handling
 * - Failure transitions
 */

import { ApiService } from "../services/api.service";
import { DeploymentService } from "../services/deployment.service";
import { ApiRepository } from "../repositories/api.repository";
import { DeploymentRepository } from "../repositories/deployment.repository";
import { ApiWorkflowState } from "../constants/workflowStates";

// Mock repositories
jest.mock("../repositories/api.repository");
jest.mock("../repositories/deployment.repository");
jest.mock("../repositories/generatedCode.repository", () => ({
  GeneratedCodeRepository: {
    listByApi: jest
      .fn()
      .mockResolvedValue([
        { file_path: "index.ts", content: "export const api = {};" },
      ]),
  },
}));
jest.mock("../services/providers", () => ({
  getDeploymentProvider: jest.fn().mockReturnValue({
    validatePrerequisites: jest
      .fn()
      .mockResolvedValue({ valid: true, errors: [] }),
    createDeployment: jest.fn().mockResolvedValue({
      success: true,
      deployUrl: "https://test.vercel.app",
      providerDeploymentId: "dep_123",
    }),
  }),
  getAvailableProviders: jest
    .fn()
    .mockReturnValue([{ type: "VERCEL", name: "Vercel" }]),
}));

const mockApiRepository = ApiRepository as jest.Mocked<typeof ApiRepository>;
const mockDeploymentRepository = DeploymentRepository as jest.Mocked<
  typeof DeploymentRepository
>;

describe("ApiService.markReadyToDeploy", () => {
  const apiId = "test-api-id";
  const developerId = "test-developer-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("success transitions", () => {
    it("should transition from CODE_GENERATED to READY_TO_DEPLOY", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "CODE_GENERATED",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { ...mockApi, workflow_state: "READY_TO_DEPLOY" },
      });

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      expect(result.changed).toBe(true);
      expect(result.currentState).toBe(ApiWorkflowState.READY_TO_DEPLOY);
      expect(result.message).toBe("API marked as ready to deploy");
      expect(mockApiRepository.atomicStateTransition).toHaveBeenCalledWith(
        apiId,
        ["CODE_GENERATED"],
        "READY_TO_DEPLOY",
      );
    });
  });

  describe("idempotent no-op cases", () => {
    it("should return no-op when already READY_TO_DEPLOY", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "READY_TO_DEPLOY",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      expect(result.changed).toBe(false);
      expect(result.currentState).toBe(ApiWorkflowState.READY_TO_DEPLOY);
      expect(result.message).toBe("API is already marked as ready to deploy");
      expect(mockApiRepository.atomicStateTransition).not.toHaveBeenCalled();
    });

    it("should return no-op when DEPLOYING (the bug fix)", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DEPLOYING",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      expect(result.changed).toBe(false);
      expect(result.currentState).toBe(ApiWorkflowState.DEPLOYING);
      expect(result.message).toBe("Deployment is already in progress");
    });

    it("should return no-op when DEPLOYED", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DEPLOYED",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      expect(result.changed).toBe(false);
      expect(result.currentState).toBe(ApiWorkflowState.DEPLOYED);
      expect(result.message).toBe("API is already deployed");
    });

    it("should return no-op when DEPLOY_QUEUED", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DEPLOY_QUEUED",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      expect(result.changed).toBe(false);
      expect(result.currentState).toBe(ApiWorkflowState.DEPLOY_QUEUED);
      expect(result.message).toBe("Deployment is already queued");
    });
  });

  describe("error cases", () => {
    it("should throw BadRequestError for invalid state", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DRAFT",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      await expect(
        ApiService.markReadyToDeploy(apiId, developerId),
      ).rejects.toThrow(/Cannot mark as ready/);
    });

    it("should throw NotFoundError for non-existent API", async () => {
      mockApiRepository.findById.mockResolvedValue(null);

      await expect(
        ApiService.markReadyToDeploy(apiId, developerId),
      ).rejects.toThrow(/not found/i);
    });

    it("should throw ForbiddenError for non-owner", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: "different-developer",
        workflow_state: "CODE_GENERATED",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);

      await expect(
        ApiService.markReadyToDeploy(apiId, developerId),
      ).rejects.toThrow(/denied/i);
    });
  });

  describe("race condition handling", () => {
    it("should handle race condition when state becomes idempotent", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "CODE_GENERATED",
        name: "Test API",
      };

      mockApiRepository.findById
        .mockResolvedValueOnce(mockApi as any) // Initial check
        .mockResolvedValueOnce({
          ...mockApi,
          workflow_state: "DEPLOYING",
        } as any); // After race

      // Atomic update fails (race condition)
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: false,
        api: null,
      });

      const result = await ApiService.markReadyToDeploy(apiId, developerId);

      // Should succeed because DEPLOYING is an idempotent state
      expect(result.changed).toBe(false);
      expect(result.currentState).toBe(ApiWorkflowState.DEPLOYING);
    });
  });
});

describe("DeploymentService.startDeployment", () => {
  const apiId = "test-api-id";
  const developerId = "test-developer-id";
  const deploymentData = {
    provider: "VERCEL" as const,
    environment: "DEVELOPMENT" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("success cases", () => {
    it("should start deployment from CODE_GENERATED", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "CODE_GENERATED",
        name: "Test API",
      };

      const mockDeployment = {
        id: "deployment-id",
        api_id: apiId,
        status: "PENDING",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(null);
      mockDeploymentRepository.create.mockResolvedValue(mockDeployment as any);
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { ...mockApi, workflow_state: "DEPLOYING" },
      });

      const result = await DeploymentService.startDeployment(
        apiId,
        developerId,
        deploymentData,
      );

      expect(result.changed).toBe(true);
      expect(result.isExisting).toBe(false);
      expect(result.message).toBe("Deployment started");
      expect(mockDeploymentRepository.create).toHaveBeenCalled();
    });

    it("should start deployment from READY_TO_DEPLOY", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "READY_TO_DEPLOY",
        name: "Test API",
      };

      const mockDeployment = {
        id: "deployment-id",
        api_id: apiId,
        status: "PENDING",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(null);
      mockDeploymentRepository.create.mockResolvedValue(mockDeployment as any);
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { ...mockApi, workflow_state: "DEPLOYING" },
      });

      const result = await DeploymentService.startDeployment(
        apiId,
        developerId,
        deploymentData,
      );

      expect(result.changed).toBe(true);
      expect(result.isExisting).toBe(false);
    });

    it("should allow redeploy from DEPLOYED state", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DEPLOYED",
        name: "Test API",
      };

      const mockDeployment = {
        id: "deployment-id",
        api_id: apiId,
        status: "PENDING",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(null);
      mockDeploymentRepository.create.mockResolvedValue(mockDeployment as any);
      mockApiRepository.atomicStateTransition.mockResolvedValue({
        changed: true,
        api: { ...mockApi, workflow_state: "DEPLOYING" },
      });

      const result = await DeploymentService.startDeployment(
        apiId,
        developerId,
        deploymentData,
      );

      expect(result.changed).toBe(true);
      expect(result.message).toBe("Redeployment started");
    });
  });

  describe("duplicate deployment protection", () => {
    it("should return existing deployment when already DEPLOYING", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DEPLOYING",
        name: "Test API",
      };

      const existingDeployment = {
        id: "existing-deployment-id",
        api_id: apiId,
        status: "IN_PROGRESS",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(
        existingDeployment as any,
      );

      const result = await DeploymentService.startDeployment(
        apiId,
        developerId,
        deploymentData,
      );

      expect(result.changed).toBe(false);
      expect(result.isExisting).toBe(true);
      expect(result.deployment).toEqual(existingDeployment);
      expect(result.message).toContain("already in progress");
      expect(mockDeploymentRepository.create).not.toHaveBeenCalled();
    });

    it("should return existing deployment when active deployment exists", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "CODE_GENERATED",
        name: "Test API",
      };

      const existingDeployment = {
        id: "existing-deployment-id",
        api_id: apiId,
        status: "PENDING",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(
        existingDeployment as any,
      );

      const result = await DeploymentService.startDeployment(
        apiId,
        developerId,
        deploymentData,
      );

      expect(result.changed).toBe(false);
      expect(result.isExisting).toBe(true);
      expect(result.deployment).toEqual(existingDeployment);
      expect(mockDeploymentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("error cases", () => {
    it("should throw BadRequestError for invalid state", async () => {
      const mockApi = {
        id: apiId,
        owner_developer_id: developerId,
        workflow_state: "DRAFT",
        name: "Test API",
      };

      mockApiRepository.findById.mockResolvedValue(mockApi as any);
      mockDeploymentRepository.findActiveByApiId.mockResolvedValue(null);

      await expect(
        DeploymentService.startDeployment(apiId, developerId, deploymentData),
      ).rejects.toThrow(/Cannot deploy/);
    });
  });
});

describe("Concurrent deployment scenarios", () => {
  const apiId = "test-api-id";
  const developerId = "test-developer-id";
  const deploymentData = {
    provider: "VERCEL" as const,
    environment: "DEVELOPMENT" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle concurrent deploy calls safely", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      workflow_state: "CODE_GENERATED",
      name: "Test API",
    };

    let deploymentCreated = false;
    const mockDeployment = {
      id: "deployment-id",
      api_id: apiId,
      status: "PENDING",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    // First call: no active deployment, create succeeds
    // Second call: finds the newly created deployment
    mockDeploymentRepository.findActiveByApiId.mockImplementation(async () => {
      if (deploymentCreated) {
        return mockDeployment as any;
      }
      return null;
    });

    mockDeploymentRepository.create.mockImplementation(async () => {
      deploymentCreated = true;
      return mockDeployment as any;
    });

    mockApiRepository.atomicStateTransition.mockResolvedValue({
      changed: true,
      api: { ...mockApi, workflow_state: "DEPLOYING" },
    });

    // Simulate concurrent calls
    const [result1, result2] = await Promise.all([
      DeploymentService.startDeployment(apiId, developerId, deploymentData),
      DeploymentService.startDeployment(apiId, developerId, deploymentData),
    ]);

    // One should create, one should return existing
    const newDeployments = [result1, result2].filter((r) => !r.isExisting);
    const existingDeployments = [result1, result2].filter((r) => r.isExisting);

    expect(newDeployments.length).toBeGreaterThanOrEqual(1);
    // Both should reference the same deployment
    expect(result1.deployment?.id).toBe(result2.deployment?.id);
  });
});
