/**
 * API Workflow State Machine
 *
 * This module defines the canonical workflow states for API lifecycle management,
 * allowed state transitions, and helper functions for safe state changes.
 *
 * Key design principles:
 * - Idempotent operations where possible
 * - Atomic state transitions with optimistic locking
 * - Clear separation between generation and deployment states
 */

/**
 * All valid API workflow states.
 * Maps to Prisma enum `workflow_state` in schema.prisma
 */
export const ApiWorkflowState = {
  // Initial / Draft states
  DRAFT: "DRAFT",
  CONFIGURED: "CONFIGURED", // Legacy alias for DRAFT (backward compat)

  // Generation states
  PREVIEW_GENERATING: "PREVIEW_GENERATING",
  PREVIEW_GENERATED: "PREVIEW_GENERATED",
  UI_GENERATED: "UI_GENERATED", // Legacy alias for PREVIEW_GENERATED
  FULL_SOURCE_GENERATING: "FULL_SOURCE_GENERATING",
  CODE_GENERATED: "CODE_GENERATED",

  // Deployment states
  READY_TO_DEPLOY: "READY_TO_DEPLOY",
  DEPLOY_QUEUED: "DEPLOY_QUEUED",
  DEPLOYING: "DEPLOYING",
  DEPLOYED: "DEPLOYED",

  // Failure / Recovery states
  DEPLOY_FAILED: "DEPLOY_FAILED",
  FAILED: "FAILED", // Legacy alias for DEPLOY_FAILED
  FIXING_WITH_AI: "FIXING_WITH_AI",
  USER_FIX_REQUIRED: "USER_FIX_REQUIRED",
} as const;

export type ApiWorkflowState =
  (typeof ApiWorkflowState)[keyof typeof ApiWorkflowState];

/**
 * State aliases for backward compatibility
 */
export const STATE_ALIASES: Record<string, ApiWorkflowState> = {
  CONFIGURED: ApiWorkflowState.DRAFT,
  UI_GENERATED: ApiWorkflowState.PREVIEW_GENERATED,
  FAILED: ApiWorkflowState.DEPLOY_FAILED,
};

/**
 * Normalize state to canonical form
 */
export function normalizeState(
  state: string | null | undefined,
): ApiWorkflowState | null {
  if (!state) return null;
  const upper = state.toUpperCase();
  return (STATE_ALIASES[upper] ?? upper) as ApiWorkflowState;
}

/**
 * Allowed state transitions map.
 * Key = current state, Value = array of valid next states
 */
