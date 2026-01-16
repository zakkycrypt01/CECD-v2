/**
 * Performance Monitoring Service - Track and measure app performance
 */

import { loggerService } from './loggerService';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks = new Map<string, number>();
  private maxMetrics = 1000;
  private enableLogging = true;

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): void {
    if (typeof window === 'undefined' || !window.performance || !window.performance.now) {
      loggerService.warn('PerformanceMonitor', 'Performance API not available');
      return;
    }
    this.marks.set(name, performance.now());
    if (this.enableLogging) {
      loggerService.debug('PerformanceMonitor', `Measurement started: ${name}`);
    }
  }

  /**
   * End a performance measurement
   */
  endMeasure(name: string, metadata?: Record<string, any>): PerformanceMetric | null {
    if (typeof window === 'undefined' || !window.performance || !window.performance.now) {
      loggerService.warn('PerformanceMonitor', 'Performance API not available');
      return null;
    }

    const startTime = this.marks.get(name);

    if (!startTime) {
      loggerService.warn('PerformanceMonitor', `No start mark found for: ${name}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.marks.delete(name);

    if (this.enableLogging) {
      loggerService.debug('PerformanceMonitor', `Measurement ended: ${name} (${duration.toFixed(2)}ms)`);
    }

    // Log slow operations
    if (duration > 1000) {
      loggerService.warn('PerformanceMonitor', `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }

    return metric;
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMeasure(name);

    try {
      return await fn();
    } finally {
      this.endMeasure(name, metadata);
    }
  }

  /**
   * Measure sync operation
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startMeasure(name);

    try {
      return fn();
    } finally {
      this.endMeasure(name, metadata);
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) {
      return this.metrics.slice();
    }

    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average duration for operation
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetrics(name);

    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get statistics
   */
  getStats(name: string) {
    const metrics = this.getMetrics(name);

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const median = sortedDurations[Math.floor(sortedDurations.length / 2)];

    return {
      count: metrics.length,
      avg,
      min,
      max,
      median,
      total: durations.reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Get all operation stats
   */
  getAllStats() {
    const operations = new Set<string>();

    for (const metric of this.metrics) {
      operations.add(metric.name);
    }

    const stats: Record<string, any> = {};

    for (const op of operations) {
      stats[op] = this.getStats(op);
    }

    return stats;
  }

  /**
   * Get navigation timing
   */
  getNavigationTiming() {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    // Use PerformanceNavigationTiming (modern API) if available
    if (window.performance.getEntriesByType) {
      const navigationTiming = window.performance.getEntriesByType('navigation')[0] as any;
      if (navigationTiming) {
        return {
          pageLoadTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
          connectTime: navigationTiming.responseEnd - navigationTiming.requestStart,
          renderTime: navigationTiming.domComplete - navigationTiming.domLoading,
          domInteractiveTime: navigationTiming.domInteractive - navigationTiming.fetchStart
        };
      }
    }

    // Fallback to deprecated timing API
    try {
      if ((window.performance as any).timing) {
        const timing = (window.performance as any).timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const connectTime = timing.responseEnd - timing.requestStart;
        const renderTime = timing.domComplete - timing.domLoading;
        const domInteractiveTime = timing.domInteractive - timing.navigationStart;

        return {
          pageLoadTime,
          connectTime,
          renderTime,
          domInteractiveTime
        };
      }
    } catch (error) {
      loggerService.warn('PerformanceMonitor', 'Failed to get navigation timing', { error: (error as Error).message });
    }

    return null;
  }

  /**
   * Get memory usage (if available - Chrome only)
   */
  getMemoryUsage() {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    try {
      const perfMemory = (window.performance as any).memory;
      if (!perfMemory) {
        return null;
      }

      return {
        usedJSHeapSize: (perfMemory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (perfMemory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (perfMemory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };
    } catch (error) {
      loggerService.debug('PerformanceMonitor', 'Memory API not available in this browser');
      return null;
    }
  }

  /**
   * Get all performance data
   */
  getAllData() {
    return {
      metrics: this.metrics.slice(),
      navigation: this.getNavigationTiming(),
      memory: this.getMemoryUsage(),
      stats: this.getAllStats()
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
    loggerService.info('PerformanceMonitor', 'All metrics cleared');
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.getAllData(), null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Monitor page visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loggerService.debug('PerformanceMonitor', 'Page hidden');
    } else {
      loggerService.debug('PerformanceMonitor', 'Page visible');
    }
  });
}

// Monitor unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const data = performanceMonitor.getAllData();
    if (data.metrics.length > 0) {
      loggerService.info('PerformanceMonitor', 'Final metrics before unload', data);
    }
  });
}
