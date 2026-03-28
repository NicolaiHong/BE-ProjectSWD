/**
 * Stale Deployment Cleanup Tests
 *
 * Verifies that findActiveByApiId filters out deployments
 * older than the stale threshold (30 min).
 */

import { DeploymentRepository } from "../repositories/deployment.repository";

// We test the repository method directly by checking the query parameters
// Since this is a Prisma-based repository, we mock Prisma.

jest.mock("../clients/prisma", () => ({
  prisma: {
    deployments: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "../clients/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFindFirst = (mockPrisma.deployments as any).findFirst as jest.Mock;

describe("DeploymentRepository.findActiveByApiId", () => {
  const apiId = "api-123";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should filter out deployments older than 30 minutes", async () => {
    // Set current time
    const now = new Date("2026-03-28T00:00:00Z");
    jest.setSystemTime(now);

    mockFindFirst.mockResolvedValue(null);

    await DeploymentRepository.findActiveByApiId(apiId);

    // Verify the query includes created_at filter
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        api_id: apiId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        created_at: {
          gte: new Date(now.getTime() - 30 * 60 * 1000),
        },
      },
      orderBy: { created_at: "desc" },
    });
  });

  it("should return recent active deployment", async () => {
    const recentDeployment = {
      id: "dep-1",
      api_id: apiId,
      status: "IN_PROGRESS",
      created_at: new Date(),
    };

    mockFindFirst.mockResolvedValue(recentDeployment);

    const result = await DeploymentRepository.findActiveByApiId(apiId);
    expect(result).toEqual(recentDeployment);
  });

  it("should return null when no active deployments exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await DeploymentRepository.findActiveByApiId(apiId);
    expect(result).toBeNull();
  });
});
