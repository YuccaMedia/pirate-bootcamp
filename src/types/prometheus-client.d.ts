declare module 'prometheus-client' {
    export class Counter {
        constructor(options: {
            name: string;
            help: string;
            labelNames?: string[];
        });
        inc(labels?: Record<string, string>, value?: number): void;
        labels(...labels: string[]): Counter;
    }

    export class Gauge {
        constructor(options: {
            name: string;
            help: string;
            labelNames?: string[];
        });
        set(labels: Record<string, string>, value: number): void;
        inc(labels?: Record<string, string>, value?: number): void;
        dec(labels?: Record<string, string>, value?: number): void;
        labels(...labels: string[]): Gauge;
    }

    export class Histogram {
        constructor(options: {
            name: string;
            help: string;
            labelNames?: string[];
            buckets?: number[];
        });
        observe(labels: Record<string, string>, value: number): void;
        labels(...labels: string[]): Histogram;
    }

    export class Summary {
        constructor(options: {
            name: string;
            help: string;
            labelNames?: string[];
            percentiles?: number[];
        });
        observe(labels: Record<string, string>, value: number): void;
        labels(...labels: string[]): Summary;
    }

    export function collectDefaultMetrics(options?: {
        prefix?: string;
        timeout?: number;
        register?: Registry;
    }): void;

    export const register: Registry;

    export interface Registry {
        metrics(): Promise<string>;
        registerMetric(metric: Counter | Gauge | Histogram | Summary): void;
        clear(): void;
    }
} 