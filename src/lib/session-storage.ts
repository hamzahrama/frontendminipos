/**
 * Session persistence layer
 * Menyimpan auth session ke localStorage agar tetap saat refresh
 */

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    tenant: { id: string; name: string; slug: string };
    roles: string[];
    permissions: string[];
  };
};

const SESSION_KEY = "hni_pos_session";
const EXPIRY_KEY = "hni_pos_session_expiry";
const ACTIVE_PANEL_KEY = "hni_pos_active_panel";

/**
 * Simpan session ke localStorage
 */
export function saveSession(session: AuthSession): void {
  try {
    const expiryTime = Date.now() + session.expiresIn * 1000;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
  } catch (err) {
    console.warn("Failed to save session:", err);
  }
}

/**
 * Ambil session dari localStorage
 */
export function loadSession(): AuthSession | null {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    const expiryStr = localStorage.getItem(EXPIRY_KEY);

    if (!sessionStr || !expiryStr) return null;

    // Check if session expired
    const expiryTime = parseInt(expiryStr, 10);
    if (Date.now() > expiryTime) {
      clearSession();
      return null;
    }

    return JSON.parse(sessionStr) as AuthSession;
  } catch (err) {
    console.warn("Failed to load session:", err);
    return null;
  }
}

/**
 * Clear session dari localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch (err) {
    console.warn("Failed to clear session:", err);
  }
}

/**
 * Simpan active panel ke localStorage
 */
export function saveActivePanel(panelId: string): void {
  try {
    localStorage.setItem(ACTIVE_PANEL_KEY, panelId);
  } catch (err) {
    console.warn("Failed to save active panel:", err);
  }
}

/**
 * Ambil active panel dari localStorage
 */
export function loadActivePanel(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PANEL_KEY);
  } catch (err) {
    console.warn("Failed to load active panel:", err);
    return null;
  }
}

/**
 * Clear active panel
 */
export function clearActivePanel(): void {
  try {
    localStorage.removeItem(ACTIVE_PANEL_KEY);
  } catch (err) {
    console.warn("Failed to clear active panel:", err);
  }
}
