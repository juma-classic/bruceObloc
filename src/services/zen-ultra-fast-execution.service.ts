/**
 * Zen Ultra-Fast Execution Service
 * Optimized for maximum speed in every tick trading
 * Eliminates bottlenecks and implements fire-and-forget execution
 */

import { api_base } from '@/external/bot-skeleton/services/api/api-base';

export interface UltraFastConfig {
    enabled: boolean;
    fireAndForget: boolean; // Don't wait for contract completion
    batchBalanceUpdates: boolean; // Update balance every N trades instead of every trade
    balanceUpdateInterval: number; // Update balance every N trades (default: 5)
    skipValidationChecks: boolean; // Skip some validation for speed
    preCalculateStakes: boolean; // Pre-calculate martingale stakes
    useWebSocketDirect: boolean; // Direct WebSocket for faster execution
    maxConcurrentTrades: number; // Allow multiple trades in flight
    martingaleSettings?: {
        enabled: boolean;
        multiplier: number;
        maxSteps: number;
        resetOnWin: boolean;
    };
}

export interface FastTradeRequest {
    contractType: string;
    symbol: string;
    stake: number;
    duration: number;
    barrier?: string;
    timestamp: number;
}

export interface FastTradeResult {
    id: string;
    contractId?: string;
    status: 'submitted' | 'confirmed' | 'error';
    timestamp: number;
    executionTime: number; // Time from request to submission
    error?: string;
}

class ZenUltraFastExecutionService {
    private config: UltraFastConfig = {
        enabled: false,
        fireAndForget: true,
        batchBalanceUpdates: true,
        balanceUpdateInterval: 5,
        skipValidationChecks: false,
        preCalculateStakes: true,
        useWebSocketDirect: true,
        maxConcurrentTrades: 3,
    };

    private tradeQueue: FastTradeRequest[] = [];
    private activeTrades: Map<string, FastTradeRequest> = new Map();
    private tradeCounter = 0;
    private lastBalanceUpdate = 0;
    private preCalculatedStakes: number[] = [];
    private executionStats = {
        totalTrades: 0,
        avgExecutionTime: 0,
        fastestExecution: Infinity,
        slowestExecution: 0,
    };

    private priceChangeStats = {
        totalPriceChanges: 0,
        tradesOnPriceChange: 0,
        skippedDuplicates: 0,
        lastPrice: 0,
        priceChangeHistory: [] as Array<{ from: number; to: number; timestamp: number; traded: boolean }>,
    };

    private confirmationStats = {
        tradesSubmitted: 0,
        tradesConfirmed: 0,
        tradesFailed: 0,
        confirmationRate: 0,
        avgConfirmationTime: 0,
        pendingTrades: new Map<string, { timestamp: number; price: number }>(),
    };

    /**
     * Initialize ultra-fast execution mode
     */
    public initialize(config: Partial<UltraFastConfig> = {}): void {
        this.config = { ...this.config, ...config };

        if (this.config.preCalculateStakes) {
            this.preCalculateMartingaleStakes();
        }

        console.log('⚡ Ultra-Fast Execution initialized:', this.config);
    }

    /**
     * Always trade on every tick - NO PRICE CHANGE DETECTION
     */
    public shouldTradeOnEveryTick(currentPrice: number): boolean {
        this.priceChangeStats.totalPriceChanges++;
        this.priceChangeStats.tradesOnPriceChange++;
        this.priceChangeStats.lastPrice = currentPrice;

        console.log(
            `⚡ EVERY TICK: Trading on tick ${currentPrice} (${this.priceChangeStats.tradesOnPriceChange} total trades)`
        );
        return true;
    }

    /**
     * Get price change statistics
     */
    public getPriceChangeStats() {
        return { ...this.priceChangeStats };
    }

    /**
     * Get trade confirmation statistics
     */
    public getConfirmationStats() {
        return {
            ...this.confirmationStats,
            pendingCount: this.confirmationStats.pendingTrades.size,
        };
    }

