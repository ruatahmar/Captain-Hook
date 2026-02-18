// import { Redis } from "ioredis"

// let connection: Redis | null = null

// export function getRedis() {
//     if (!connection) {
//         connection = new Redis({
//             lazyConnect: true
//         })
//         connection.on("connect", () => console.log("Redis Connected"))
//         connection.on("error", (err) => console.log("Redis Error occured:", err))
//     }

//     return connection
// }