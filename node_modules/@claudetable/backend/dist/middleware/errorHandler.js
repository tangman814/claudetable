"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
const zod_1 = require("zod");
function errorHandler(err, req, res, next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: "ValidationError",
            message: "Request validation failed",
            details: err.flatten(),
        });
        return;
    }
    if (err instanceof Error) {
        console.error(`[${req.method} ${req.path}]`, err.message);
        res.status(500).json({
            error: "InternalError",
            message: err.message,
        });
        return;
    }
    res.status(500).json({
        error: "UnknownError",
        message: "An unexpected error occurred",
    });
}
function notFound(req, res) {
    res.status(404).json({
        error: "NotFound",
        message: `Route ${req.method} ${req.path} not found`,
    });
}
