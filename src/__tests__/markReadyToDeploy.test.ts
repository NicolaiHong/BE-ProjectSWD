import { ApiService } from "../services/api.service";

// Mock the repositories
jest.mock("../repositories/api.repository", () => ({
  ApiRepository: {
    findById: jest.fn(),
    updateWorkflowState: jest.fn(),
    atomicStateTransition: jest.fn(),
  },
}));

import { ApiRepository } from "../repositories/api.repository";
import { ApiWorkflowState } from "../constants/workflowStates";

const mockApiRepository = ApiRepository as jest.Mocked<typeof ApiRepository>;

describe("ApiService.markReadyToDeploy", () => {
  const developerId = "test-developer-id";
  const apiId = "test-api-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should transition from CODE_GENERATED to READY_TO_DEPLOY", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "CODE_GENERATED",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);
    mockApiRepository.atomicStateTransition.mockResolvedValue({
      changed: true,
      api: { ...mockApi, workflow_state: "READY_TO_DEPLOY" },
    });

    const result = await ApiService.markReadyToDeploy(apiId, developerId);

    expect(mockApiRepository.atomicStateTransition).toHaveBeenCalledWith(
      apiId,
      ["CODE_GENERATED"],
      "READY_TO_DEPLOY",
    );
    expect(result.changed).toBe(true);
    expect(result.currentState).toBe(ApiWorkflowState.READY_TO_DEPLOY);
    expect(result.data?.workflow_state).toBe("READY_TO_DEPLOY");
  });

  it("should be idempotent when already READY_TO_DEPLOY", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "READY_TO_DEPLOY",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    const result = await ApiService.markReadyToDeploy(apiId, developerId);

    // Should NOT call atomicStateTransition since already in correct state
    expect(mockApiRepository.atomicStateTransition).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
    expect(result.currentState).toBe(ApiWorkflowState.READY_TO_DEPLOY);
    expect(result.message).toContain("already");
  });

  it("should be idempotent when DEPLOYING (the bug fix)", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "DEPLOYING",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    const result = await ApiService.markReadyToDeploy(apiId, developerId);

    expect(result.changed).toBe(false);
    expect(result.currentState).toBe(ApiWorkflowState.DEPLOYING);
    expect(result.message).toContain("in progress");
  });

  it("should be idempotent when DEPLOYED", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "DEPLOYED",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    const result = await ApiService.markReadyToDeploy(apiId, developerId);

    expect(result.changed).toBe(false);
    expect(result.currentState).toBe(ApiWorkflowState.DEPLOYED);
    expect(result.message).toContain("deployed");
  });

  it("should throw error when state is not CODE_GENERATED or an idempotent state", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "CONFIGURED",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    await expect(
      ApiService.markReadyToDeploy(apiId, developerId),
    ).rejects.toThrow(/Cannot mark as ready/);
  });

  it("should throw error when state is UI_GENERATED", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: "UI_GENERATED",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    await expect(
      ApiService.markReadyToDeploy(apiId, developerId),
    ).rejects.toThrow(/Cannot mark as ready/);
  });

  it("should throw error when state is null", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: developerId,
      name: "Test API",
      workflow_state: null,
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    await expect(
      ApiService.markReadyToDeploy(apiId, developerId),
    ).rejects.toThrow(/Cannot mark as ready/);
  });

  it("should throw 403 when developer does not own API", async () => {
    const mockApi = {
      id: apiId,
      owner_developer_id: "different-developer",
      name: "Test API",
      workflow_state: "CODE_GENERATED",
    };

    mockApiRepository.findById.mockResolvedValue(mockApi as any);

    await expect(
      ApiService.markReadyToDeploy(apiId, developerId),
    ).rejects.toThrow(/Access denied/);
  });

  it("should throw 404 when API not found", async () => {
    mockApiRepository.findById.mockResolvedValue(null);

    await expect(
      ApiService.markReadyToDeploy(apiId, developerId),
    ).rejects.toThrow(/API not found/);
  });
});