    /**
     * Execute trade with maximum speed optimization
     */
    public async executeUltraFastTrade(request: FastTradeRequest): Promise<FastTradeResult> {
        const startTime = performance.now();
        const tradeId = `fast_${Date.now()}_${++this.tradeCounter}`;

        try {
            // Skip validation checks if enabled for speed
            if (!this.config.skipValidationChecks) {
                const validationResult = await this.quickValidation(request);
                if (!validationResult.valid) {
                    return {
                        id: tradeId,
                        status: 'error',
                        timestamp: Date.now(),
                        executionTime: performance.now() - startTime,
                        error: validationResult.error,
                    };
                }
            }

            // For ultra-fast mode with multiple trades, allow higher concurrent limit
            const maxConcurrent = this.config.maxConcurrentTrades * 2; // Double the limit for ultra-fast

            // Check concurrent trade limit
            if (this.activeTrades.size >= maxConcurrent) {
                // Queue the trade instead of rejecting
                this.tradeQueue.push(request);
                console.log(
                    `📋 Ultra-Fast Trade queued (${this.tradeQueue.length} in queue, ${this.activeTrades.size} active)`
                );
                return {
                    id: tradeId,
                    status: 'submitted',
                    timestamp: Date.now(),
                    executionTime: performance.now() - startTime,
                };
            }

            // Add to active trades
            this.activeTrades.set(tradeId, request);

            // Build optimized parameters
            const parameters = this.buildOptimizedParameters(request);

            // Execute trade with fire-and-forget if enabled
            if (this.config.fireAndForget) {
                // Don't wait for response - maximum speed
                this.fireAndForgetExecution(tradeId, parameters);

                const executionTime = performance.now() - startTime;
                this.updateExecutionStats(executionTime);

                return {
                    id: tradeId,
                    status: 'submitted',
                    timestamp: Date.now(),
                    executionTime,
                };
            } else {
                // Wait for confirmation but with timeout
                const result = await this.executeWithTimeout(tradeId, parameters, 1000); // 1 second timeout

                const executionTime = performance.now() - startTime;
                this.updateExecutionStats(executionTime);

                return result;
            }
        } catch (error: any) {
            const executionTime = performance.now() - startTime;
            console.error('❌ Ultra-fast execution error:', error);

            return {
                id: tradeId,
                status: 'error',
                timestamp: Date.now(),
                executionTime,
                error: error.message,
            };
        } finally {
            // Clean up
            this.activeTrades.delete(tradeId);
            this.processQueue();
        }
    }

