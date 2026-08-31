// ============================================================
// Tiny JWT payload decoder — no verification (the backend already
// verified the token; we only need to read the claims client-side).
//
// Why this exists: LoginResponseDTO only returns { token, expiresIn },
// not a user object, and there is no GET /api/users/me. The JWT's
// `sub` claim is the userId (see JwtService.generateToken /
// WebSocketAuthInterceptor's Principal), so decoding it client-side is
// how the frontend learns who just logged in before fetching their
// profile from GET /api/users/{userId}/profile.
// ============================================================

export function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
