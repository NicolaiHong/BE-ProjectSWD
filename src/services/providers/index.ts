import type { IDeploymentProvider } from "./deployment-provider.interface";
import type { deployment_provider } from "../../generated/prisma/enums";
import { VercelDeploymentProvider } from "./vercel.provider";
import { RenderDeploymentProvider } from "./render.provider";
import { GitHubPagesDeploymentProvider } from "./github-pages.provider";

// Re-export types
export * from "./deployment-provider.interface";

// Provider registry
const providers: Map<deployment_provider, IDeploymentProvider> = new Map();

// Initialize providers
providers.set("VERCEL", new VercelDeploymentProvider());
providers.set("RENDER", new RenderDeploymentProvider());
providers.set("GITHUB_PAGES", new GitHubPagesDeploymentProvider());

/**
 * Get a deployment provider by type
 */
export function getDeploymentProvider(providerType: deployment_provider): IDeploymentProvider {
  const provider = providers.get(providerType);
  if (!provider) {
    throw new Error(`Unknown deployment provider: ${providerType}`);
  }
  return provider;
}

/**
 * Get all available deployment providers
 */
export function getAvailableProviders(): { type: deployment_provider; name: string }[] {
  return Array.from(providers.entries()).map(([type, provider]) => ({
    type,
    name: provider.name,
  }));
}

/**
 * Check if a provider type is valid
 */
export function isValidProvider(providerType: string): providerType is deployment_provider {
  return providers.has(providerType as deployment_provider);
}