export const ALLOWED_TRANSITIONS: Record<ApiWorkflowState, ApiWorkflowState[]> =
  {
    // Draft can start generation
    [ApiWorkflowState.DRAFT]: [
      ApiWorkflowState.PREVIEW_GENERATING,
      ApiWorkflowState.FULL_SOURCE_GENERATING,
    ],
    [ApiWorkflowState.CONFIGURED]: [
      ApiWorkflowState.PREVIEW_GENERATING,
      ApiWorkflowState.FULL_SOURCE_GENERATING,
    ],

    // Preview generation outcomes
    [ApiWorkflowState.PREVIEW_GENERATING]: [
      ApiWorkflowState.PREVIEW_GENERATED,
      ApiWorkflowState.UI_GENERATED,
      ApiWorkflowState.DEPLOY_FAILED,
      ApiWorkflowState.FAILED,
    ],
    [ApiWorkflowState.PREVIEW_GENERATED]: [
      ApiWorkflowState.FULL_SOURCE_GENERATING,
      ApiWorkflowState.PREVIEW_GENERATING, // re-generate preview
    ],
    [ApiWorkflowState.UI_GENERATED]: [
      ApiWorkflowState.FULL_SOURCE_GENERATING,
      ApiWorkflowState.PREVIEW_GENERATING,
    ],

    // Full source generation outcomes
    [ApiWorkflowState.FULL_SOURCE_GENERATING]: [
      ApiWorkflowState.CODE_GENERATED,
      ApiWorkflowState.DEPLOY_FAILED,
      ApiWorkflowState.FAILED,
    ],

    // Code generated - ready for deployment prep
    [ApiWorkflowState.CODE_GENERATED]: [
      ApiWorkflowState.READY_TO_DEPLOY,
      ApiWorkflowState.DEPLOY_QUEUED,
      ApiWorkflowState.DEPLOYING, // direct deploy allowed
      ApiWorkflowState.FULL_SOURCE_GENERATING, // re-generate
    ],

    // Ready to deploy - can start deployment
    [ApiWorkflowState.READY_TO_DEPLOY]: [
      ApiWorkflowState.DEPLOY_QUEUED,
      ApiWorkflowState.DEPLOYING,
      ApiWorkflowState.FULL_SOURCE_GENERATING, // re-generate
      ApiWorkflowState.CODE_GENERATED, // go back
    ],

    // Deploy queued - waiting to start
    [ApiWorkflowState.DEPLOY_QUEUED]: [
      ApiWorkflowState.DEPLOYING,
      ApiWorkflowState.DEPLOY_FAILED,
      ApiWorkflowState.FAILED,
    ],

    // Deploying - in progress
    [ApiWorkflowState.DEPLOYING]: [
      ApiWorkflowState.DEPLOYED,
      ApiWorkflowState.DEPLOY_FAILED,
      ApiWorkflowState.FAILED,
    ],

    // Deployed - can redeploy or regenerate
    [ApiWorkflowState.DEPLOYED]: [
      ApiWorkflowState.FULL_SOURCE_GENERATING, // regenerate
      ApiWorkflowState.DEPLOY_QUEUED, // redeploy
      ApiWorkflowState.DEPLOYING, // direct redeploy
      ApiWorkflowState.READY_TO_DEPLOY, // explicit prep for redeploy
    ],

    // Deployment failed - recovery options
    [ApiWorkflowState.DEPLOY_FAILED]: [
      ApiWorkflowState.FIXING_WITH_AI,
      ApiWorkflowState.USER_FIX_REQUIRED,
      ApiWorkflowState.FULL_SOURCE_GENERATING, // regenerate
      ApiWorkflowState.CODE_GENERATED, // retry after external fix
      ApiWorkflowState.DEPLOY_QUEUED, // retry deploy
      ApiWorkflowState.DEPLOYING, // direct retry
      ApiWorkflowState.READY_TO_DEPLOY,
    ],
    [ApiWorkflowState.FAILED]: [
      ApiWorkflowState.FIXING_WITH_AI,
      ApiWorkflowState.USER_FIX_REQUIRED,
      ApiWorkflowState.FULL_SOURCE_GENERATING,
      ApiWorkflowState.CODE_GENERATED,
      ApiWorkflowState.DEPLOY_QUEUED,
      ApiWorkflowState.DEPLOYING,
      ApiWorkflowState.READY_TO_DEPLOY,
    ],

    // Fixing with AI
    [ApiWorkflowState.FIXING_WITH_AI]: [
      ApiWorkflowState.CODE_GENERATED,
      ApiWorkflowState.DEPLOY_FAILED,
      ApiWorkflowState.FAILED,
      ApiWorkflowState.USER_FIX_REQUIRED,
    ],

    // User fix required
    [ApiWorkflowState.USER_FIX_REQUIRED]: [
      ApiWorkflowState.CODE_GENERATED,
      ApiWorkflowState.FULL_SOURCE_GENERATING,
      ApiWorkflowState.FIXING_WITH_AI,
    ],
  };

/**
 * Check if a state transition is allowed
 */
export function isTransitionAllowed(
  fromState: ApiWorkflowState | null | undefined,
  toState: ApiWorkflowState,
): boolean {
  if (!fromState) {
    // Null/undefined state can transition to initial states
    const initialStates: ApiWorkflowState[] = [
      ApiWorkflowState.DRAFT,
      ApiWorkflowState.CONFIGURED,
      ApiWorkflowState.PREVIEW_GENERATING,
      ApiWorkflowState.FULL_SOURCE_GENERATING,
    ];
    return initialStates.includes(toState);
  }

  const allowed = ALLOWED_TRANSITIONS[fromState];
  return allowed?.includes(toState) ?? false;
}

/**
 * States that represent "code is ready" - deployment can proceed
 */
export const CODE_READY_STATES: ApiWorkflowState[] = [
  ApiWorkflowState.CODE_GENERATED,
  ApiWorkflowState.READY_TO_DEPLOY,
];

/**
 * States that represent "deployment in progress" - should be idempotent no-op
 */
export const DEPLOYMENT_IN_PROGRESS_STATES: ApiWorkflowState[] = [
  ApiWorkflowState.DEPLOY_QUEUED,
  ApiWorkflowState.DEPLOYING,
];

/**
 * States that represent "deployment complete" - may allow redeploy
 */
export const DEPLOYMENT_COMPLETE_STATES: ApiWorkflowState[] = [
  ApiWorkflowState.DEPLOYED,
];

/**
 * States that represent failure
 */
export const FAILURE_STATES: ApiWorkflowState[] = [
  ApiWorkflowState.DEPLOY_FAILED,
  ApiWorkflowState.FAILED,
];

