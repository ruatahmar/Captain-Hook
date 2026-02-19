import { Response, Request } from "express";
import prisma from "../../infra/db";
import ApiError from "../../utils/apiError";
import ApiResponse from "../../utils/apiResponse";
import asyncHandler from "../../utils/asyncHandler";
import { enqueueDeliveryQueue, enqueueEndpointVerificationQueue, enqueueScheduleDeliveriesQueue } from "../../jobs/jobs";
import { DeliveryStatus } from "../../../generated/prisma/enums";
import { webhookSchema, eventParamsSchema, eventSchema } from "./webhooks.schema";

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

    enqueueEndpointVerificationQueue({ endpointId: endpoint.id, url, secret, events })

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

    enqueueScheduleDeliveriesQueue({ eventId: event.id, eventType, payload })

    return res.status(202)
        .json(
            new ApiResponse(202, { eventId: event.id }, "Event Accepted")
        )
});

export const manualRetry = asyncHandler(async (req: Request, res: Response) => {
    const deliveryId = req.params.deliveryId as string;
    const delivery = await prisma.delivery.findFirst({
        where: {
            id: JSON.stringify(deliveryId),
        },
        include: {
            event: {
                select: {
                    eventType: true,
                    payload: true,
                }
            },
            endpoint: {
                select: {
                    url: true,
                    secret: true
                }
            }

        }
    }
    )
    if (!delivery) throw new ApiError(404, "Endpoint not found")
    if (delivery.status === DeliveryStatus.SUCCESS) {
        return res.status(400).json(new ApiResponse(400, {}, "Delivery already succeeded"))
    }

    const payload = [{
        endpointId: delivery?.endpointId,
        eventId: delivery?.eventId,
        payload: delivery?.event.payload,
        url: delivery?.endpoint.url,
        secret: delivery?.endpoint.secret
    }]
    enqueueDeliveryQueue(payload)
    return res.status(202)
        .json(
            new ApiResponse(202, {}, "Manual retry done")
        )
});

//gets: 
export const getDeliveriesByEvent = asyncHandler(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const deliveries = await prisma.delivery.findMany({
        where: {
            eventId: eventId,
        },
        select: {
            endpointId: true,
            status: true,
            responseCode: true,
            responseBody: true
        }
    })
    return res.status(200)
        .json(
            new ApiResponse(200, deliveries, "Data fetched.")
        )
});

export const getDeliveriesByEndpoint = asyncHandler(async (req: Request, res: Response) => {
    const endpointId = req.params.endpointId as string;
    const deliveries = await prisma.delivery.findMany({
        where: {
            endpointId: JSON.stringify(endpointId),
        },
        select: {
            endpointId: true,
            status: true,
            responseCode: true,
            responseBody: true
        }
    })
    return res.status(200)
        .json(
            new ApiResponse(200, deliveries, "Data fetched.")
        )
});

export const getAllEndpoints = asyncHandler(async (req: Request, res: Response) => {
    const endpoints = await prisma.webhookEndpoint.findMany({
        select: {
            id: true,
            url: true,
            secret: true,
            enabled: true,
            isVerified: true,
            createdAt: true
        }
    })
    return res.status(200)
        .json(
            new ApiResponse(200, endpoints, "Endpoints returned")
        )
});

export const getSpecificEndpoint = asyncHandler(async (req: Request, res: Response) => {
    const endpointId = req.params.endpointId as string;
    const endpoints = await prisma.webhookEndpoint.findUnique({
        where: {
            id: endpointId
        },
        select: {
            id: true,
            url: true,
            secret: true,
            enabled: true,
            isVerified: true,
            createdAt: true
        }
    })
    if (!endpoints) throw new ApiError(404, "Not Found")
    return res.status(200)
        .json(
            new ApiResponse(200, endpoints, "Endpoints returned")
        )
});
