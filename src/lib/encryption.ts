import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const biometricSecret = process.env.BIOMETRIC_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET ?? "worktrack-dev-biometric-secret";
const key = createHash("sha256").update(biometricSecret).digest();

export function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify(value), "utf-8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptJson<T>(value: string) {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf-8")) as T;
}
