import crypto from "crypto"

export function generateHmac(secret: string, payload: string) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload)
    return hmac.digest("hex");
}
