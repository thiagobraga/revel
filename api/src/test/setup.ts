process.env.NODE_ENV = 'test';
if (process.env.TEST_DATABASE_URL)
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL ??= 'postgres://revel@127.0.0.1:55432/revel_test';
if (process.env.TEST_REDIS_URL)
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
process.env.REDIS_URL ??= 'redis://:revel-development-password@127.0.0.1:56379';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.CSRF_SECRET ??= 'test-csrf-secret-0123456789-abcdef';
