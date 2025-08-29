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
  const res = await fetch(`${authServer}/sip-credentials`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Auth failed with status ${res.status}`);
  }

  const data = await res.json();
  return credentialSchema.parse(data);
}
