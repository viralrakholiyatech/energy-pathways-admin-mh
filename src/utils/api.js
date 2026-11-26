export const loginRequest = async (username, password) => {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.trim(), password })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !result.token) {
    throw new Error((result && (result.message || result.messages || result.error)) || `Login failed (HTTP ${response.status})`);
  }
  return { token: result.token, expiresIn: result.expiresIn, message: result.message || result.messages };
};