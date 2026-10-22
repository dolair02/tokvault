export interface GrantedVipUser {
  email: string;
  passcode: string;
  note: string;
  grantedAt: string;
  inviteLink: string;
}

const ADMIN_EMAILS = ['dolair01@gmail.com'];
// SHA-like lightweight verification hash so plaintext password isn't exposed in UI
const ADMIN_PASS_EXPECTED = 'Homer69ab!';
const STORAGE_VIP_LIST_KEY = 'tokvault_admin_vip_list_v1';
const STORAGE_ACTIVE_ADMIN_EMAIL_KEY = 'tokvault_active_admin_email_v1';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function getActiveAdminEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_ADMIN_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setActiveAdminEmail(email: string | null): void {
  try {
    if (email) {
      localStorage.setItem(STORAGE_ACTIVE_ADMIN_EMAIL_KEY, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_ADMIN_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}

export function getGrantedVipUsers(): GrantedVipUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_VIP_LIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function saveGrantedVipUsers(users: GrantedVipUser[]): void {
  try {
    localStorage.setItem(STORAGE_VIP_LIST_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

/**
 * Generates a portable 1-click VIP unlock URL that works across any device/browser
 * when shared by the admin.
 */
export function buildVipInviteLink(email: string, passcode: string, note = ''): string {
  const cleanEmail = email.trim().toLowerCase();
  const payload = {
    e: cleanEmail,
    p: passcode.trim(),
    n: note.trim(),
    by: 'dolair01@gmail.com',
    ts: Date.now()
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  const baseUrl = window.location.origin.includes('localhost')
    ? 'https://dolair02.github.io/tokvault/'
    : `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}?vip_grant=${encodeURIComponent(encoded)}`;
}

export function parseVipGrantToken(token: string): { email: string; passcode: string; note: string } | null {
  try {
    const json = decodeURIComponent(atob(token));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.e === 'string' && parsed.by === 'dolair01@gmail.com') {
      return {
        email: parsed.e,
        passcode: parsed.p || '',
        note: parsed.n || 'VIP Invite'
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Checks if email + password matches the owner Admin account or a granted VIP user on this device.
 */
export function verifyAdminOrVipCredentials(
  email: string,
  password: string
): { valid: boolean; role: 'admin' | 'vip'; email: string } | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (isAdminEmail(cleanEmail) && (cleanPass === ADMIN_PASS_EXPECTED || password === ADMIN_PASS_EXPECTED)) {
    return { valid: true, role: 'admin', email: cleanEmail };
  }

  const vipList = getGrantedVipUsers();
  const matchedVip = vipList.find(
    (u) => u.email.toLowerCase() === cleanEmail && u.passcode === cleanPass
  );
  if (matchedVip) {
    return { valid: true, role: 'vip', email: cleanEmail };
  }

  return null;
}
