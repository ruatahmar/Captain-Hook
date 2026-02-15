import { Response, Request } from "express";
import pool from "../../infra/db";
import ApiError from "../../utils/apiError";
import ApiResponse from "../../utils/apiResponse";
import asyncHandler from "../../utils/asyncHandler";
import { handleVerification } from "./webhooks.services";

import { z } from "zod";

const webhookSchema = z.object({
    url: z.string().url(),
    secret: z.string().min(1),
    events: z.array(z.string().min(1)),
});


export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
    const { url, secret, events } = webhookSchema.parse(req.body);

    const query = `
        INSERT INTO webhook_endpoints (url, secret, event)
        SELECT $1, $2, unnest($3::text[])
        RETURNING *
        `;
    const values = [url, secret, events];
    await pool.query(query, values);
    // Fire-and-forget verification
    handleVerification(url, secret, events)

    return res.status(202)
        .json(
            new ApiResponse(202, {}, "Success")
        )
})