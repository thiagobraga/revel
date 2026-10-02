import {it,expect,vi} from 'vitest';
import {redis,redisPub,redisSub,connectRedis,closeRedis} from './redis.js';
import {logger} from '../utils/securityLogger.js';
it('connects idempotently, logs transport errors and closes all three clients',async()=>{
 const log=vi.spyOn(logger,'error');await connectRedis();await connectRedis();for(const client of [redis,redisPub,redisSub])client.emit('error',new Error('transport unavailable'));expect(log).toHaveBeenCalledTimes(3);await closeRedis();await closeRedis();expect(redis.isOpen).toBe(false);log.mockRestore();
});
