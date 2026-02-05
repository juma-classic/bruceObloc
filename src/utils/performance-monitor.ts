/**
 * Performance monitoring utilities for tracking component loading times
 */
import React from 'react';

interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private isEnabled: boolean;

    constructor() {
        // Only enable in development or when explicitly requested
        this.isEnabled = process.env.NODE_ENV === 'development' || 
                        localStorage.getItem('enable_performance_monitoring') === 'true';
    }

    /**
     * Start timing a performance metric
     */
    start(name: string): void {
        if (!this.isEnabled) return;

        this.metrics.set(name, {
            name,
            startTime: performance.now()
        });
    }

    /**
     * End timing a performance metric and log the result
     */
    end(name: string): number | null {
        if (!this.isEnabled) return null;

        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Performance metric "${name}" was not started`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        metric.endTime = endTime;
        metric.duration = duration;

        console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
        
        return duration;
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * Log a summary of all metrics
     */
    logSummary(): void {
        if (!this.isEnabled) return;

        const metrics = this.getMetrics().filter(m => m.duration !== undefined);
        
        if (metrics.length === 0) {
            console.log('📊 No performance metrics recorded');
            return;
        }

        console.group('📊 Performance Summary');
        metrics.forEach(metric => {
            console.log(`${metric.name}: ${metric.duration!.toFixed(2)}ms`);
        });
        console.groupEnd();
    }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for measuring component render performance
 */
export function usePerformanceMetric(name: string) {
    React.useEffect(() => {
        performanceMonitor.start(name);
        return () => {
            performanceMonitor.end(name);
        };
    }, [name]);
}

/**
 * Higher-order component for measuring component performance
 */
export function withPerformanceMonitoring<P extends object>(
    Component: React.ComponentType<P>,
    metricName?: string
) {
    const WrappedComponent = (props: P) => {
        const name = metricName || Component.displayName || Component.name || 'Unknown';
        
        React.useEffect(() => {
            performanceMonitor.start(`${name}_render`);
            return () => {
                performanceMonitor.end(`${name}_render`);
            };
        }, [name]);

        return React.createElement(Component, props);
    };

    WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
    
    return WrappedComponent;
}