/**
 * Workflow State Machine Tests
 *
 * Tests for the deployment workflow state machine including:
 * - State transitions
 * - Idempotent operations
 * - Duplicate deployment protection
 * - Race condition handling
 * - Failure recovery flows
 */

import {
  ApiWorkflowState,
  isTransitionAllowed,
  ALLOWED_TRANSITIONS,
  READY_TO_DEPLOY_IDEMPOTENT_STATES,
  READY_TO_DEPLOY_ALLOWED_FROM,
  START_DEPLOYMENT_ALLOWED_FROM,
  DEPLOYMENT_IN_PROGRESS_STATES,
  normalizeState,
  getStateDescription,
  toPrismaState,
  mapPrismaState,
} from "../constants/workflowStates";

describe("ApiWorkflowState enum", () => {
  it("should have all expected states", () => {
    expect(ApiWorkflowState.DRAFT).toBe("DRAFT");
    expect(ApiWorkflowState.CODE_GENERATED).toBe("CODE_GENERATED");
    expect(ApiWorkflowState.READY_TO_DEPLOY).toBe("READY_TO_DEPLOY");
    expect(ApiWorkflowState.DEPLOY_QUEUED).toBe("DEPLOY_QUEUED");
    expect(ApiWorkflowState.DEPLOYING).toBe("DEPLOYING");
    expect(ApiWorkflowState.DEPLOYED).toBe("DEPLOYED");
    expect(ApiWorkflowState.DEPLOY_FAILED).toBe("DEPLOY_FAILED");
    expect(ApiWorkflowState.FIXING_WITH_AI).toBe("FIXING_WITH_AI");
    expect(ApiWorkflowState.USER_FIX_REQUIRED).toBe("USER_FIX_REQUIRED");
  });

  it("should have legacy compatibility aliases", () => {
    expect(ApiWorkflowState.CONFIGURED).toBe("CONFIGURED");
    expect(ApiWorkflowState.UI_GENERATED).toBe("UI_GENERATED");
    expect(ApiWorkflowState.FAILED).toBe("FAILED");
  });
});

describe("isTransitionAllowed", () => {
  describe("from CODE_GENERATED", () => {
    it("should allow transition to READY_TO_DEPLOY", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.CODE_GENERATED,
          ApiWorkflowState.READY_TO_DEPLOY,
        ),
      ).toBe(true);
    });

    it("should allow transition to DEPLOYING (direct deploy)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.CODE_GENERATED,
          ApiWorkflowState.DEPLOYING,
        ),
      ).toBe(true);
    });

    it("should allow transition to DEPLOY_QUEUED", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.CODE_GENERATED,
          ApiWorkflowState.DEPLOY_QUEUED,
        ),
      ).toBe(true);
    });

    it("should allow regeneration (FULL_SOURCE_GENERATING)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.CODE_GENERATED,
          ApiWorkflowState.FULL_SOURCE_GENERATING,
        ),
      ).toBe(true);
    });

    it("should NOT allow transition to DRAFT", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.CODE_GENERATED,
          ApiWorkflowState.DRAFT,
        ),
      ).toBe(false);
    });
  });

  describe("from DEPLOYING", () => {
    it("should allow transition to DEPLOYED", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYING,
          ApiWorkflowState.DEPLOYED,
        ),
      ).toBe(true);
    });

    it("should allow transition to DEPLOY_FAILED", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYING,
          ApiWorkflowState.DEPLOY_FAILED,
        ),
      ).toBe(true);
    });

    it("should allow transition to FAILED (legacy)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYING,
          ApiWorkflowState.FAILED,
        ),
      ).toBe(true);
    });

    it("should NOT allow transition to CODE_GENERATED", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYING,
          ApiWorkflowState.CODE_GENERATED,
        ),
      ).toBe(false);
    });
  });

  describe("from DEPLOYED", () => {
    it("should allow redeploy (DEPLOYING)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYED,
          ApiWorkflowState.DEPLOYING,
        ),
      ).toBe(true);
    });

    it("should allow redeploy via queue (DEPLOY_QUEUED)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYED,
          ApiWorkflowState.DEPLOY_QUEUED,
        ),
      ).toBe(true);
    });

    it("should allow regeneration", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOYED,
          ApiWorkflowState.FULL_SOURCE_GENERATING,
        ),
      ).toBe(true);
    });
  });

  describe("from DEPLOY_FAILED", () => {
    it("should allow transition to FIXING_WITH_AI", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOY_FAILED,
          ApiWorkflowState.FIXING_WITH_AI,
        ),
      ).toBe(true);
    });

    it("should allow transition to USER_FIX_REQUIRED", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOY_FAILED,
          ApiWorkflowState.USER_FIX_REQUIRED,
        ),
      ).toBe(true);
    });

    it("should allow retry (DEPLOYING)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOY_FAILED,
          ApiWorkflowState.DEPLOYING,
        ),
      ).toBe(true);
    });

    it("should allow retry via queue (DEPLOY_QUEUED)", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOY_FAILED,
          ApiWorkflowState.DEPLOY_QUEUED,
        ),
      ).toBe(true);
    });

    it("should allow regeneration", () => {
      expect(
        isTransitionAllowed(
          ApiWorkflowState.DEPLOY_FAILED,
          ApiWorkflowState.FULL_SOURCE_GENERATING,
        ),
      ).toBe(true);
    });
  });

  describe("from null/undefined state", () => {
    it("should allow transition to DRAFT", () => {
      expect(isTransitionAllowed(null, ApiWorkflowState.DRAFT)).toBe(true);
    });

    it("should allow transition to CONFIGURED", () => {
      expect(isTransitionAllowed(undefined, ApiWorkflowState.CONFIGURED)).toBe(
        true,
      );
    });

    it("should allow transition to generation states", () => {
      expect(
        isTransitionAllowed(null, ApiWorkflowState.PREVIEW_GENERATING),
      ).toBe(true);
      expect(
        isTransitionAllowed(null, ApiWorkflowState.FULL_SOURCE_GENERATING),
      ).toBe(true);
    });

    it("should NOT allow transition to DEPLOYED", () => {
      expect(isTransitionAllowed(null, ApiWorkflowState.DEPLOYED)).toBe(false);
    });
  });
});

