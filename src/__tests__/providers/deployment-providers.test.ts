import { VercelDeploymentProvider } from "../../services/providers/vercel.provider";
import { RenderDeploymentProvider } from "../../services/providers/render.provider";
import { GitHubPagesDeploymentProvider } from "../../services/providers/github-pages.provider";
import { getDeploymentProvider, getAvailableProviders, isValidProvider } from "../../services/providers";
import type { DeploymentPrerequisites } from "../../services/providers/deployment-provider.interface";

describe("Deployment Providers", () => {
  const validPrereqs: DeploymentPrerequisites = {
    apiId: "test-api-id",
    projectName: "My Test Project",
    sourceFiles: [
      { path: "package.json", content: '{"name": "test", "version": "1.0.0"}' },
      { path: "src/index.tsx", content: 'export default function App() { return <div>Hello</div>; }' },
    ],
    environment: "DEVELOPMENT",
  };

  const invalidPrereqs: DeploymentPrerequisites = {
    apiId: "test-api-id",
    projectName: "My Test Project",
    sourceFiles: [], // No files
    environment: "DEVELOPMENT",
  };

  describe("VercelDeploymentProvider", () => {
    const provider = new VercelDeploymentProvider();

    it("should have correct name and type", () => {
      expect(provider.name).toBe("Vercel");
      expect(provider.providerType).toBe("VERCEL");
    });

    it("should validate prerequisites successfully with valid input", async () => {
      const result = await provider.validatePrerequisites(validPrereqs);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation with no source files", async () => {
      const result = await provider.validatePrerequisites(invalidPrereqs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No source files provided for deployment");
    });

    it("should fail validation without package.json", async () => {
      const prereqs: DeploymentPrerequisites = {
        ...validPrereqs,
        sourceFiles: [{ path: "src/index.tsx", content: "code" }],
      };
      const result = await provider.validatePrerequisites(prereqs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("package.json is required for Vercel deployment");
    });

    it("should create deployment successfully", async () => {
      const result = await provider.createDeployment(validPrereqs);
      expect(result.success).toBe(true);
      expect(result.deployUrl).toContain("vercel.app");
      expect(result.providerDeploymentId).toBeTruthy();
    });

    it("should fail deployment with invalid prerequisites", async () => {
      const result = await provider.createDeployment(invalidPrereqs);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Validation failed");
    });

    it("should get deployment status", async () => {
      const status = await provider.getDeploymentStatus("test-deployment-id");
      expect(status.status).toBe("DEPLOYED");
      expect(status.deployUrl).toBeTruthy();
    });
  });

  describe("RenderDeploymentProvider", () => {
    const provider = new RenderDeploymentProvider();

    it("should have correct name and type", () => {
      expect(provider.name).toBe("Render");
      expect(provider.providerType).toBe("RENDER");
    });

    it("should validate prerequisites successfully", async () => {
      const result = await provider.validatePrerequisites(validPrereqs);
      expect(result.valid).toBe(true);
    });

    it("should create deployment successfully", async () => {
      const result = await provider.createDeployment(validPrereqs);
      expect(result.success).toBe(true);
      expect(result.deployUrl).toContain("onrender.com");
    });

    it("should get deployment status", async () => {
      const status = await provider.getDeploymentStatus("test-deployment-id");
      expect(status.status).toBe("DEPLOYED");
    });
  });

  describe("GitHubPagesDeploymentProvider", () => {
    const provider = new GitHubPagesDeploymentProvider();

    it("should have correct name and type", () => {
      expect(provider.name).toBe("GitHub Pages");
      expect(provider.providerType).toBe("GITHUB_PAGES");
    });

    it("should validate prerequisites successfully", async () => {
      const result = await provider.validatePrerequisites(validPrereqs);
      expect(result.valid).toBe(true);
    });

    it("should validate with index.html instead of package.json", async () => {
      const prereqs: DeploymentPrerequisites = {
        ...validPrereqs,
        sourceFiles: [{ path: "index.html", content: "<html></html>" }],
      };
      const result = await provider.validatePrerequisites(prereqs);
      expect(result.valid).toBe(true);
    });

    it("should create deployment successfully", async () => {
      const result = await provider.createDeployment(validPrereqs);
      expect(result.success).toBe(true);
      expect(result.deployUrl).toContain("github.io");
    });

    it("should get deployment status", async () => {
      const status = await provider.getDeploymentStatus("test-deployment-id");
      expect(status.status).toBe("DEPLOYED");
    });
  });

  describe("Provider Registry", () => {
    it("should return all available providers", () => {
      const providers = getAvailableProviders();
      expect(providers).toHaveLength(3);
      expect(providers.map(p => p.type)).toContain("VERCEL");
      expect(providers.map(p => p.type)).toContain("RENDER");
      expect(providers.map(p => p.type)).toContain("GITHUB_PAGES");
    });

    it("should get provider by type", () => {
      const vercel = getDeploymentProvider("VERCEL");
      expect(vercel.name).toBe("Vercel");

      const render = getDeploymentProvider("RENDER");
      expect(render.name).toBe("Render");

      const ghPages = getDeploymentProvider("GITHUB_PAGES");
      expect(ghPages.name).toBe("GitHub Pages");
    });

    it("should throw for unknown provider", () => {
      expect(() => getDeploymentProvider("UNKNOWN" as any)).toThrow("Unknown deployment provider");
    });

    it("should validate provider types", () => {
      expect(isValidProvider("VERCEL")).toBe(true);
      expect(isValidProvider("RENDER")).toBe(true);
      expect(isValidProvider("GITHUB_PAGES")).toBe(true);
      expect(isValidProvider("UNKNOWN")).toBe(false);
    });
  });
});
