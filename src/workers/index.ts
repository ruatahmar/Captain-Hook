import startEndpointVerificationWorker from "./endpointVerification.worker";
import startScheduleDeliveriesWorker from "./scheduleDeliveries.worker";
import { startDeliveryWorker } from "./delivery.worker";

export function startWorkers() {
    startEndpointVerificationWorker();
    startScheduleDeliveriesWorker();
    startDeliveryWorker();
}