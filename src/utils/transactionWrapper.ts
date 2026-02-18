import prisma from "../infra/db";
import { Prisma } from "@prisma/client/extension";


export default async function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return await prisma.$transaction(fn);
}
