/**
 * Enhanced Signal Processor Service
 * Unified signal processing and bot auto-loading system
 * Handles both Raziel (Hot/Cold Zone) and Patel (Distribution Deviation) signals
 */

import { unifiedBotManager, UnifiedBotParameters } from './unified-bot-manager.service';
import { HotColdZoneSignal } from './hot-cold-zone-scanner.service';
import { DigitDistributionSignal } from './digit-distribution-scanner.service';

export interface SignalProcessingResult {
    success: boolean;
    signalType: 'HOT_COLD_ZONE' | 'DISTRIBUTION_DEVIATION';
    botLoaded: 'RAZIEL' | 'PATEL';
    parameters: UnifiedBotParameters;
    loadTime: number;
    autoStarted: boolean;
    errors: string[];
}

export interface CustomBotSettings {
    stake: number;
    martingale: number;
}

class EnhancedSignalProcessorService {
    private processingQueue: Array<() => Promise<void>> = [];
    private isProcessing = false;
    private signalListeners: Array<(result: SignalProcessingResult) => void> = [];

    /**
     * Process Hot/Cold Zone signal and auto-load Raziel bot
     */
    public async processHotColdZoneSignal(
        signal: HotColdZoneSignal,
        customSettings?: CustomBotSettings,
        autoStart = true
    ): Promise<SignalProcessingResult> {
        
        console.log('🔥 Processing Hot/Cold Zone signal for Raziel bot...');
        const startTime = performance.now();
        
        const result: SignalProcessingResult = {
            success: false,
            signalType: 'HOT_COLD_ZONE',
            botLoaded: 'RAZIEL',
            parameters: {} as UnifiedBotParameters,
            loadTime: 0,
            autoStarted: false,
            errors: []
        };

        try {
            // Create unified parameters from signal
            const signalData = {
                action: signal.recommendation.action as 'OVER' | 'UNDER',
                market: signal.market,
                confidence: signal.confidence,
                targetDigit: signal.targetDigit,
                signalType: 'HOT_COLD_ZONE' as const,
                enhancedMode: (signal as any).longPressMode,
                enhancedPredictions: (signal as any).enhancedPredictions
            };

            const parameters = unifiedBotManager.createUnifiedParameters(signalData, customSettings);
            result.parameters = parameters;

            // Load Raziel bot with unified parameters
            const loadResult = await unifiedBotManager.loadBot('RAZIEL', parameters, autoStart);
            
            result.success = loadResult.success;
            result.loadTime = loadResult.loadTime;
            result.autoStarted = autoStart && loadResult.success;
            result.errors = loadResult.errors;

            if (loadResult.success) {
                console.log(`✅ Hot/Cold Zone signal processed successfully - Raziel bot loaded in ${loadResult.loadTime.toFixed(0)}ms`);
                this.showSignalProcessedNotification('HOT_COLD_ZONE', 'RAZIEL', signal.confidence);
            } else {
                console.error('❌ Failed to process Hot/Cold Zone signal:', loadResult.errors);
            }

            // Notify listeners
            this.notifySignalListeners(result);
            
            return result;

        } catch (error) {
            result.success = false;
            result.loadTime = performance.now() - startTime;
            result.errors.push((error as Error).message);
            
            console.error('❌ Hot/Cold Zone signal processing failed:', error);
            
            // Notify listeners of failure
            this.notifySignalListeners(result);
            
            throw error;
        }
    }

