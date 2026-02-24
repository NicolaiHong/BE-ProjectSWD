import fs from "fs";
import path from "path";
import type { AIFileChange } from "./provider";

/**
 * Safely apply AI-generated file changes under a scoped workspace directory.
 * Prevents path traversal attacks by validating all resolved paths.
 */
export class FileApplier {
  /**
   * Apply a list of file changes under the given workspace root.
   * @param workspaceDir Absolute path to the project workspace (e.g. /tmp/workspaces/my-project)
   * @param changes Array of file changes from the AI provider
   */
  static async apply(workspaceDir: string, changes: AIFileChange[]): Promise<void> {
    // Ensure workspace directory exists
    fs.mkdirSync(workspaceDir, { recursive: true });

    const resolvedRoot = fs.realpathSync(workspaceDir);

    for (const change of changes) {
      const targetPath = path.resolve(resolvedRoot, change.path);

      // SECURITY: Prevent path traversal — target must be under workspace root
      if (!targetPath.startsWith(resolvedRoot + path.sep) && targetPath !== resolvedRoot) {
        throw new Error(
          `Security violation: path "${change.path}" resolves outside workspace root`,
        );
      }

      // Prevent writing to sensitive file patterns
      const dangerousPatterns = [".env", ".git/", "node_modules/", "package-lock.json"];
      const normalizedPath = change.path.replace(/\\/g, "/");
      for (const pattern of dangerousPatterns) {
        if (normalizedPath === pattern || normalizedPath.startsWith(pattern)) {
          throw new Error(
            `Security violation: cannot modify sensitive path "${change.path}"`,
          );
        }
      }

      switch (change.action) {
        case "create":
        case "update": {
          // Create parent directories
          const dir = path.dirname(targetPath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(targetPath, change.content, "utf-8");
          console.log(`[FileApplier] ${change.action}: ${change.path}`);
          break;
        }
        case "delete": {
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            console.log(`[FileApplier] delete: ${change.path}`);
          } else {
            console.warn(`[FileApplier] delete skipped (not found): ${change.path}`);
          }
          break;
        }
        default:
          console.warn(`[FileApplier] unknown action "${change.action}" for ${change.path}`);
      }
    }
  }
}