describe("State groups", () => {
  describe("READY_TO_DEPLOY_IDEMPOTENT_STATES", () => {
    it("should include READY_TO_DEPLOY", () => {
      expect(READY_TO_DEPLOY_IDEMPOTENT_STATES).toContain(
        ApiWorkflowState.READY_TO_DEPLOY,
      );
    });

    it("should include DEPLOY_QUEUED", () => {
      expect(READY_TO_DEPLOY_IDEMPOTENT_STATES).toContain(
        ApiWorkflowState.DEPLOY_QUEUED,
      );
    });

    it("should include DEPLOYING", () => {
      expect(READY_TO_DEPLOY_IDEMPOTENT_STATES).toContain(
        ApiWorkflowState.DEPLOYING,
      );
    });

    it("should include DEPLOYED", () => {
      expect(READY_TO_DEPLOY_IDEMPOTENT_STATES).toContain(
        ApiWorkflowState.DEPLOYED,
      );
    });

    it("should NOT include CODE_GENERATED", () => {
      expect(READY_TO_DEPLOY_IDEMPOTENT_STATES).not.toContain(
        ApiWorkflowState.CODE_GENERATED,
      );
    });
  });

  describe("READY_TO_DEPLOY_ALLOWED_FROM", () => {
    it("should include CODE_GENERATED", () => {
      expect(READY_TO_DEPLOY_ALLOWED_FROM).toContain(
        ApiWorkflowState.CODE_GENERATED,
      );
    });

    it("should NOT include DEPLOYING", () => {
      expect(READY_TO_DEPLOY_ALLOWED_FROM).not.toContain(
        ApiWorkflowState.DEPLOYING,
      );
    });
  });

  describe("START_DEPLOYMENT_ALLOWED_FROM", () => {
    it("should include CODE_GENERATED", () => {
      expect(START_DEPLOYMENT_ALLOWED_FROM).toContain(
        ApiWorkflowState.CODE_GENERATED,
      );
    });

    it("should include READY_TO_DEPLOY", () => {
      expect(START_DEPLOYMENT_ALLOWED_FROM).toContain(
        ApiWorkflowState.READY_TO_DEPLOY,
      );
    });

    it("should include DEPLOY_FAILED", () => {
      expect(START_DEPLOYMENT_ALLOWED_FROM).toContain(
        ApiWorkflowState.DEPLOY_FAILED,
      );
    });

    it("should include DEPLOYED (for redeploy)", () => {
      expect(START_DEPLOYMENT_ALLOWED_FROM).toContain(
        ApiWorkflowState.DEPLOYED,
      );
    });
  });

  describe("DEPLOYMENT_IN_PROGRESS_STATES", () => {
    it("should include DEPLOY_QUEUED", () => {
      expect(DEPLOYMENT_IN_PROGRESS_STATES).toContain(
        ApiWorkflowState.DEPLOY_QUEUED,
      );
    });

    it("should include DEPLOYING", () => {
      expect(DEPLOYMENT_IN_PROGRESS_STATES).toContain(
        ApiWorkflowState.DEPLOYING,
      );
    });

    it("should NOT include DEPLOYED", () => {
      expect(DEPLOYMENT_IN_PROGRESS_STATES).not.toContain(
        ApiWorkflowState.DEPLOYED,
      );
    });
  });
});

