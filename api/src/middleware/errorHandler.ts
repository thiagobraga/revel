import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/securityLogger.js';
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (error instanceof ZodError) {
        res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues.map(i => ({ path: i.path, message: i.message })) } });
        return;
    }
    if (error instanceof AppError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
        return;
    }
    if (error instanceof SyntaxError) {
        res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
        return;
    }
    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Request could not be completed' } });
}
