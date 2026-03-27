import { ApiRepository } from "../repositories/api.repository";
import { SessionRepository } from "../repositories/session.repository";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../middlewares/errorHandler";
import type { CreateApiRequest, UpdateApiRequest } from "../dtos/ApiDtos";
import type {
  workflow_state,
  generation_mode,
} from "../generated/prisma/enums";
import {
  ApiWorkflowState,
  READY_TO_DEPLOY_IDEMPOTENT_STATES,
  READY_TO_DEPLOY_ALLOWED_FROM,
  getStateDescription,
  type IdempotentResult,
} from "../constants/workflowStates";
import {
  logStateTransition,
  logIdempotentNoOp,
  logTransitionRejected,
  createLogContext,
} from "../utils/workflowLogger";

export class ApiService {
  static async verifyOwnership(apiId: string, developerId: string) {
    const api = await ApiRepository.findById(apiId);
    if (!api) throw NotFoundError("API not found");
    if (api.owner_developer_id !== developerId)
      throw ForbiddenError("Access denied");
    return api;
  }

  static async list(developerId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      ApiRepository.list(developerId, page, limit),
      ApiRepository.count(developerId),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(apiId: string, developerId: string) {
    return this.verifyOwnership(apiId, developerId);
  }

  static async create(developerId: string, data: CreateApiRequest) {
    return ApiRepository.create(developerId, data);
  }

  static async update(
    apiId: string,
    developerId: string,
    data: UpdateApiRequest,
  ) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.update(apiId, data);
  }

  static async delete(apiId: string, developerId: string) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.delete(apiId);
  }

  static async updateWorkflowState(
    apiId: string,
    developerId: string,
    state: workflow_state,
  ) {
    await this.verifyOwnership(apiId, developerId);
    return ApiRepository.updateWorkflowState(apiId, state);
  }

  /**
   * Mark an API as ready to deploy.
   *
   * Idempotent behavior:
   * - If already READY_TO_DEPLOY: return success, no change
   * - If DEPLOY_QUEUED, DEPLOYING, or DEPLOYED: return success, no change
   * - If CODE_GENERATED: transition to READY_TO_DEPLOY
   * - Otherwise: return 400 error
   *
   * @param apiId - API ID
   * @param developerId - Developer ID for ownership check
   * @param requestId - Optional correlation ID for logging
   * @returns IdempotentResult with the API data
   */
  static async markReadyToDeploy(
    apiId: string,
    developerId: string,
    requestId?: string
  ): Promise<IdempotentResult<Awaited<ReturnType<typeof ApiRepository.findById>>>> {
    const api = await this.verifyOwnership(apiId, developerId);
    const currentState = api.workflow_state as ApiWorkflowState | null;
    const logCtx = createLogContext(apiId, developerId, "POST /ready-to-deploy", requestId);

    // Case 1: Already in a "ready or beyond" state - idempotent no-op
    if (currentState && READY_TO_DEPLOY_IDEMPOTENT_STATES.includes(currentState as ApiWorkflowState)) {
      logIdempotentNoOp(logCtx, currentState as ApiWorkflowState, "markReadyToDeploy");
      return {
        changed: false,
        data: api,
        message: getIdempotentMessage(currentState as ApiWorkflowState),
        currentState: currentState as ApiWorkflowState,
      };
    }

    // Case 2: Valid transition from CODE_GENERATED
    if (currentState && READY_TO_DEPLOY_ALLOWED_FROM.includes(currentState as ApiWorkflowState)) {
      // Use atomic update to prevent race conditions
      const { changed, api: updatedApi } = await ApiRepository.atomicStateTransition(
        apiId,
        READY_TO_DEPLOY_ALLOWED_FROM as workflow_state[],
        "READY_TO_DEPLOY"
      );

      if (changed && updatedApi) {
        logStateTransition(logCtx, currentState as ApiWorkflowState, ApiWorkflowState.READY_TO_DEPLOY);
        return {
          changed: true,
          data: updatedApi,
          message: "API marked as ready to deploy",
          previousState: currentState as ApiWorkflowState,
          currentState: ApiWorkflowState.READY_TO_DEPLOY,
        };
      }

      // Race condition: state changed between check and update
      // Re-fetch and return current state (likely became DEPLOYING)
      const refreshedApi = await ApiRepository.findById(apiId);
      const newState = refreshedApi?.workflow_state as ApiWorkflowState;

      // If it's now in an idempotent state, treat as success
      if (newState && READY_TO_DEPLOY_IDEMPOTENT_STATES.includes(newState)) {
        logIdempotentNoOp(logCtx, newState, "markReadyToDeploy (after race)");
        return {
          changed: false,
          data: refreshedApi,
          message: getIdempotentMessage(newState),
          currentState: newState,
        };
      }

      // Otherwise, unexpected state
      logTransitionRejected(
        logCtx,
        currentState as ApiWorkflowState,
        ApiWorkflowState.READY_TO_DEPLOY,
        `State changed during operation to ${newState}`
      );
      throw BadRequestError(
        `State changed during operation. Current state: "${newState}". Please retry.`
      );
    }

    // Case 3: Invalid state for this transition
    logTransitionRejected(
      logCtx,
      currentState as ApiWorkflowState,
      ApiWorkflowState.READY_TO_DEPLOY,
      `Cannot transition from ${currentState}`
    );

    throw BadRequestError(
      `Cannot mark as ready: current state is "${currentState ?? "null"}". ` +
      `Allowed from: ${READY_TO_DEPLOY_ALLOWED_FROM.join(", ")}. ` +
      `Current state description: ${getStateDescription(currentState as ApiWorkflowState)}.`
    );
  }

  static async listSessions(
    apiId: string,
    developerId: string,
    mode?: generation_mode,
  ) {
    await this.verifyOwnership(apiId, developerId);
    return SessionRepository.listByApi(apiId, mode);
  }
}

/**
 * Generate idempotent success message based on current state
 */
function getIdempotentMessage(state: ApiWorkflowState): string {
  switch (state) {
    case ApiWorkflowState.READY_TO_DEPLOY:
      return "API is already marked as ready to deploy";
    case ApiWorkflowState.DEPLOY_QUEUED:
      return "Deployment is already queued";
    case ApiWorkflowState.DEPLOYING:
      return "Deployment is already in progress";
    case ApiWorkflowState.DEPLOYED:
      return "API is already deployed";
    default:
      return `API is in state: ${state}`;
  }
}
