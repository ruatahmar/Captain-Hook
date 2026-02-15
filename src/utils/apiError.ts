class ApiError extends Error {
    statusCode: number
    constructor(
        status: number,
        message: string
    ) {
        super(message)
        this.statusCode = status
        this.message = message
    }
}

export default ApiError;