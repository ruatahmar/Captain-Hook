import ApiError from "../../utils/apiError";
import crypto from "crypto"
import pool from "../../infra/db";

function generateHmac(secret: string, payload: string) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload)
    return hmac.digest("hex");
}

export async function handleVerification(url: string, secret: string, events: string[]) {
    try {
        const payload = JSON.stringify({ url, events })
        const hmac = generateHmac(secret, payload)
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload, signature: hmac })
        })
        if (!res.ok) throw new ApiError(400, `Verification failed with status ${res.status}`);
        const query = `
        UPDATE webhook_endpoints
        SET is_verified = TRUE
        WHERE url = $1 AND event = ANY($2::text[])
        `;
        const values = [url, events];
        await pool.query(query, values);
    } catch (error) {
        console.error("Webhook verification error:", error);
    }
}