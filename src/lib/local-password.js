const ITERATIONS = 100_000;
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const unhex = (value) => Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, count, salt, expected] = (encoded ?? "").split("$");
  if (algorithm !== "pbkdf2-sha256" || Number(count) !== ITERATIONS || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{64}$/.test(expected ?? "")) {
    await derive(password, new Uint8Array(16), ITERATIONS);
    return false;
  }
  const actual = await derive(password, unhex(salt), ITERATIONS);
  const target = unhex(expected);
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ target[index];
  return difference === 0;
}

export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const tokenHash = async (token) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
