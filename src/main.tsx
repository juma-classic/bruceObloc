import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { TraderMasterLoader } from './components/loader/TraderMasterLoader';
import { derivAPIInitializer } from './services/deriv-api-initializer.service';
import { chunkErrorHandler } from './utils/chunk-error-handler';
import { networkTimeoutHandler } from './utils/network-timeout-handler';
import './styles/index.scss';

// Initialize error handlers immediately
console.log('🛡️ Error handlers initialized');

// Temporarily suppress findDOMNode warning from react-transition-group
// This will be resolved when the library updates to use refs instead of findDOMNode
// The warning doesn't affect functionality, just indicates deprecated API usage
if (process.env.NODE_ENV !== 'production') {
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) {
            return; // Suppress this specific warning in development
        }
        originalConsoleWarn.apply(console, args);
    };
}

// Lazy load non-critical scripts
const loadNonCriticalScripts = () => {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // Load SpeedBot API
            const speedBotScript = document.createElement('script');
            speedBotScript.src = '/signals/speedbot-api.js';
            speedBotScript.async = true;
            speedBotScript.onerror = () => {
                console.warn('⚠️ Failed to load SpeedBot API, continuing without it');
            };
            document.body.appendChild(speedBotScript);

            // Load analytics after initial render
            import('./utils/analytics')
                .then(({ AnalyticsInitializer }) => {
                    AnalyticsInitializer();
                })
                .catch(error => {
                    console.warn('⚠️ Failed to load analytics:', error);
                });
        });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
            const speedBotScript = document.createElement('script');
            speedBotScript.src = '/signals/speedbot-api.js';
            speedBotScript.async = true;
            speedBotScript.onerror = () => {
                console.warn('⚠️ Failed to load SpeedBot API, continuing without it');
            };
            document.body.appendChild(speedBotScript);

            import('./utils/analytics')
                .then(({ AnalyticsInitializer }) => {
                    AnalyticsInitializer();
                })
                .catch(error => {
                    console.warn('⚠️ Failed to load analytics:', error);
                });
        }, 100);
    }
};

function AppWrapper() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Initialize Deriv API with timeout handling
                console.log('🚀 Starting Deriv API initialization...');

                await networkTimeoutHandler
                    .withTimeout(
                        derivAPIInitializer.initialize(),
                        30000 // 30 second timeout
                    )
                    .catch(error => {
                        console.warn('⚠️ API initialization failed, will retry on demand:', error);
                    });

                // Minimal delay for smooth UX
                await new Promise(resolve => setTimeout(resolve, 300));
                setIsLoading(false);

                // Load non-critical scripts after app is ready
                loadNonCriticalScripts();
            } catch (error) {
                console.error('App initialization error:', error);
                setIsLoading(false);
            }
        };

        initializeApp();
    }, []);

    if (isLoading) {
        return <TraderMasterLoader onLoadComplete={() => setIsLoading(false)} duration={300} />;
    }

    return <AuthWrapper />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<AppWrapper />);
