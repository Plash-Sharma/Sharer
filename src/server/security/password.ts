import { hash, verify, Options } from "@node-rs/argon2";

const argonOptions: Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, argonOptions);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, argonOptions);
  } catch {
    return false;
  }
}
