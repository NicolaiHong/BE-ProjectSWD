export interface FrameworkConfig {
  name: string;
  extension: string;
  promptHint: string;
  defaultPath: (pageName: string) => string;
}
