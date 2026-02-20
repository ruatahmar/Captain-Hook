import express from "express"
import crypto from "crypto";

const app = express()
app.use(express.json());

const PORT = 8123
const YOUR_SECRET = "Bruh"

function verifyWebhook(
    secret: string,
    body: string,
    signature: string,
): boolean {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expected = hmac.digest("hex");

    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

app.post("/webhooks", (req, res) => {
    const signature = req.headers["x-webhook-signature"] as string;
    const { payload } = req.body;

    const isValid = verifyWebhook(
        YOUR_SECRET,
        JSON.stringify(req.body),
        signature,
    );

    if (!isValid) return res.status(401).send("Invalid signature");

    console.log("Payload:", payload)
    return res.sendStatus(200);
})

app.listen(PORT, () => {
    console.log("Subscriber listening on PORT:", PORT);
})