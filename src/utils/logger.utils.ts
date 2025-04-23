export class Logger {
    constructor(private readonly contextName: string) {}

    info(message: string, meta?: any): void {
        console.log(`[INFO] [${this.contextName}] ${message}`, meta ? meta : '');
    }

    error(message: string, error?: any): void {
        console.error(`[ERROR] [${this.contextName}] ${message}`, error ? error : '');
    }

    warn(message: string, meta?: any): void {
        console.warn(`[WARN] [${this.contextName}] ${message}`, meta ? meta : '');
    }

    debug(message: string, meta?: any): void {
        console.debug(`[DEBUG] [${this.contextName}] ${message}`, meta ? meta : '');
    }
}

// Shared logger instance for application modules and tests
export const logger = new Logger('App'); 