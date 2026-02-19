/*
  Warnings:

  - A unique constraint covering the columns `[eventId,endpointId]` on the table `deliveries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "deliveries_eventId_endpointId_key" ON "deliveries"("eventId", "endpointId");
