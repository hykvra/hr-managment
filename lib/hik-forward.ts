/**
 * lib/hik-forward.ts
 *
 * If a Hikvision device has proxy_url set, forward the action through the
 * local proxy instead of calling the hik* functions directly.
 * This bridges the Railway-hosted portal to LAN-only devices via ngrok.
 */

/**
 * Forward an action to the local Hikvision proxy.
 *
 * @param proxyUrl  The base URL of the proxy, e.g. "https://xxxx.ngrok.io"
 * @param secret    The HIK_PROXY_SECRET value
 * @param endpoint  The proxy endpoint, e.g. "/test", "/sync-employees"
 * @param body      JSON body to send
 */
export async function forwardToProxy(
  proxyUrl: string,
  secret: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = `${proxyUrl.replace(/\/$/, '')}${endpoint}`
  return fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  })
}
