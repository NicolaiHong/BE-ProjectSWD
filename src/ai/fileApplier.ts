import fs from "fs";
import path from "path";
import type { AIFileChange } from "./provider";

export class FileApplier {
  static async apply(workspaceDir: string, changes: AIFileChange[]): Promise<void> {
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
