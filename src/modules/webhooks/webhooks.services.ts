import ApiError from "../../utils/apiError";
import crypto from "crypto"
import withTransaction from "../../utils/transactionWrapper";

function generateHmac(secret: string, payload: string) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload)
    return hmac.digest("hex");
}

export async function handleVerification(id: string, url: string, secret: string, events: string[]) {
    try {
        const payload = { url, events }
        const signature = generateHmac(secret, JSON.stringify(payload))
        //sends http for verification
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Signature": signature
            },
            body: JSON.stringify(payload)
        })
        if (!res.ok) throw new ApiError(400, `Verification failed with status ${res.status}`);

        await withTransaction(async (tx) => {
            await tx.webhookEndpoint.update({
                where: { id },
                data: { isVerified: true }
            })
            await tx.endpointSubscriptions.createMany({
                data: events.map(event => ({
                    endpointId: id,
                    eventType: event
                })),
                skipDuplicates: true
            })

        })
    } catch (error) {
        console.error("Webhook verification error:", error);
    }
}

export async function scheduleDeliveries(eventId: string, eventType: string) {
    await withTransaction(async (tx) => {
        const cursor = tx.endpointSubscriptions.findMany({
            where: {
                eventType,
                endpoint: {
                    isVerified: true
                }
            },
            select: {
                endpointId: true
            }
        })
        const deliveriesQueue = []
        const endpointIds: string[] = []

        for await (let endpoint of cursor) {
            deliveriesQueue.push();
            endpointIds.push(endpoint.endpointId);

            //batch writes
            if (deliveriesQueue.length >= 500) {
                //await enqueueJob in bulk
                await tx.deliveries.createMany({
                    data: endpointIds.map((endpoint: string) => ({
                        eventId,
                        endpointId: endpoint
                    })),
                    skipDuplicates: true
                })
                deliveriesQueue.length = 0
                endpointIds.length = 0
            }
        }

        if (deliveriesQueue.length > 0) {
            //await enqueueJob in bulk
            await tx.deliveries.createMany({
                data: endpointIds.map((endpoint: string) => ({
                    eventId,
                    endpointId: endpoint
                })),
                skipDuplicates: true
            })
        }

    })
};