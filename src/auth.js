// Session + auth API client. The backend owns the truth (bcrypt + JWT +
// SQLite); this module just calls it and persists the issued token.
// Storage choice: localStorage + Bearer header. Tradeoff acknowledged: an
// httpOnly cookie would be XSS-proof but needs CSRF handling and same-site
// coordination across Vercel/Render origins — Bearer is the standard SPA
// compromise and keeps the socket handshake symmetric (auth: { token }).
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://multicam-backend.onrender.com";

const STORAGE_KEY = "herd.session";

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s && s.token && s.username ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the server — is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const signup = (username, password) => post("/auth/signup", { username, password });
export const login = (username, password) => post("/auth/login", { username, password });

// Mint a signed room code (authed). The code is the capability others need to
// join; share it as a link. Returns { code }.
export async function createRoom(token) {
  let res;
  try {
    res = await fetch(`${SERVER_URL}/rooms/new`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Cannot reach the server — is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
