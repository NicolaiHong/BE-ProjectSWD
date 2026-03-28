import { prisma } from "../clients/prisma";
import type { CreateApiRequest, UpdateApiRequest } from "../dtos/ApiDtos";
import type { api_status, workflow_state } from "../generated/prisma/enums";
import { toPrismaState, ApiWorkflowState } from "../constants/workflowStates";

export class ApiRepository {
  static list(developerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.apis.findMany({
      where: { owner_developer_id: developerId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            api_configs: true,
            ui_schemas: true,
            generated_codes: true,
            deployments: true,
          },
        },
      },
    });
  }

  static count(developerId: string) {
    return prisma.apis.count({
      where: { owner_developer_id: developerId },
    });
  }

  static findById(id: string) {
    return prisma.apis.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            api_configs: true,
            ui_schemas: true,
            generated_codes: true,
            deployments: true,
          },
        },
      },
    });
  }

  static create(developerId: string, data: CreateApiRequest) {
    return prisma.apis.create({
      data: {
        owner_developer_id: developerId,
        name: data.name,
        description: data.description ?? null,
        base_url: data.base_url ?? null,
        version: data.version ?? "1.0.0",
        project_id: data.project_id ?? null,
        status: (data.status as api_status) ?? "ACTIVE",
      },
    });
  }

  static update(id: string, data: UpdateApiRequest) {
    return prisma.apis.update({
      where: { id },
      data: {
        ...data,
        status: data.status as api_status | undefined,
        workflow_state: data.workflow_state as workflow_state | undefined,
        updated_at: new Date(),
      },
    });
  }

  static updateWorkflowState(id: string, state: workflow_state) {
    return prisma.apis.update({
      where: { id },
      data: {
        workflow_state: state,
        updated_at: new Date(),
      },
    });
  }

  static delete(id: string) {
    return prisma.apis.delete({ where: { id } });
  }

  /**
   * Atomically update workflow state only if current state matches expected.
   * Returns the updated record if successful, null if state didn't match (race condition).
   *
   * Uses WHERE clause with current state to prevent race conditions.
   *
   * @param id - API ID
   * @param expectedState - The state we expect the API to be in
   * @param newState - The state to transition to
   * @returns Updated API record or null if state didn't match
   */
  static async updateWorkflowStateIfCurrent(
    id: string,
    expectedState: workflow_state | workflow_state[],
    newState: workflow_state
  ) {
    const expectedStates = Array.isArray(expectedState) ? expectedState : [expectedState];

    // Use raw query for atomic update with state check
    const result = await prisma.$executeRaw`
      UPDATE apis 
      SET workflow_state = ${newState}::workflow_state,
          updated_at = NOW()
      WHERE id = ${id}::uuid
        AND workflow_state IN (${prisma.$queryRaw`${expectedStates.map(s => `'${s}'::workflow_state`).join(',')}`})
    `;

    // If no rows updated, the state didn't match
    if (result === 0) {
      return null;
    }

    // Fetch and return the updated record
    return prisma.apis.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            api_configs: true,
            ui_schemas: true,
            generated_codes: true,
            deployments: true,
          },
        },
      },
    });
  }

  /**
   * Alternative atomic update using Prisma's updateMany with where clause.
   * More portable than raw SQL.
   *
   * @param id - API ID
   * @param expectedStates - States that allow this transition
   * @param newState - The state to transition to
   * @returns { changed: boolean, api: Api | null }
   */
  static async atomicStateTransition(
    id: string,
    expectedStates: workflow_state[],
    newState: workflow_state
  ): Promise<{ changed: boolean; api: Awaited<ReturnType<typeof ApiRepository.findById>> }> {
    // updateMany returns count, not the record
    const updateResult = await prisma.apis.updateMany({
      where: {
        id,
        workflow_state: { in: expectedStates },
      },
      data: {
        workflow_state: newState,
        updated_at: new Date(),
      },
    });

    const api = await ApiRepository.findById(id);

    return {
      changed: updateResult.count > 0,
      api,
    };
  }

  /**
   * Get current workflow state for an API
   */
  static async getWorkflowState(id: string): Promise<workflow_state | null> {
    const api = await prisma.apis.findUnique({
      where: { id },
      select: { workflow_state: true },
    });
    return api?.workflow_state ?? null;
  }
}
