import { Request, Response, NextFunction } from 'express';
import { AppError, errorResponse, ValidationError } from '../utils';
import config from '../config';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in development
  if (config.isDevelopment) {
    console.error('Error:', err);
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    const response = errorResponse(
      err.code,
      err.message,
      err instanceof ValidationError ? err.errors : undefined
    );

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const response = errorResponse(
    'INTERNAL_ERROR',
    config.isDevelopment ? err.message : 'An unexpected error occurred'
  );

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response = errorResponse(
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`
  );

  res.status(404).json(response);
}
