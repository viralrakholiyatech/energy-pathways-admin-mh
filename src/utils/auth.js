const TOKEN_KEY = "adminToken";
const EXPIRY_KEY = "adminTokenExpiry";
export const saveSession = (token, expiresIn) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresIn) localStorage.setItem(EXPIRY_KEY, String(Date.now() + Number(expiresIn) * 1000));
  else localStorage.removeItem(EXPIRY_KEY);
};
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
};
export const isLoggedIn = () => {
  const token = getToken();
  if (!token) return false;
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  if (expiry && Date.now()  >= expiry) {
    clearSession();
    return false;
  }
  return true;
};
