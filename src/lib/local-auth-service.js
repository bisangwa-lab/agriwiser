import { hashPassword, randomToken, tokenHash, verifyPassword } from "./local-password.js";
import { QUICK_LOCAL_ACCOUNTS } from "./local-quick-login.js";

export const SESSION_SECONDS = 12 * 60 * 60;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const failure = (message, status = 400) => Object.assign(new Error(message), { status });

const publicUser = (row) => ({
  id: row.id, email: row.email, full_name: row.full_name,
  workspace_role: row.workspace_role, role: row.workspace_role === "super_admin" ? "admin" : "user",
  created_date: row.created_date,
});

export function validateAccount({ email, password, full_name = "" } = {}) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw failure("Enter a valid email address.");
  if (typeof password !== "string" || password.length < 12 || password.length > 128) throw failure("Use a password between 12 and 128 characters.");
  if (typeof full_name !== "string" || full_name.length > 100) throw failure("Use a name of 100 characters or fewer.");
  return { email: normalized, password, full_name: full_name.trim() || normalized.split("@")[0] };
}

export function createLocalAuthService(db, now = Date.now) {
  const statement = (sql, ...args) => db.prepare(sql).bind(...args);

  async function issueSession(user) {
    const token = randomToken();
    await statement("DELETE FROM local_sessions WHERE expires_at <= ?", now()).run();
    await statement("INSERT INTO local_sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
      await tokenHash(token), user.id, now() + SESSION_SECONDS * 1000).run();
    return { user: publicUser(user), token };
  }

  return {
    async quickLogin(accountKey, { enabled = false } = {}) {
      if (!enabled) throw failure("Quick sign-in is available only during local development.", 403);
      if (!Object.hasOwn(QUICK_LOCAL_ACCOUNTS, accountKey)) throw failure("Choose a listed local account.");
      const { email } = QUICK_LOCAL_ACCOUNTS[accountKey];
      const user = await statement("SELECT * FROM local_users WHERE email = ?", email).first();
      if (!user?.active) throw failure("This local account is not available. Use another account or sign in with your email.", 403);
      return issueSession(user);
    },

    async register(data) {
      if (!data || Object.keys(data).some((key) => !["email", "password", "full_name"].includes(key))) throw failure("Only name, email and password may be supplied.");
      const account = validateAccount(data);
      const user = { id: crypto.randomUUID(), email: account.email, full_name: account.full_name,
        workspace_role: "public_viewer", created_date: new Date(now()).toISOString() };
      const passwordHash = await hashPassword(account.password);
      try {
        await statement("INSERT INTO local_users(id,email,full_name,password_hash,workspace_role,created_date) VALUES(?,?,?,?,?,?)",
          user.id, user.email, user.full_name, passwordHash, user.workspace_role, user.created_date).run();
      } catch (error) {
        if (/unique|constraint/i.test(error.message ?? "")) throw failure("An account with this email already exists. Sign in instead.", 409);
        throw error;
      }
      return issueSession(user);
    },

    async login(data) {
      const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
      const password = data?.password;
      if (email.length > 254 || typeof password !== "string" || password.length > 128) throw failure("Invalid email or password", 401);
      const attempt = await statement("SELECT * FROM local_login_attempts WHERE email = ?", email).first();
      if (attempt && now() - attempt.window_start < ATTEMPT_WINDOW && attempt.failures >= 5) {
        throw failure("Too many sign-in attempts. Try again in 15 minutes.", 429);
      }
      if (attempt && now() - attempt.window_start >= ATTEMPT_WINDOW) {
        await statement("DELETE FROM local_login_attempts WHERE email = ?", email).run();
      }
      const user = await statement("SELECT * FROM local_users WHERE email = ?", email).first();
      const valid = await verifyPassword(password, user?.password_hash);
      if (!valid || !user?.active) {
        await statement("INSERT INTO local_login_attempts(email,failures,window_start) VALUES(?,1,?) ON CONFLICT(email) DO UPDATE SET failures=failures+1", email, now()).run();
        throw failure("Invalid email or password", 401);
      }
      await statement("DELETE FROM local_login_attempts WHERE email = ?", email).run();
      return issueSession(user);
    },

    async me(token) {
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw failure("Sign in to continue.", 401);
      const user = await statement("SELECT u.* FROM local_users u JOIN local_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
        await tokenHash(token), now()).first();
      if (!user) throw failure("Your session has expired. Sign in again.", 401);
      return publicUser(user);
    },

    async logout(token) {
      if (typeof token === "string") await statement("DELETE FROM local_sessions WHERE token_hash=?", await tokenHash(token)).run();
    },
  };
}
