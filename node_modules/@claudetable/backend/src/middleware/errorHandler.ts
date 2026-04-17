import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ZodError) {
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

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: "NotFound",
    message: `Route ${req.method} ${req.path} not found`,
  });
}
