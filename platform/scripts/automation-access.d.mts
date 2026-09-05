export function automationHeaders(url: string, env?: Record<string, string | undefined>): Record<string, string>;
export function authorizePreviewContext(context: {
  request: { get(url: string, options?: { headers?: Record<string, string>; maxRedirects?: number }): Promise<{
    headers(): Record<string, string>; ok(): boolean; json(): Promise<any>;
  }> };
}, baseUrl: string): Promise<void>;