    /**
     * Process Distribution Deviation signal and auto-load Patel bot
     */
    public async processDistributionDeviationSignal(
        signal: DigitDistributionSignal,
        customSettings?: CustomBotSettings,
        autoStart = true
    ): Promise<SignalProcessingResult> {
        
        console.log('🎯 Processing Distribution Deviation signal for Patel bot...');
        const startTime = performance.now();
        
        const result: SignalProcessingResult = {
            success: false,
            signalType: 'DISTRIBUTION_DEVIATION',
            botLoaded: 'PATEL',
            parameters: {} as UnifiedBotParameters,
            loadTime: 0,
            autoStarted: false,
            errors: []
        };

        try {
            // Create unified parameters from signal
            const signalData = {
                action: signal.recommendation.action as 'OVER' | 'UNDER',
                market: signal.market,
                confidence: signal.confidence,
                targetDigit: signal.targetDigit,
                signalType: 'DISTRIBUTION_DEVIATION' as const,
                enhancedMode: (signal as any).longPressMode,
                enhancedPredictions: (signal as any).enhancedPredictions
            };

            const parameters = unifiedBotManager.createUnifiedParameters(signalData, customSettings);
            result.parameters = parameters;

            // Load Patel bot with unified parameters
            const loadResult = await unifiedBotManager.loadBot('PATEL', parameters, autoStart);
            
            result.success = loadResult.success;
            result.loadTime = loadResult.loadTime;
            result.autoStarted = autoStart && loadResult.success;
            result.errors = loadResult.errors;

            if (loadResult.success) {
                console.log(`✅ Distribution Deviation signal processed successfully - Patel bot loaded in ${loadResult.loadTime.toFixed(0)}ms`);
                this.showSignalProcessedNotification('DISTRIBUTION_DEVIATION', 'PATEL', signal.confidence);
            } else {
                console.error('❌ Failed to process Distribution Deviation signal:', loadResult.errors);
            }

            // Notify listeners
            this.notifySignalListeners(result);
            
            return result;

        } catch (error) {
            result.success = false;
            result.loadTime = performance.now() - startTime;
            result.errors.push((error as Error).message);
            
            console.error('❌ Distribution Deviation signal processing failed:', error);
            
            // Notify listeners of failure
            this.notifySignalListeners(result);
            
            throw error;
        }
    }

    /**
     * Queue signal processing to prevent conflicts
     */
    public async queueSignalProcessing(processor: () => Promise<SignalProcessingResult>): Promise<SignalProcessingResult> {
        return new Promise((resolve, reject) => {
            this.processingQueue.push(async () => {
                try {
                    const result = await processor();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            this.processQueue();
        });
    }

    /**
     * Process queued signals
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.processingQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.processingQueue.length > 0) {
            const processor = this.processingQueue.shift();
            if (processor) {
                try {
                    await processor();
                } catch (error) {
                    console.error('Queued signal processing failed:', error);
                }
            }
        }

        this.isProcessing = false;
    }

    /**
     * Show signal processed notification - DISABLED FOR CLIENT PRIVACY
     */
    private showSignalProcessedNotification(
        signalType: 'HOT_COLD_ZONE' | 'DISTRIBUTION_DEVIATION',
        botName: 'RAZIEL' | 'PATEL',
        confidence: number
    ): void {
        // Notifications disabled to protect trading strategy privacy
        return;
    }

    /**
     * Add signal processing listener
     */
    public addSignalListener(listener: (result: SignalProcessingResult) => void): void {
        this.signalListeners.push(listener);
    }

    /**
     * Remove signal processing listener
     */
    public removeSignalListener(listener: (result: SignalProcessingResult) => void): void {
        const index = this.signalListeners.indexOf(listener);
        if (index > -1) {
            this.signalListeners.splice(index, 1);
        }
    }

    /**
     * Notify signal listeners
     */
    private notifySignalListeners(result: SignalProcessingResult): void {
        this.signalListeners.forEach(listener => {
            try {
                listener(result);
            } catch (error) {
                console.error('Signal listener error:', error);
            }
        });
    }

    /**
     * Get processing status
     */
    public getProcessingStatus(): {
        isProcessing: boolean;
        queueLength: number;
    } {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.processingQueue.length
        };
    }

    /**
     * Clear processing queue
     */
    public clearQueue(): void {
        this.processingQueue.length = 0;
        console.log('🧹 Signal processing queue cleared');
    }
}

export const enhancedSignalProcessor = new EnhancedSignalProcessorService();