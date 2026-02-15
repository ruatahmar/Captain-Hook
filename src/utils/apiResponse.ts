class ApiResponse<T = unknown> {
    status: string
    data: T
    message: string
    constructor(
        statusCode: number,
        payload: T,
        message: string = "Success",
    ) {
        this.status = statusCode >= 200 ? "Success" : "Failure",
            this.data = payload
        this.message = message
    }
}

export default ApiResponse;