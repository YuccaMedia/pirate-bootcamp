/**
 * Mock Prometheus client for testing metrics
 */
export const mockPromClient = {
  Counter: jest.fn().mockImplementation(({ name, help, labelNames }) => ({
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
    name,
    help,
    labelNames
  })),
  
  Gauge: jest.fn().mockImplementation(({ name, help, labelNames }) => ({
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn(),
    setToCurrentTime: jest.fn(),
    labels: jest.fn().mockReturnThis(),
    name,
    help,
    labelNames
  })),
  
  Histogram: jest.fn().mockImplementation(({ name, help, labelNames, buckets }) => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(() => 1),
    labels: jest.fn().mockReturnThis(),
    name,
    help,
    labelNames,
    buckets
  })),
  
  Summary: jest.fn().mockImplementation(({ name, help, labelNames, percentiles }) => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(() => 1),
    labels: jest.fn().mockReturnThis(),
    name,
    help,
    labelNames,
    percentiles
  })),
  
  register: {
    metrics: jest.fn().mockReturnValue('metric1{label="value"} 1\nmetric2{label="value"} 2'),
    clear: jest.fn(),
    getMetricsAsJSON: jest.fn().mockReturnValue([
      { name: 'metric1', type: 'counter', help: 'help text', values: [{ labels: { label: 'value' }, value: 1 }] },
      { name: 'metric2', type: 'gauge', help: 'help text', values: [{ labels: { label: 'value' }, value: 2 }] }
    ]),
    registerMetric: jest.fn(),
    removeMetric: jest.fn(),
    resetMetrics: jest.fn(),
    contentType: 'text/plain; version=0.0.4; charset=utf-8'
  },
  
  collectDefaultMetrics: jest.fn()
}; 