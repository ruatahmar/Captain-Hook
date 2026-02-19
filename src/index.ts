import express from "express"
import { createSubscription, getAllEndpoints, getDeliveriesByEndpoint, getDeliveriesByEvent, getSpecificEndpoint, manualRetry, triggerEvent } from "./modules/webhooks/webhooks.controllers";
import ApiError from "./utils/apiError";
import ApiResponse from "./utils/apiResponse";
import 'dotenv/config'
import { startWorkers } from "./workers";

const PORT = process.env.PORT || 8000
const app = express();

app.use(express.json());

//create webhook subscription
app.post('/webhooks', createSubscription)

//get deliveries
app.get('/webhooks/events/:eventId/deliveries', getDeliveriesByEvent)
app.get('/webhooks/endpoints/:endpointId/deliveries', getDeliveriesByEndpoint)

//get webhooks 
app.get('/webhooks/endpoints', getAllEndpoints)
app.get('/webhooks/endpoints/:endpointId', getSpecificEndpoint)

//manually retry failed webhook
app.post('/webhooks/:deliveryId/retry', manualRetry)

//trigger event
app.post('/events/trigger/:eventType', triggerEvent)

//global error handler 
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(
            new ApiResponse(err.statusCode, {}, err.message)
        )
    }
    return res.status(500).json(
        new ApiResponse(500, "Internal Service Error")
    )
})

//startup 
if (process.env.REDIS_HOST === undefined || process.env.REDIS_PORT === undefined) {
    console.error("Redis Connection not set")
    process.exit(1)
}
app.listen(PORT, () => {
    console.log("Listening on Port:", PORT)
})
startWorkers()