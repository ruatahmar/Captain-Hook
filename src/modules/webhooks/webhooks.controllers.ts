import { Response, Request } from "express";
import prisma from "../../infra/db";
import ApiError from "../../utils/apiError";
import ApiResponse from "../../utils/apiResponse";
import asyncHandler from "../../utils/asyncHandler";

import { z } from "zod";
import { enqueueDeliveryQueue, enqueueEndpointVerificationQueue } from "../../jobs/jobs";

const webhookSchema = z.object({
    url: z.string().url(),
    secret: z.string().min(1),
    events: z.array(z.string().min(1)),
});
const eventParamsSchema = z.object({ eventType: z.string().min(1) });
const eventSchema = z.object({ payload: z.any() })

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
    const { url, secret, events } = webhookSchema.parse(req.body);

    const endpoint = await prisma.webhookEndpoint.create({
        data: {
            url,
            secret,
        },
        select: {
            id: true
        }
    })

    enqueueEndpointVerificationQueue({ id: endpoint.id, url, secret, events })

    return res.status(202)
        .json(
            new ApiResponse(202, {}, "Success")
        )
})

export const triggerEvent = asyncHandler(async (req: Request, res: Response) => {
    const { eventType } = eventParamsSchema.parse(req.params);
    const { payload } = eventSchema.parse(req.body);

    const event = await prisma.event.create({
        data: {
            eventType,
            payload
        },
        select: {
            id: true
        }
    })

    enqueueDeliveryQueue({ id: event.id, eventType })

    return res.status(202)
        .json(
            new ApiResponse(202, {}, "Event Accepted")
        )
});




// async function deliverWebhooks(event_type: string, payload: any) {
//     try {
//         const query = `
//         SELECT * FROM webhook_endpoints
//         WHERE event_type = $1 AND is_verified = TRUE AND enabled = TRUE
//     `
//         const subscribers = await pool.query(query, [event_type])
//         if (!subscribers) return

//         await Promise.all(subscribers.rows.map(async (sub) => {
//             try {
//                 const hmac = "placeholder for now"
//                 const res = await fetch(sub.url, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ payload, signature: hmac })
//                 })
//                 if (!res.ok) {
//                     //check failure_count >=10
//                 }
//                 // update failure_count / disable after threshold
//             } catch (err) {
//                 console.error(`Failed delivery to ${sub.url}:`, err);
//             }
//         }));
//         //parallel delivery to all subscribers
//         //auto retry logic
//         //Health monitoring and auto-disable after 10 failures
//     } catch (error) {
//         console.error(error)
//     }
// }