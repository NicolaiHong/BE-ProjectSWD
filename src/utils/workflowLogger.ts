/**
 * Workflow State Transition Logger
 *
 * Provides structured logging for state machine transitions with
 * correlation IDs, actor tracking, and deployment context.
 */

import {
  ApiWorkflowState,
  getStateDescription,
} from "../constants/workflowStates";

export interface WorkflowLogContext {
  /** Unique request/correlation ID */
  requestId?: string;
  /** API ID being modified */
  apiId: string;
  /** Developer ID performing the action */
  developerId?: string;
  /** Deployment ID if applicable */
  deploymentId?: string;
  /** HTTP endpoint that triggered this */
  endpoint?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface StateTransitionLog extends WorkflowLogContext {
  /** Timestamp of the transition */
  timestamp: string;
  /** Event type */
  event: "STATE_TRANSITION" | "STATE_TRANSITION_REJECTED" | "IDEMPOTENT_NOOP";
  /** Previous state */
  fromState: ApiWorkflowState | null;
  /** Target state */
  toState: ApiWorkflowState;
  /** Whether transition was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Human-readable summary */
  message: string;
}

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log a successful state transition
 */
export function logStateTransition(
  ctx: WorkflowLogContext,
  fromState: ApiWorkflowState | null,
  toState: ApiWorkflowState,
): void {
  const log: StateTransitionLog = {
    ...ctx,
    timestamp: new Date().toISOString(),
    event: "STATE_TRANSITION",
    fromState,
    toState,
    success: true,
    message: `API ${ctx.apiId} transitioned from ${fromState ?? "null"} to ${toState}`,
  };

  console.log(
    `[WorkflowState] ${log.message}`,
    JSON.stringify({
      apiId: ctx.apiId,
      from: fromState,
      to: toState,
      actor: ctx.developerId,
      endpoint: ctx.endpoint,
      requestId: ctx.requestId,
      deploymentId: ctx.deploymentId,
    }),
  );
}

/**
 * Log a rejected state transition
 */
export function logTransitionRejected(
  ctx: WorkflowLogContext,
  fromState: ApiWorkflowState | null,
  toState: ApiWorkflowState,
  reason: string,
): void {
  const log: StateTransitionLog = {
    ...ctx,
    timestamp: new Date().toISOString(),
    event: "STATE_TRANSITION_REJECTED",
    fromState,
    toState,
    success: false,
    error: reason,
    message: `API ${ctx.apiId} transition rejected: ${fromState ?? "null"} → ${toState}. Reason: ${reason}`,
  };

  console.warn(
    `[WorkflowState] REJECTED: ${log.message}`,
    JSON.stringify({
      apiId: ctx.apiId,
      from: fromState,
      to: toState,
      reason,
      actor: ctx.developerId,
      endpoint: ctx.endpoint,
      requestId: ctx.requestId,
    }),
  );
}

/**
 * Log an idempotent no-op (no state change needed)
 */
export function logIdempotentNoOp(
  ctx: WorkflowLogContext,
  currentState: ApiWorkflowState,
  requestedAction: string,
): void {
  const log: StateTransitionLog = {
    ...ctx,
    timestamp: new Date().toISOString(),
    event: "IDEMPOTENT_NOOP",
    fromState: currentState,
    toState: currentState,
    success: true,
    message: `API ${ctx.apiId} already in state ${currentState}. Action "${requestedAction}" is no-op.`,
  };

  console.log(
    `[WorkflowState] NO-OP: ${log.message}`,
    JSON.stringify({
      apiId: ctx.apiId,
      currentState,
      action: requestedAction,
      actor: ctx.developerId,
      endpoint: ctx.endpoint,
      requestId: ctx.requestId,
    }),
  );
}

/**
 * Log deployment lifecycle events
 */
export function logDeploymentEvent(
  ctx: WorkflowLogContext,
  event:
    | "DEPLOYMENT_STARTED"
    | "DEPLOYMENT_SUCCEEDED"
    | "DEPLOYMENT_FAILED"
    | "DEPLOYMENT_DUPLICATE",
  details?: Record<string, unknown>,
): void {
  const eventMessages = {
    DEPLOYMENT_STARTED: "Deployment started",
    DEPLOYMENT_SUCCEEDED: "Deployment succeeded",
    DEPLOYMENT_FAILED: "Deployment failed",
    DEPLOYMENT_DUPLICATE: "Duplicate deployment request detected",
  };

  console.log(
    `[Deployment] ${eventMessages[event]} for API ${ctx.apiId}`,
    JSON.stringify({
      event,
      apiId: ctx.apiId,
      deploymentId: ctx.deploymentId,
      actor: ctx.developerId,
      endpoint: ctx.endpoint,
      requestId: ctx.requestId,
      ...details,
    }),
  );
}

/**
 * Create a logger context from Express request
 */
export function createLogContext(
  apiId: string,
  developerId?: string,
  endpoint?: string,
  requestId?: string,
): WorkflowLogContext {
  return {
    apiId,
    developerId,
    endpoint,
    requestId: requestId ?? generateCorrelationId(),
  };
}
