/**
 * PATEL Bot Loader Service - FIXED TO ACTUALLY LOAD THE BOT
 * Loads the PATEL (with Entry).xml bot and actually opens it in Bot Builder
 */

class PatelBotLoaderService {
    private isLoading = false;

    /**
     * Load PATEL (with Entry).xml bot with digit-specific configuration
     * This will actually load the bot into Bot Builder, not just show notifications
     */
    async loadPatelBotForDigit(digit: number, market: string = 'R_50'): Promise<void> {
        if (this.isLoading) {
            console.log('🔄 PATEL bot loading already in progress...');
            return;
        }

        this.isLoading = true;
        const startTime = performance.now();

        try {
            console.log(`🎯 Loading PATEL (with Entry) bot for digit ${digit}...`);

            // Determine configuration based on digit as originally intended
            let predictionBeforeLoss = 8;
            let predictionAfterLoss = 6;
            let strategy = 'LOW_DIGITS';

            // Configure based on digit range (as originally specified)
            if (digit >= 0 && digit <= 4) {
                predictionBeforeLoss = 8;
                predictionAfterLoss = 6;
                strategy = 'LOW_DIGITS';
                console.log(`📊 Digit ${digit} (0-4): Using 8/6 configuration`);
            } else {
                predictionBeforeLoss = 1;
                predictionAfterLoss = 3;
                strategy = 'HIGH_DIGITS';
                console.log(`📊 Digit ${digit} (5-9): Using 1/3 configuration`);
            }

            // Event data for PATEL (with Entry) bot - COMPLETE DATA NEEDED FOR LOADING
            const eventData = {
                botFile: 'PATEL (with Entry).xml',
                botName: `PATEL Bot - Digit ${digit}`,
                market: market,
                contractType: 'both', // PATEL bot uses 'both' for over/under
                predictionBeforeLoss: predictionBeforeLoss,
                predictionAfterLoss: predictionAfterLoss,
                selectedDigit: digit,
                entryPointDigit: digit,
                strategy: strategy,
            };

            console.log(`🚀 Dispatching PATEL bot load event with complete data:`, eventData);

            // Dispatch the event for main.tsx to handle
            const loadEvent = new CustomEvent('LOAD_PATEL_BOT', {
                detail: eventData,
                bubbles: true,
                cancelable: true,
            });
            window.dispatchEvent(loadEvent);

            // Also send as postMessage for iframe compatibility
            if (window.parent !== window) {
                window.parent.postMessage(
                    {
                        type: 'LOAD_PATEL_BOT',
                        data: eventData,
                    },
                    '*'
                );
            }

            const loadTime = performance.now() - startTime;
            console.log(`✅ PATEL bot load event dispatched for digit ${digit} in ${loadTime.toFixed(0)}ms`);

            // Show success notification (but bot should actually load now)
            setTimeout(() => this.showPatelNotification(digit, strategy), 100);
        } catch (error) {
            console.error('❌ Failed to dispatch PATEL bot load event:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Success notification for PATEL bot
     */
    private showPatelNotification(digit: number, strategy: string): void {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            max-width: 320px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;

        const configDisplay = strategy === 'LOW_DIGITS' ? 'Before: 8, After: 6' : 'Before: 1, After: 3';
        const strategyDisplay = strategy === 'LOW_DIGITS' ? 'Low Digits (0-4)' : 'High Digits (5-9)';

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">🎯</div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        PATEL Bot Loading...
                    </div>
                    <div style="font-size: 12px; opacity: 0.9;">
                        Digit ${digit} • ${strategyDisplay}
                    </div>
                    <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
                        Entry Point: ${digit} | Config: ${configDisplay}
                    </div>
                </div>
            </div>
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds (shorter since bot should be loading)
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Check if currently loading
     */
    isCurrentlyLoading(): boolean {
        return this.isLoading;
    }
}

export const patelBotLoaderService = new PatelBotLoaderService();
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 0.875rem;
            transform: translateX(100%);
            transition: transform 0.2s ease-out;
            max-width: 300px;
        `;

        notification.innerHTML = `🎯 PATEL Bot Loaded for Digit ${digit}`;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        }, 3000);
    }

    /**
     * Get loading status
     */
    isCurrentlyLoading(): boolean {
        return this.isLoading;
    }
}

export const patelBotLoaderService = new PatelBotLoaderService();