/**
 * States where markReadyToDeploy should return success (idempotent)
 */
export const READY_TO_DEPLOY_IDEMPOTENT_STATES: ApiWorkflowState[] = [
  ApiWorkflowState.READY_TO_DEPLOY,
  ApiWorkflowState.DEPLOY_QUEUED,
  ApiWorkflowState.DEPLOYING,
  ApiWorkflowState.DEPLOYED,
];

/**
 * States from which markReadyToDeploy transition is allowed
 */
export const READY_TO_DEPLOY_ALLOWED_FROM: ApiWorkflowState[] = [
  ApiWorkflowState.CODE_GENERATED,
];

/**
 * States from which startDeployment is allowed
 */
export const START_DEPLOYMENT_ALLOWED_FROM: ApiWorkflowState[] = [
  ApiWorkflowState.CODE_GENERATED,
  ApiWorkflowState.READY_TO_DEPLOY,
  ApiWorkflowState.DEPLOY_FAILED,
  ApiWorkflowState.FAILED,
  ApiWorkflowState.DEPLOYED, // redeploy
];

/**
 * Result type for idempotent operations
 */
export interface IdempotentResult<T> {
  /** Whether the operation performed a state change */
  changed: boolean;
  /** The current/resulting data */
  data: T;
  /** Human-readable message */
  message: string;
  /** Previous state (if changed) */
  previousState?: ApiWorkflowState | null;
  /** Current state */
  currentState: ApiWorkflowState;
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: ApiWorkflowState): string {
  const descriptions: Record<ApiWorkflowState, string> = {
    [ApiWorkflowState.DRAFT]: "API is in draft state",
    [ApiWorkflowState.CONFIGURED]: "API is configured",
    [ApiWorkflowState.PREVIEW_GENERATING]: "Preview is being generated",
    [ApiWorkflowState.PREVIEW_GENERATED]: "Preview generation complete",
    [ApiWorkflowState.UI_GENERATED]: "UI preview generated",
    [ApiWorkflowState.FULL_SOURCE_GENERATING]:
      "Full source code is being generated",
    [ApiWorkflowState.CODE_GENERATED]: "Full source code generated",
    [ApiWorkflowState.READY_TO_DEPLOY]: "Ready to deploy",
    [ApiWorkflowState.DEPLOY_QUEUED]: "Deployment is queued",
    [ApiWorkflowState.DEPLOYING]: "Deployment in progress",
    [ApiWorkflowState.DEPLOYED]: "Successfully deployed",
    [ApiWorkflowState.DEPLOY_FAILED]: "Deployment failed",
    [ApiWorkflowState.FAILED]: "Operation failed",
    [ApiWorkflowState.FIXING_WITH_AI]: "AI is fixing the issue",
    [ApiWorkflowState.USER_FIX_REQUIRED]: "Manual fix required",
  };
  return descriptions[state] ?? "Unknown state";
}

/**
 * Map Prisma enum to our canonical states (for backward compat)
 * The Prisma schema may have fewer states; this maps them
 */
export function mapPrismaState(
  prismaState: string | null | undefined,
): ApiWorkflowState {
  if (!prismaState) return ApiWorkflowState.DRAFT;

  // Direct match
  if (
    Object.values(ApiWorkflowState).includes(prismaState as ApiWorkflowState)
  ) {
    return prismaState as ApiWorkflowState;
  }

  // Alias mapping
  const aliased = STATE_ALIASES[prismaState];
  if (aliased) return aliased;

  // Default fallback
  return ApiWorkflowState.DRAFT;
}

/**
 * Map our canonical state to Prisma enum value
 * For states not in Prisma schema, map to closest equivalent
 */
export function toPrismaState(state: ApiWorkflowState): string {
  // Map new states to existing Prisma enum values
  const prismaMapping: Partial<Record<ApiWorkflowState, string>> = {
    [ApiWorkflowState.DRAFT]: "CONFIGURED",
    [ApiWorkflowState.PREVIEW_GENERATED]: "UI_GENERATED",
    [ApiWorkflowState.DEPLOY_FAILED]: "FAILED",
    [ApiWorkflowState.DEPLOY_QUEUED]: "DEPLOYING", // closest
    [ApiWorkflowState.PREVIEW_GENERATING]: "CONFIGURED", // no direct equivalent
    [ApiWorkflowState.FULL_SOURCE_GENERATING]: "CODE_GENERATED", // closest
    [ApiWorkflowState.FIXING_WITH_AI]: "FAILED", // closest
    [ApiWorkflowState.USER_FIX_REQUIRED]: "FAILED", // closest
  };

  return prismaMapping[state] ?? state;
}
