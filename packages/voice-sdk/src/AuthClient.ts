import { z } from 'zod';

export const credentialSchema = z.object({
  username: z.string(),
  domain: z.string(),
  password: z.string(),
  wssUrl: z.string().url(),
  registrar: z.string().optional(),
  outboundProxy: z.string().optional(),
  displayName: z.string().optional(),
  stunServers: z.array(z.string()).optional(),
  turnServers: z
    .array(
      z.object({
        urls: z.array(z.string()),
        username: z.string(),
        credential: z.string()
      })
    )
    .optional()
});

export type CredentialResponse = z.infer<typeof credentialSchema>;

export async function fetchCredentials(
  authServer: string,
  token: string
): Promise<CredentialResponse> {
  // robust url construction
  const baseUrl = authServer.replace(/\/+$/, '');
  const url = `${baseUrl}/sip-credentials`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    let errorMessage = `Auth failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body === 'object') {
        // Try common error fields
        const message = body.message || body.error || body.code;
        if (message) {
          errorMessage = `Auth failed: ${message}`;
        }
      }
    } catch (e) {
      // If parsing fails (e.g. HTML response), stick to status code
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  return credentialSchema.parse(data);
}
