import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientEvents, ServerEvents, InterServerEvents, SocketData } from './types/socket.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config.js';
import { logger } from './utils/securityLogger.js';
import { AppError } from './utils/AppError.js';
import { originCheck, csrfCheck, sessionCookie } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { routes } from './routes/index.js';
import { redisPub, redisSub } from './db/redis.js';
import { authenticate } from './services/authService.js';
import { setSyncServer } from './services/syncService.js';
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(pinoHttp({ logger, customProps: req => ({ path: req.url.split('?')[0] }), genReqId: (_req, res) => {
            const id = randomUUID();
            res.setHeader('X-Request-ID', id);
            return id;
        } }));
    app.use(rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } } }));
    app.use(originCheck);
    app.use(express.json({ limit: '64kb' }));
    app.use(cookieParser());
    app.use(csrfCheck);
    app.use('/api/v1', routes);
    app.use(() => {
        throw new AppError(404, 'NOT_FOUND', 'Route not found');
    });
    app.use(errorHandler);
    return app;
}
export function createHttpServer() {
    const http = createServer(createApp());
    const io = new Server<ClientEvents, ServerEvents, InterServerEvents, SocketData>(http, { addTrailingSlash: false, cors: { origin: config.origin, credentials: true } });
    io.adapter(createAdapter(redisPub, redisSub));
    setSyncServer(io);
    io.use(async (socket, next) => {
        try {
            if (socket.handshake.headers.origin !== config.origin)
                throw new Error('Origin rejected');
            const cookies = cookieParser.JSONCookies(Object.fromEntries((socket.handshake.headers.cookie ?? '').split(';').map(c => {
                const i = c.indexOf('=');
                return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
            })));
            const token: unknown = cookies[sessionCookie];
            const user = await authenticate(typeof token === 'string' ? token : undefined);
            if (!user)
                throw new Error('Unauthenticated');
            socket.data.user = user;
            socket.data.token = token as string;
            next();
        }
        catch {
            next(new Error('Unauthenticated'));
        }
    });
    io.on('connection', socket => {
        const user = socket.data.user;
        void socket.join(['user:' + user.id, 'band:revel']);
        socket.use(async (_packet, next) => {
            if (!await authenticate(socket.data.token)) {
                socket.disconnect(true);
                return;
            }
            next();
        });
        const timer = setInterval(() => {
            void authenticate(socket.data.token, false).then(user => {
                if (!user)
                    socket.disconnect(true);
            }).catch(() => socket.disconnect(true));
        }, 15000);
        timer.unref();
        socket.on('disconnect', () => clearInterval(timer));
    });
    return { http, io };
}
