import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createRequire } from "module";

const keyLength = 64;
const requirePackage = createRequire(__filename);

export function hashPassword(password: string) {
  const bcrypt = loadBcrypt();
  if (bcrypt) {
    return bcrypt.hashSync(password, 12);
  }

  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, keyLength).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    const bcrypt = loadBcrypt();
    return bcrypt ? bcrypt.compareSync(password, stored) : false;
  }

  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function loadBcrypt(): { hashSync: (value: string, rounds: number) => string; compareSync: (value: string, hash: string) => boolean } | null {
  try {
    return requirePackage("bcryptjs") as {
      hashSync: (value: string, rounds: number) => string;
      compareSync: (value: string, hash: string) => boolean;
    };
  } catch {
    return null;
  }
}
