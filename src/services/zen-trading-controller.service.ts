/**
 * Zen Trading Controller Service
 *
 * This service provides a global interface for controlling zen page trading
 * from external sources like the Deriv Run button.
 */

export interface ZenTradingSettings {
    market: string;
    tradeType: string;
    stake: number;
    duration: number;
    barrier: string;
    prediction: number;
    stopLoss: number;
    takeProfit: number;
    maxConsecutiveLosses: number;
    delayBetweenTrades: number;
    enableMartingale: boolean;
    martingaleMultiplier: number;
    martingaleMaxSteps: number;
    ultraFastMode: boolean;
    enableTickTrading: boolean;
    maxConcurrentTrades: number;
    tradesPerPriceChange: number;
    ultraFastInterval: number;
    oneTradePerGesture: boolean;
    autoContinueOnLoss: boolean;
    switchOnLoss: boolean;
    switchMarket: boolean;
    rainMode: boolean;
    lossesToSwitch: number;
    rounds: number;
    targetTrades: number;
    dailyLossLimit: number;
}

export interface ZenTradingController {
    start: () => Promise<boolean>;
    stop: () => Promise<boolean>;
    reset: () => Promise<boolean>;
    getSettings: () => ZenTradingSettings | null;
    isRunning: () => boolean;
    getStatus: () => {
        isRunning: boolean;
        transactions: number;
        settings: ZenTradingSettings | null;
        mode: 'normal' | 'ultra-fast';
    };
}

class ZenTradingControllerService {
    private controller: ZenTradingController | null = null;
    private listeners: Array<(status: any) => void> = [];

    /**
     * Register the zen page controller
     */
    registerController(controller: ZenTradingController): void {
        this.controller = controller;
        console.log('🎯 Zen Trading Controller registered');
        this.notifyListeners();
    }

    /**
     * Unregister the zen page controller
     */
    unregisterController(): void {
        this.controller = null;
        console.log('🎯 Zen Trading Controller unregistered');
        this.notifyListeners();
    }

    /**
     * Start trading using zen page settings
     */
    async startTrading(): Promise<boolean> {
        if (!this.controller) {
            console.error('❌ Zen Trading Controller not available');
            return false;
        }

        try {
            const result = await this.controller.start();
            console.log('🚀 Zen trading started via external trigger:', result);
            this.notifyListeners();
            return result;
        } catch (error) {
            console.error('❌ Failed to start zen trading:', error);
            return false;
        }
    }

    /**
     * Stop trading
     */
    async stopTrading(): Promise<boolean> {
        if (!this.controller) {
            console.error('❌ Zen Trading Controller not available');
            return false;
        }

        try {
            const result = await this.controller.stop();
            console.log('🛑 Zen trading stopped via external trigger:', result);
            this.notifyListeners();
            return result;
        } catch (error) {
            console.error('❌ Failed to stop zen trading:', error);
            return false;
        }
    }

    /**
     * Reset trading state
     */
    async resetTrading(): Promise<boolean> {
        if (!this.controller) {
            console.error('❌ Zen Trading Controller not available');
            return false;
        }

        try {
            const result = await this.controller.reset();
            console.log('🔄 Zen trading reset via external trigger:', result);
            this.notifyListeners();
            return result;
        } catch (error) {
            console.error('❌ Failed to reset zen trading:', error);
            return false;
        }
    }

    /**
     * Get current zen trading settings
     */
    getSettings(): ZenTradingSettings | null {
        if (!this.controller) {
            return null;
        }
        return this.controller.getSettings();
    }

    /**
     * Check if zen trading is currently running
     */
    isRunning(): boolean {
        if (!this.controller) {
            return false;
        }
        return this.controller.isRunning();
    }

    /**
     * Get comprehensive status
     */
    getStatus() {
        if (!this.controller) {
            return {
                available: false,
                isRunning: false,
                transactions: 0,
                settings: null,
                mode: 'normal' as const,
            };
        }

        return {
            available: true,
            ...this.controller.getStatus(),
        };
    }

    /**
     * Check if zen page is available
     */
    isAvailable(): boolean {
        return this.controller !== null;
    }

    /**
     * Add status change listener
     */
    addStatusListener(callback: (status: any) => void): void {
        this.listeners.push(callback);
    }

    /**
     * Remove status change listener
     */
    removeStatusListener(callback: (status: any) => void): void {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    /**
     * Notify all listeners of status changes
     */
    private notifyListeners(): void {
        const status = this.getStatus();
        this.listeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('❌ Error in status listener:', error);
            }
        });
    }
}

// Export singleton instance
export const zenTradingController = new ZenTradingControllerService();

// Global access for Deriv integration
if (typeof window !== 'undefined') {
    (window as any).zenTradingController = zenTradingController;
}
