import type { SessionUser } from './domain.js';
declare global {
    namespace Express {
        interface Request {
            user?: SessionUser;
        }
    }
}
