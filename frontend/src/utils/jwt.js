
export function parseJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}


export function isTokenExpired(token, bufferSeconds = 10) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  const expiresAtMs = payload.exp * 1000;
  return Date.now() >= expiresAtMs - bufferSeconds * 1000;
}


export function getTokenRemainingMs(token) {
  if (!token) return 0;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return 0;
  const remaining = payload.exp * 1000 - Date.now();
  return Math.max(0, remaining);
}
