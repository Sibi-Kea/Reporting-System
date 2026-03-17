import { createHash, createHmac, randomBytes } from "crypto";

const qrSecret = process.env.QR_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? "worktrack-dev-qr-secret";

type QrPayload = {
  companyId: string;
  codeId: string;
  expiresAt: number;
  nonce: string;
};

export function hashQrToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSignedQrToken(payload: Omit<QrPayload, "nonce">) {
  const completePayload: QrPayload = {
    ...payload,
    nonce: randomBytes(12).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(completePayload)).toString("base64url");
  const signature = createHmac("sha256", qrSecret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifySignedQrToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", qrSecret).update(encodedPayload).digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8")) as QrPayload;
}
