import express from "express"
import { createSubscription } from "./modules/webhooks/webhooks.controllers";
import ApiError from "./utils/apiError";
import ApiResponse from "./utils/apiResponse";


const app = express();

app.use(express.json());

// //create webhook subscription
app.post('/endpoint', createSubscription)


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