import { z } from "zod";

export const webhookSchema = z.object({
    url: z.string().url(),
    secret: z.string().min(1),
    events: z.array(z.string().min(1)),
});
export const eventParamsSchema = z.object({ eventType: z.string().min(1) });
export const eventSchema = z.object({ payload: z.any() })
