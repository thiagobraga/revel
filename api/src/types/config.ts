export interface Config {
    nodeEnv: 'development' | 'test' | 'production';
    port: number;
    databaseUrl: string;
    redisUrl: string;
    origin: string;
    csrfSecret: string;
    resendKey: string;
    emailFrom: string;
    sessionIdleMinutes: number;
    sessionAbsoluteHours: number;
}
