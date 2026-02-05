import { lazy } from 'react';

/**
 * Creates a lazy component with a minimum loading delay
 * @param importFn - The dynamic import function
 * @param minDelay - Minimum delay in milliseconds before the component can be loaded
 * @returns A lazy component that respects the minimum delay
 */
export function delayedLazy<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    minDelay: number = 1000
): React.LazyExoticComponent<T> {
    return lazy(async () => {
        const startTime = Date.now();
        
        const [moduleExports] = await Promise.all([
            importFn(),
            new Promise(resolve => {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minDelay - elapsedTime);
                setTimeout(resolve, remainingTime);
            })
        ]);
        
        return moduleExports;
    });
}