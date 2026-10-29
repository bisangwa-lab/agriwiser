import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { hashPassword, randomToken } from "../src/lib/local-password.js";
import { validateAccount } from "../src/lib/local-auth-service.js";
import { ROLE_BY_KEY } from "../src/lib/rbac.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(`--${name}`); return index < 0 ? undefined : args[index + 1]; };
const email = option("email");
if (!email) throw new Error("Usage: node scripts/local-account.js --email person@example.com [--role role] [--name Name] [--reset | --set-role]");
if (args.includes("--reset") && args.includes("--set-role")) throw new Error("Choose password reset or role assignment.");
if (args.includes("--set-role") && !option("role")) throw new Error("Supply --role when assigning a workspace.");
const role = option("role") ?? "public_viewer";
if (!ROLE_BY_KEY[role]) throw new Error("Unknown workspace role.");
const password = randomToken().slice(0, 24);
const account = validateAccount({ email, password, full_name: option("name") ?? "" });
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const encoded = await hashPassword(password);
const schema = await readFile(path.join(root, "migrations/0001_local_auth.sql"), "utf8");
const sql = args.includes("--set-role")
  ? `UPDATE local_users SET workspace_role=${quote(role)} WHERE email=${quote(account.email)};
     DELETE FROM local_sessions WHERE user_id IN (SELECT id FROM local_users WHERE email=${quote(account.email)});`
  : args.includes("--reset")
  ? `UPDATE local_users SET password_hash=${quote(encoded)} WHERE email=${quote(account.email)};
     DELETE FROM local_sessions WHERE user_id IN (SELECT id FROM local_users WHERE email=${quote(account.email)});`
  : `INSERT INTO local_users(id,email,full_name,password_hash,workspace_role,created_date)
     VALUES(${quote(crypto.randomUUID())},${quote(account.email)},${quote(account.full_name)},${quote(encoded)},${quote(role)},${quote(new Date().toISOString())});`;
const temp = path.resolve(root, `.local-account-${crypto.randomUUID()}.sql`);
if (!temp.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid temporary file path.");
try {
  await writeFile(temp, `${schema}\n${sql}\nSELECT email FROM local_users WHERE email=${quote(account.email)};`, { mode: 0o600 });
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "hingasmart-local-auth", "--local", "--json", "--file", temp],
    { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Local database update failed.");
  const output = JSON.parse(result.stdout);
  if (!output.some((entry) => entry.results?.some((row) => row.email === account.email))) throw new Error("No local account exists with this email.");
  process.stdout.write(JSON.stringify({ email: account.email, ...(args.includes("--set-role") ? { workspace_role: role } : { password, ...(args.includes("--reset") ? { passwordReset: true } : { workspace_role: role }) }) }) + "\n");
} finally {
  await unlink(temp);
}