describe("normalizeState", () => {
  it("should return null for null input", () => {
    expect(normalizeState(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(normalizeState(undefined)).toBeNull();
  });

  it("should normalize case", () => {
    expect(normalizeState("deployed")).toBe("DEPLOYED");
    expect(normalizeState("Deploying")).toBe("DEPLOYING");
  });

  it("should return valid states as-is", () => {
    expect(normalizeState("CODE_GENERATED")).toBe("CODE_GENERATED");
  });
});

describe("getStateDescription", () => {
  it("should return description for known states", () => {
    expect(getStateDescription(ApiWorkflowState.DEPLOYED)).toBe(
      "Successfully deployed",
    );
    expect(getStateDescription(ApiWorkflowState.DEPLOYING)).toBe(
      "Deployment in progress",
    );
    expect(getStateDescription(ApiWorkflowState.DEPLOY_FAILED)).toBe(
      "Deployment failed",
    );
  });
});

describe("Prisma mapping", () => {
  describe("toPrismaState", () => {
    it("should map DRAFT to CONFIGURED", () => {
      expect(toPrismaState(ApiWorkflowState.DRAFT)).toBe("CONFIGURED");
    });

    it("should map PREVIEW_GENERATED to UI_GENERATED", () => {
      expect(toPrismaState(ApiWorkflowState.PREVIEW_GENERATED)).toBe(
        "UI_GENERATED",
      );
    });

    it("should map DEPLOY_FAILED to FAILED", () => {
      expect(toPrismaState(ApiWorkflowState.DEPLOY_FAILED)).toBe("FAILED");
    });

    it("should pass through known Prisma states", () => {
      expect(toPrismaState(ApiWorkflowState.CODE_GENERATED)).toBe(
        "CODE_GENERATED",
      );
      expect(toPrismaState(ApiWorkflowState.DEPLOYED)).toBe("DEPLOYED");
      expect(toPrismaState(ApiWorkflowState.DEPLOYING)).toBe("DEPLOYING");
    });
  });

  describe("mapPrismaState", () => {
    it("should map null to DRAFT", () => {
      expect(mapPrismaState(null)).toBe(ApiWorkflowState.DRAFT);
    });

    it("should map undefined to DRAFT", () => {
      expect(mapPrismaState(undefined)).toBe(ApiWorkflowState.DRAFT);
    });

    it("should return CONFIGURED as-is (valid Prisma state)", () => {
      // CONFIGURED is a valid state in both Prisma and our enum
      expect(mapPrismaState("CONFIGURED")).toBe(ApiWorkflowState.CONFIGURED);
    });

    it("should pass through known states", () => {
      expect(mapPrismaState("CODE_GENERATED")).toBe(
        ApiWorkflowState.CODE_GENERATED,
      );
      expect(mapPrismaState("DEPLOYED")).toBe(ApiWorkflowState.DEPLOYED);
    });
  });
});

describe("Complete deployment flow transitions", () => {
  it("should allow full happy path: CODE_GENERATED -> READY_TO_DEPLOY -> DEPLOYING -> DEPLOYED", () => {
    expect(
      isTransitionAllowed(
        ApiWorkflowState.CODE_GENERATED,
        ApiWorkflowState.READY_TO_DEPLOY,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.READY_TO_DEPLOY,
        ApiWorkflowState.DEPLOYING,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYING,
        ApiWorkflowState.DEPLOYED,
      ),
    ).toBe(true);
  });

  it("should allow direct deploy: CODE_GENERATED -> DEPLOYING -> DEPLOYED", () => {
    expect(
      isTransitionAllowed(
        ApiWorkflowState.CODE_GENERATED,
        ApiWorkflowState.DEPLOYING,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYING,
        ApiWorkflowState.DEPLOYED,
      ),
    ).toBe(true);
  });

  it("should allow failure recovery: DEPLOYING -> DEPLOY_FAILED -> FIXING_WITH_AI -> CODE_GENERATED", () => {
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYING,
        ApiWorkflowState.DEPLOY_FAILED,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOY_FAILED,
        ApiWorkflowState.FIXING_WITH_AI,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.FIXING_WITH_AI,
        ApiWorkflowState.CODE_GENERATED,
      ),
    ).toBe(true);
  });

  it("should allow retry after failure: DEPLOY_FAILED -> DEPLOYING -> DEPLOYED", () => {
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOY_FAILED,
        ApiWorkflowState.DEPLOYING,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYING,
        ApiWorkflowState.DEPLOYED,
      ),
    ).toBe(true);
  });

  it("should allow redeploy: DEPLOYED -> DEPLOYING -> DEPLOYED", () => {
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYED,
        ApiWorkflowState.DEPLOYING,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        ApiWorkflowState.DEPLOYING,
        ApiWorkflowState.DEPLOYED,
      ),
    ).toBe(true);
  });
});