    /**
     * Execute multiple trades per price change for Ultra-Fast Mode
     */
    public async executeMultipleTradesOnPriceChange(
        request: FastTradeRequest,
        tradesCount: number = 3,
        intervalMs: number = 50
    ): Promise<FastTradeResult[]> {
        console.log(`🚀 ULTRA-FAST: Executing ${tradesCount} trades with ${intervalMs}ms intervals`);

        const results: FastTradeResult[] = [];
        const promises: Promise<FastTradeResult>[] = [];

        for (let i = 0; i < tradesCount; i++) {
            const tradeRequest = {
                ...request,
                timestamp: Date.now() + i * intervalMs, // Stagger timestamps
            };

            if (i === 0) {
                // Execute first trade immediately
                promises.push(this.executeUltraFastTrade(tradeRequest));
            } else {
                // Schedule subsequent trades with intervals
                const delayedPromise = new Promise<FastTradeResult>(resolve => {
                    setTimeout(async () => {
                        const result = await this.executeUltraFastTrade(tradeRequest);
                        resolve(result);
                    }, i * intervalMs);
                });
                promises.push(delayedPromise);
            }
        }

        // Wait for all trades to complete (or timeout)
        try {
            const allResults = await Promise.allSettled(promises);

            allResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    console.log(`✅ Ultra-Fast Trade ${index + 1}/${tradesCount} completed:`, result.value.id);
                } else {
                    console.error(`❌ Ultra-Fast Trade ${index + 1}/${tradesCount} failed:`, result.reason);
                    results.push({
                        id: `failed_${Date.now()}_${index}`,
                        status: 'error',
                        timestamp: Date.now(),
                        executionTime: 0,
                        error: result.reason?.message || 'Unknown error',
                    });
                }
            });
        } catch (error) {
            console.error('❌ Ultra-Fast multiple trades error:', error);
        }

        console.log(`🏁 Ultra-Fast batch completed: ${results.length}/${tradesCount} trades processed`);
        return results;
    }

    /**
     * Fire-and-forget execution for maximum speed - NO CONFIRMATION WAITING
     */
    private async fireAndForgetExecution(tradeId: string, parameters: any): Promise<void> {
        try {
            console.log(`⚡ INSTANT EXECUTION: ${tradeId} - NO WAITING`);

            // Send trade request and return immediately - NO CONFIRMATION TRACKING
            api_base.api?.send({
                buy: 1,
                price: parameters.amount,
                parameters,
            });

            // Log and return immediately
            console.log(`🚀 TRADE SENT: ${tradeId} - Fire and forget mode`);
        } catch (error) {
            console.error(`❌ Instant execution error: ${tradeId}`, error);
        }
    }

    /**
     * Execute with timeout for speed
     */
    private async executeWithTimeout(tradeId: string, parameters: any, timeoutMs: number): Promise<FastTradeResult> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Trade execution timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            api_base.api
                ?.send({
                    buy: 1,
                    price: parameters.amount,
                    parameters,
                })
                .then((response: any) => {
                    clearTimeout(timeout);

                    if (response?.buy?.contract_id) {
                        resolve({
                            id: tradeId,
                            contractId: response.buy.contract_id,
                            status: 'confirmed',
                            timestamp: Date.now(),
                            executionTime: 0, // Will be set by caller
                        });
                    } else {
                        resolve({
                            id: tradeId,
                            status: 'error',
                            timestamp: Date.now(),
                            executionTime: 0,
                            error: response?.error?.message || 'Unknown error',
                        });
                    }
                })
                .catch((error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Quick validation with minimal checks
     */
    private async quickValidation(request: FastTradeRequest): Promise<{ valid: boolean; error?: string }> {
        // Only essential validations for speed
        if (request.stake <= 0) {
            return { valid: false, error: 'Invalid stake amount' };
        }

        if (!request.symbol || !request.contractType) {
            return { valid: false, error: 'Missing required parameters' };
        }

        // Skip balance check if batch updates enabled and recent check
        if (this.config.batchBalanceUpdates && Date.now() - this.lastBalanceUpdate < 5000) {
            return { valid: true };
        }

        return { valid: true };
    }

    /**
     * Build optimized parameters object
     */
    private buildOptimizedParameters(request: FastTradeRequest): any {
        const parameters: any = {
            contract_type: request.contractType,
            symbol: request.symbol,
            duration: request.duration,
            duration_unit: 't',
            basis: 'stake',
            amount: request.stake,
            currency: 'USD', // Assume USD for speed, can be configurable
        };

        if (request.barrier) {
            parameters.barrier = request.barrier;
        }

        return parameters;
    }

    /**
     * Pre-calculate martingale stakes for speed
     */
    private preCalculateMartingaleStakes(): void {
        const baseStake = 1.0; // Will be multiplied by actual base
        const multiplier = this.config.martingaleSettings?.multiplier ?? 2.0;
        const maxSteps = this.config.martingaleSettings?.maxSteps ?? 10;

        this.preCalculatedStakes = [baseStake];

        for (let i = 1; i <= maxSteps; i++) {
            this.preCalculatedStakes.push(this.preCalculatedStakes[i - 1] * multiplier);
        }

        console.log('📊 Pre-calculated martingale stakes with settings:', {
            multiplier,
            maxSteps,
            enabled: this.config.martingaleSettings?.enabled,
            stakes: this.preCalculatedStakes
        });
    }

    /**
     * Get pre-calculated martingale stake
     */
    public getMartingaleStake(baseStake: number, step: number): number {
        if (step >= this.preCalculatedStakes.length) {
            step = this.preCalculatedStakes.length - 1;
        }
        return baseStake * this.preCalculatedStakes[step];
    }

    /**
     * Background contract tracking (non-blocking)
     */
    private async backgroundTrackContract(contractId: string): Promise<void> {
        // Track contract in background without blocking execution
        setTimeout(async () => {
            try {
                const response = await api_base.api?.send({
                    proposal_open_contract: 1,
                    contract_id: contractId,
                });

                if (response?.proposal_open_contract?.is_sold) {
                    console.log(`📊 Background tracking complete: ${contractId}`);
                }
            } catch (error) {
                console.error(`❌ Background tracking error: ${contractId}`, error);
            }
        }, 100); // Start tracking after 100ms
    }

    /**
     * Process queued trades
     */
    private processQueue(): void {
        if (this.tradeQueue.length > 0 && this.activeTrades.size < this.config.maxConcurrentTrades) {
            const nextTrade = this.tradeQueue.shift();
            if (nextTrade) {
                console.log(`📋 Processing queued trade (${this.tradeQueue.length} remaining)`);
                this.executeUltraFastTrade(nextTrade);
            }
        }
    }

    /**
     * Update execution statistics
     */
    private updateExecutionStats(executionTime: number): void {
        this.executionStats.totalTrades++;
        this.executionStats.avgExecutionTime =
            (this.executionStats.avgExecutionTime * (this.executionStats.totalTrades - 1) + executionTime) /
            this.executionStats.totalTrades;

        if (executionTime < this.executionStats.fastestExecution) {
            this.executionStats.fastestExecution = executionTime;
        }

        if (executionTime > this.executionStats.slowestExecution) {
            this.executionStats.slowestExecution = executionTime;
        }

        // Log performance every 10 trades
        if (this.executionStats.totalTrades % 10 === 0) {
            console.log('⚡ Ultra-Fast Execution Stats:', {
                totalTrades: this.executionStats.totalTrades,
                avgExecutionTime: `${this.executionStats.avgExecutionTime.toFixed(2)}ms`,
                fastestExecution: `${this.executionStats.fastestExecution.toFixed(2)}ms`,
                slowestExecution: `${this.executionStats.slowestExecution.toFixed(2)}ms`,
            });
        }
    }

    /**
     * Get current execution statistics
     */
    public getExecutionStats() {
        return { ...this.executionStats };
    }

    /**
     * Reset statistics
     */
    public resetStats(): void {
        this.executionStats = {
            totalTrades: 0,
            avgExecutionTime: 0,
            fastestExecution: Infinity,
            slowestExecution: 0,
        };
    }

    /**
     * Enable/disable ultra-fast mode
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        console.log(`⚡ Ultra-Fast Execution: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<UltraFastConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('⚡ Ultra-Fast config updated:', this.config);
    }
}

export const zenUltraFastExecution = new ZenUltraFastExecutionService();
