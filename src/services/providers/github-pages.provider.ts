import type {
  IDeploymentProvider,
  DeploymentPrerequisites,
  ValidationResult,
  DeploymentResult,
  DeploymentStatusResult,
} from "./deployment-provider.interface";
import type { deployment_provider } from "../../generated/prisma/enums";

/**
 * GitHub Pages deployment provider (stubbed implementation)
 * 
 * In production, this would:
 * 1. Use GitHub API to create/update repository
 * 2. Push built static files to gh-pages branch
 * 3. Enable GitHub Pages in repo settings
 * 4. Wait for Pages deployment
 */
export class GitHubPagesDeploymentProvider implements IDeploymentProvider {
  readonly name = "GitHub Pages";
  readonly providerType: deployment_provider = "GITHUB_PAGES";

  async validatePrerequisites(prereqs: DeploymentPrerequisites): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!prereqs.sourceFiles || prereqs.sourceFiles.length === 0) {
      errors.push("No source files provided for deployment");
    }

    if (!prereqs.projectName) {
      errors.push("Project name is required");
    }

    // GitHub Pages requires an index.html for static sites
    // or package.json for build-based deployments
    const hasIndexHtml = prereqs.sourceFiles.some(
      (f) => f.path === "index.html" || f.path.endsWith("/index.html")
    );
    const hasPackageJson = prereqs.sourceFiles.some(
      (f) => f.path === "package.json" || f.path.endsWith("/package.json")
    );

    if (!hasIndexHtml && !hasPackageJson) {
      errors.push("Either index.html or package.json is required for GitHub Pages deployment");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async createDeployment(
    prereqs: DeploymentPrerequisites,
    options?: Record<string, unknown>
  ): Promise<DeploymentResult> {
    // Validate first
    const validation = await this.validatePrerequisites(prereqs);
    if (!validation.valid) {
      return {
        success: false,
        errorMessage: `Validation failed: ${validation.errors.join(", ")}`,
      };
    }

    // STUB: In production, this would use GitHub API
    const providerDeploymentId = `ghpages_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const projectSlug = prereqs.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    // GitHub username would come from options or auth context
    const username = (options?.githubUsername as string) || "user";
    
    console.log(`[GitHubPagesProvider] Creating deployment for project: ${prereqs.projectName}`);
    console.log(`[GitHubPagesProvider] Source files: ${prereqs.sourceFiles.length}`);
    console.log(`[GitHubPagesProvider] Environment: ${prereqs.environment}`);

    // Simulate deployment URL
    const deployUrl = `https://${username}.github.io/${projectSlug}`;

    return {
      success: true,
      deployUrl,
      providerDeploymentId,
      metadata: {
        provider: "github_pages",
        projectSlug,
        repository: `${username}/${projectSlug}`,
        branch: "gh-pages",
        fileCount: prereqs.sourceFiles.length,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async getDeploymentStatus(providerDeploymentId: string): Promise<DeploymentStatusResult> {
    // STUB: In production, this would check GitHub Pages status via API
    console.log(`[GitHubPagesProvider] Checking status for deployment: ${providerDeploymentId}`);

    // Simulate completed deployment
    return {
      status: "DEPLOYED",
      deployUrl: `https://user.github.io/project-${providerDeploymentId.slice(-8)}`,
      metadata: {
        checkedAt: new Date().toISOString(),
      },
    };
  }
}
