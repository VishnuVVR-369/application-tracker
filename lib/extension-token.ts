const TOKEN_BYTES = 32

function base64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export async function hashExtensionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function createExtensionTokenSecret() {
  const random = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  const token = `wat_${base64Url(random)}`
  return {
    token,
    tokenHash: await hashExtensionToken(token),
    tokenPrefix: token.slice(0, 12),
  }
}
