import express from "express"
import { createSubscription, getAllEndpoints, getAllEvents, getDeliveriesByEndpoint, getDeliveriesByEvent, getSpecificEndpoint, manualRetry, triggerEvent } from "./modules/webhooks/webhooks.controllers";
import ApiError from "./utils/apiError";
import ApiResponse from "./utils/apiResponse";
import 'dotenv/config'
import { startWorkers } from "./workers";
import { checkRedisConnection } from "./infra/redis";

const PORT = process.env.PORT || 8000
const app = express();

app.use(express.json());

//create webhook subscription
app.post('/webhooks', createSubscription)

app.post('/events/trigger/:eventType', triggerEvent)
app.get("/events", getAllEvents)

//get deliveries
app.get('/webhooks/events/:eventId/deliveries', getDeliveriesByEvent)
app.get('/webhooks/endpoints/:endpointId/deliveries', getDeliveriesByEndpoint)

//get webhooks 
app.get('/webhooks/endpoints', getAllEndpoints)
app.get('/webhooks/endpoints/:endpointId', getSpecificEndpoint)

//manually retry webhook with status != SUCCESS
app.post('/webhooks/:deliveryId/retry', manualRetry)



//global error handler 
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log("Global Error:", err)
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(
            new ApiResponse(err.statusCode, {}, err.message)
        )
    }
    return res.status(500).json(
        new ApiResponse(500, {}, "Internal Service Error")
    )
})

//startup 
async function startup() {
    await checkRedisConnection()
    app.listen(PORT, () => {
        console.log("Listening on Port:", PORT)
    })
    startWorkers()
}
startup()
