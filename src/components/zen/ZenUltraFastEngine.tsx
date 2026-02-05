/**
 * Zen Ultra-Fast Trading Engine
 * Optimized for maximum execution speed in every tick mode
 * Eliminates bottlenecks and implements advanced speed optimizations
 *
 * Enhanced with Tick-Driven Rule Engine for sophisticated trading logic
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TradeExecutor } from '@/engine/executor';
import { type RiskLimits, RiskManager } from '@/engine/riskManager';
import { RuleEngine, type TradeIntent, type TradeRule } from '@/engine/ruleEngine';
import { type DigitChangeEvent, TickStateManager } from '@/engine/tickState';
import { TradeQueue } from '@/engine/tradeQueue';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
// Import tick-driven engine components
import { DerivSocketService, type TickData } from '@/services/tick-driven/derivSocket';
import {
    type FastTradeRequest,
    type UltraFastConfig,
    zenUltraFastExecution,
} from '@/services/zen-ultra-fast-execution.service';

interface UltraFastStats {
    totalTrades: number;
    tradesPerSecond: number;
    avgExecutionTime: number;
    fastestExecution: number;
    slowestExecution: number;
    activeTrades: number;
    queuedTrades: number;
    priceChanges?: number;
    skippedDuplicates?: number;
    tradeEfficiency?: number; // Percentage of price changes that resulted in trades
    confirmationRate?: number; // Percentage of trades confirmed
    avgConfirmationTime?: number; // Average confirmation time
    pendingTrades?: number; // Number of pending confirmations
}

interface CentralizedMartingale {
    consecutiveLosses: number;
    martingaleStep: number;
    getCurrentStake: () => number;
}

interface ZenUltraFastEngineProps {
    settings: any;
    onTradeExecuted?: (transaction: any) => void;
    onStatsUpdate?: (stats: UltraFastStats) => void;
    onSpeedUpdate?: (speed: number) => void;
    centralizedMartingale?: CentralizedMartingale;
}

export const ZenUltraFastEngine = forwardRef<any, ZenUltraFastEngineProps>(
    ({ settings, onTradeExecuted, onStatsUpdate, onSpeedUpdate, centralizedMartingale }, ref) => {
        const [isActive, setIsActive] = useState(false);
        const [currentTick, setCurrentTick] = useState(0);
        const [stats, setStats] = useState<UltraFastStats>({
            totalTrades: 0,
            tradesPerSecond: 0,
            avgExecutionTime: 0,
            fastestExecution: 0,
            slowestExecution: 0,
            activeTrades: 0,
            queuedTrades: 0,
        });

        // Martingale state is now managed centrally in Zen page

        // Tick-driven engine state
        const [tickDrivenMode, setTickDrivenMode] = useState(false);
        const [tradeRules, setTradeRules] = useState<TradeRule[]>([]);
        const [tickStats, setTickStats] = useState({
            totalTicks: 0,
            digitChanges: 0,
            changeRate: 0,
            currentDigit: 0,
            queueSize: 0,
        });

        // Initialize tick-driven services
        const derivSocketRef = useRef<DerivSocketService | null>(null);
        const tickStateManagerRef = useRef<TickStateManager | null>(null);
        const ruleEngineRef = useRef<RuleEngine | null>(null);
        const tradeQueueRef = useRef<TradeQueue | null>(null);
        const riskManagerRef = useRef<RiskManager | null>(null);
        const tradeExecutorRef = useRef<TradeExecutor | null>(null);

        const tickSubscriptionRef = useRef<string | null>(null);
        const lastTickRef = useRef(0);
        const tradeTimestamps = useRef<number[]>([]);
        const speedMeasurementRef = useRef<NodeJS.Timeout | null>(null);

        /**
         * Calculate Martingale stake for ultra-fast trading
         */
        const calculateMartingaleStake = useCallback((): number => {
            // Use centralized Martingale if available
            if (centralizedMartingale && settings.enableMartingale) {
                const stake = centralizedMartingale.getCurrentStake();
                console.log('⚡ Ultra-Fast Using Centralized Martingale:', {
                    baseStake: settings.stake,
                    consecutiveLosses: centralizedMartingale.consecutiveLosses,
                    martingaleStep: centralizedMartingale.martingaleStep,
                    calculatedStake: stake,
                    enabled: settings.enableMartingale,
                });
                return stake;
            }

            // Fallback to base stake if no centralized Martingale
            console.log('⚡ Ultra-Fast Using Base Stake (no centralized Martingale):', {
                baseStake: settings.stake,
                enabled: settings.enableMartingale,
            });

            return settings.stake;
        }, [settings.stake, settings.enableMartingale, centralizedMartingale]);

        /**
         * Initialize tick-driven trading engine
         */
        const initializeTickDrivenEngine = useCallback(() => {
            console.log('🚀 Initializing tick-driven trading engine');

            // Validate market symbol before initialization
            if (!settings.market || settings.market === 'na' || settings.market === 'undefined' || settings.market === 'null') {
                console.error('❌ Invalid market symbol in settings:', settings.market);
                return;
            }

            // Initialize Deriv WebSocket service
            derivSocketRef.current = new DerivSocketService({
                symbol: settings.market,
                appId: '110800', // Use existing app ID
                reconnectInterval: 3000,
                heartbeatInterval: 30000,
            });

            // Initialize tick state manager
            tickStateManagerRef.current = new TickStateManager();

            // Initialize rule engine
            ruleEngineRef.current = new RuleEngine();

            // Initialize trade queue
            tradeQueueRef.current = new TradeQueue();

            // Initialize risk manager with conservative limits
            const riskLimits: RiskLimits = {
                maxTradesPerTick: settings.tradesPerPriceChange || 3,
                maxTradesPerMinute: 60,
                maxTradesPerHour: 300,
                cooldownBetweenTrades: 100, // 100ms cooldown
                maxConcurrentTrades: settings.maxConcurrentTrades || 5,
                maxDailyLoss: 100, // $100 daily loss limit
                maxStakePerTrade: 10, // $10 max stake per trade
                emergencyStopLoss: 200, // $200 emergency stop
            };
            riskManagerRef.current = new RiskManager(riskLimits);

            // Initialize simulated trade executor
            tradeExecutorRef.current = new TradeExecutor({
                simulationMode: true, // Always simulated for safety
                winRate: 0.5, // 50% win rate simulation
                payoutMultiplier: 1.9, // 1.9x payout
                executionDelay: { min: 50, max: 200 }, // 50-200ms execution delay
                errorRate: 0.05, // 5% error rate
            });

            // Set up event handlers
            setupTickDrivenEventHandlers();

            console.log('✅ Tick-driven engine initialized');
        }, [settings.market, settings.tradesPerPriceChange, settings.maxConcurrentTrades]);

        /**
         * Set up event handlers for tick-driven engine
         */
        const setupTickDrivenEventHandlers = useCallback(() => {
            if (
                !derivSocketRef.current ||
                !tickStateManagerRef.current ||
                !ruleEngineRef.current ||
                !tradeQueueRef.current
            ) {
                return;
            }

            // Handle tick data from WebSocket
            derivSocketRef.current.on('tick', (tickData: TickData) => {
                if (!tickStateManagerRef.current || !ruleEngineRef.current || !tradeQueueRef.current) {
                    return;
                }

                // Process tick through state manager
                const hasDigitChanged = tickStateManagerRef.current.processTick(tickData);

                // Update stats
                const stats = tickStateManagerRef.current.getStats();
                setTickStats({
                    totalTicks: stats.totalTicks,
                    digitChanges: stats.digitChanges,
                    changeRate: stats.changeRate,
                    currentDigit: stats.currentDigit,
                    queueSize: tradeQueueRef.current.getStats().currentQueueSize,
                });

                // If digit changed, check rules and generate trade intents
                if (hasDigitChanged) {
                    const digitChangeEvent: DigitChangeEvent = {
                        previousDigit: stats.previousDigit,
                        currentDigit: stats.currentDigit,
                        price: tickData.price,
                        timestamp: tickData.timestamp,
                        tickCount: stats.totalTicks,
                        digitChangeCount: stats.digitChanges,
                    };

                    // Generate trade intents based on rules
                    const tradeIntents = ruleEngineRef.current.processDigitChange(digitChangeEvent);

                    if (tradeIntents.length > 0) {
                        console.log(
                            `🎯 Generated ${tradeIntents.length} trade intents for digit ${stats.currentDigit}`
                        );

                        // Add intents to queue for processing
                        tradeQueueRef.current.enqueueBatch(tradeIntents);
                    }
                }
            });

            // Set up trade queue processor
            tradeQueueRef.current.setProcessor(async (intent: TradeIntent) => {
                if (!riskManagerRef.current || !tradeExecutorRef.current) {
                    throw new Error('Risk manager or executor not initialized');
                }

                // Check risk limits
                const riskCheck = riskManagerRef.current.canTrade(intent.stake);
                if (!riskCheck.allowed) {
                    console.log('🚫 Trade blocked by risk manager:', riskCheck.reason);
                    return;
                }

                // Record trade with risk manager
                riskManagerRef.current.recordTrade(intent.stake);

                // Execute trade (simulated)
                const result = await tradeExecutorRef.current.executeTradeIntent(intent);

                // Record completion with risk manager
                riskManagerRef.current.recordTradeCompletion(result.simulatedPnL);

                // Martingale state is now managed centrally in Zen page
                // No local state updates needed - handled by handleTradeExecuted callback

                // Notify parent component
                if (onTradeExecuted) {
                    const transaction = {
                        id: result.id,
                        contractId: result.id,
                        type: intent.contractType,
                        market: settings.market,
                        entryTick: intent.price,
                        stake: intent.stake,
                        timestamp: result.timestamp,
                        status: result.simulatedOutcome,
                        profit: result.simulatedPnL,
                        executionTime: result.executionTime,
                    };
                    onTradeExecuted(transaction);
                }
            });

            console.log('✅ Tick-driven event handlers set up');
        }, [settings.market, settings.martingaleMaxSteps, onTradeExecuted]);

        /**
         * Start tick-driven trading
         */
        const startTickDrivenTrading = useCallback(async () => {
            if (!derivSocketRef.current) {
                console.error('❌ Tick-driven engine not initialized');
                return;
            }

            try {
                console.log('🚀 Starting tick-driven trading');
                await derivSocketRef.current.connect();
                setTickDrivenMode(true);
                console.log('✅ Tick-driven trading started');
            } catch (error) {
                console.error('❌ Failed to start tick-driven trading:', error);
            }
        }, []);

        /**
         * Stop tick-driven trading
         */
        const stopTickDrivenTrading = useCallback(() => {
            console.log('🛑 Stopping tick-driven trading');

            if (derivSocketRef.current) {
                derivSocketRef.current.disconnect();
            }

            if (tradeQueueRef.current) {
                tradeQueueRef.current.clearQueue();
            }

            setTickDrivenMode(false);
            console.log('✅ Tick-driven trading stopped');
        }, []);

        /**
         * Add a new trading rule
         */
        const addTradeRule = useCallback((rule: TradeRule) => {
            if (!ruleEngineRef.current) {
                console.error('❌ Rule engine not initialized');
                return;
            }

            ruleEngineRef.current.addRule(rule);
            setTradeRules(prev => [...prev, rule]);
            console.log('✅ Trade rule added:', rule.name);
        }, []);

        /**
         * Remove a trading rule
         */
        const removeTradeRule = useCallback((ruleId: string) => {
            if (!ruleEngineRef.current) {
                console.error('❌ Rule engine not initialized');
                return;
            }

            ruleEngineRef.current.removeRule(ruleId);
            setTradeRules(prev => prev.filter(rule => rule.id !== ruleId));
            console.log('✅ Trade rule removed:', ruleId);
        }, []);

        /**
         * Toggle a trading rule
         */
        const toggleTradeRule = useCallback((ruleId: string, enabled: boolean) => {
            if (!ruleEngineRef.current) {
                console.error('❌ Rule engine not initialized');
                return;
            }

            ruleEngineRef.current.toggleRule(ruleId, enabled);
            setTradeRules(prev => prev.map(rule => (rule.id === ruleId ? { ...rule, enabled } : rule)));
            console.log(`✅ Trade rule ${enabled ? 'enabled' : 'disabled'}:`, ruleId);
        }, []);

        // Initialize tick-driven engine when component mounts
        useEffect(() => {
            initializeTickDrivenEngine();

            return () => {
                stopTickDrivenTrading();
            };
        }, [initializeTickDrivenEngine, stopTickDrivenTrading]);

        // Martingale reset is now handled centrally in Zen page

        // Ultra-fast configuration - Use actual settings from UI
        const ultraFastConfig: UltraFastConfig = {
            enabled: true,
            fireAndForget: settings.fireAndForget ?? true, // Maximum speed - don't wait for confirmations
            batchBalanceUpdates: settings.batchBalanceUpdates ?? true,
            balanceUpdateInterval: 10, // Update balance every 10 trades
            skipValidationChecks: false, // Keep some safety
            preCalculateStakes: settings.enableMartingale ?? true, // Enable if Martingale is enabled
            useWebSocketDirect: true,
            maxConcurrentTrades: settings.maxConcurrentTrades ?? 5, // Allow multiple trades in flight
            // Pass Martingale settings to the service
            martingaleSettings: {
                enabled: settings.enableMartingale ?? false,
                multiplier: settings.martingaleMultiplier ?? 2,
                maxSteps: settings.martingaleMaxSteps ?? 3,
                resetOnWin: settings.martingaleResetOnWin ?? true,
            },
        };

        useImperativeHandle(ref, () => ({
            start: handleStart,
            stop: handleStop,
            getStats: () => stats,
            isActive,
            // Tick-driven functionality
            startTickDriven: startTickDrivenTrading,
            stopTickDriven: stopTickDrivenTrading,
            addRule: addTradeRule,
            removeRule: removeTradeRule,
            toggleRule: toggleTradeRule,
            getTickStats: () => tickStats,
            getRules: () => tradeRules,
            isTickDrivenMode: () => tickDrivenMode,
        }));

        /**
         * Initialize ultra-fast execution
         */
        useEffect(() => {
            zenUltraFastExecution.initialize(ultraFastConfig);
            return () => {
                zenUltraFastExecution.setEnabled(false);
            };
        }, [ultraFastConfig]);

        /**
         * Subscribe to tick data for ultra-fast execution
         */
        useEffect(() => {
            if (!isActive || !settings.enableTickTrading) return;

            const subscribeToTicks = async () => {
                try {
                    console.log('⚡ Ultra-Fast: Subscribing to ticks for', settings.market);

                    const response = await api_base.api?.send({
                        ticks: settings.market,
                        subscribe: 1,
                    });

                    if (response?.subscription?.id) {
                        tickSubscriptionRef.current = response.subscription.id;
                        console.log('✅ Ultra-Fast: Tick subscription active:', response.subscription.id);
                    }
                } catch (error) {
                    console.error('❌ Ultra-Fast: Tick subscription failed:', error);
                }
            };

            subscribeToTicks();

            return () => {
                if (tickSubscriptionRef.current) {
                    api_base.api?.send({
                        forget: tickSubscriptionRef.current,
                    });
                    tickSubscriptionRef.current = null;
                }
            };
        }, [isActive, settings.market, settings.enableTickTrading]);

        /**
         * Execute ultra-fast trade
         */
        const executeUltraFastTrade = useCallback(
            async (tick: number) => {
                const startTime = performance.now();

                try {
                    // Calculate stake (including Martingale)
                    const tradeStake = calculateMartingaleStake();

                    // Build trade request
                    const tradeRequest: FastTradeRequest = {
                        contractType: getDerivContractType(settings.tradeType),
                        symbol: settings.market,
                        stake: tradeStake,
                        duration: settings.duration || 1,
                        barrier: getBarrierValue(),
                        timestamp: Date.now(),
                    };

                    console.log(`⚡ Executing ultra-fast trade:`, tradeRequest);

                    // Execute with ultra-fast service
                    const result = await zenUltraFastExecution.executeUltraFastTrade(tradeRequest);

                    const executionTime = performance.now() - startTime;
                    console.log(`⚡ Trade executed in ${executionTime.toFixed(2)}ms:`, result);

                    // Update speed metrics
                    updateSpeedMetrics(executionTime);

                    // Create transaction record (simplified for speed)
                    if (onTradeExecuted) {
                        const transaction = {
                            id: result.id,
                            contractId: result.contractId,
                            type: settings.tradeType,
                            market: settings.market,
                            entryTick: tick,
                            stake: tradeStake, // Use the actual Martingale stake
                            timestamp: Date.now(),
                            status: result.status,
                            executionTime: executionTime,
                        };

                        onTradeExecuted(transaction);
                    }

                    // Update stats
                    updateStats(executionTime);
                } catch (error) {
                    console.error('❌ Ultra-fast trade error:', error);
                }
            },
            [settings, onTradeExecuted, calculateMartingaleStake]
        );

        /**
         * Execute multiple trades per price change (Ultra-Fast Mode)
         */
        const executeMultipleTradesOnPriceChange = useCallback(
            async (tick: number) => {
                const tradesPerChange = settings.tradesPerPriceChange || 3;
                const interval = settings.ultraFastInterval || 50; // 50ms between trades

                console.log(`🚀 ULTRA-FAST MODE: Executing ${tradesPerChange} trades with ${interval}ms intervals`);

                for (let i = 0; i < tradesPerChange; i++) {
                    // Execute trade immediately for first one, then with intervals
                    if (i === 0) {
                        executeUltraFastTrade(tick);
                    } else {
                        setTimeout(() => {
                            executeUltraFastTrade(tick);
                        }, i * interval);
                    }

                    console.log(
                        `⚡ Ultra-Fast Trade ${i + 1}/${tradesPerChange} ${i === 0 ? 'executed immediately' : `scheduled in ${i * interval}ms`}`
                    );
                }
            },
            [settings, executeUltraFastTrade]
        );

        /**
         * Handle incoming tick data with ultra-fast execution - Trade on EVERY tick
         */
        useEffect(() => {
            if (!api_base.api || !isActive) return;

            console.log('⚡ Ultra-Fast: Setting up tick message listener...');

            const subscription = api_base.api.onMessage().subscribe((message: any) => {
                // Trade on EVERY tick when Ultra-Fast mode is active
                if (message.tick && message.tick.symbol === settings.market && isActive && settings.ultraFastMode) {
                    const tick = message.tick;
                    const newTick = tick.quote;
                    const tickTime = tick.epoch;

                    console.log(`⚡ ULTRA-FAST TICK: ${newTick} at ${new Date(tickTime * 1000).toLocaleTimeString()}`);
                    setCurrentTick(newTick);

                    // Execute multiple trades on EVERY tick (no conditions)
                    console.log(
                        `🚀 ULTRA-FAST MODE: Executing ${settings.tradesPerPriceChange || 3} trades on tick ${newTick}`
                    );
                    executeMultipleTradesOnPriceChange(newTick);

                    lastTickRef.current = newTick;
                }
            });

            return () => {
                console.log('🔌 Ultra-Fast: Cleanup message listener');
                subscription?.unsubscribe();
            };
        }, [isActive, settings.market, settings.ultraFastMode, executeMultipleTradesOnPriceChange]);

        /**
         * Update speed metrics
         */
        const updateSpeedMetrics = (executionTime: number) => {
            // Track trade timestamps for TPS calculation
            const now = Date.now();
            tradeTimestamps.current.push(now);

            // Keep only last 60 seconds of timestamps
            const oneMinuteAgo = now - 60000;
            tradeTimestamps.current = tradeTimestamps.current.filter(ts => ts > oneMinuteAgo);

            // Calculate trades per second
            const tradesPerSecond = tradeTimestamps.current.length / 60;

            // Update speed callback
            if (onSpeedUpdate) {
                onSpeedUpdate(tradesPerSecond);
            }

            console.log(`📊 Speed: ${tradesPerSecond.toFixed(2)} TPS, Execution: ${executionTime.toFixed(2)}ms`);
        };

        /**
         * Update statistics
         */
        const updateStats = (executionTime: number) => {
            setStats(prev => {
                const priceChangeStats = zenUltraFastExecution.getPriceChangeStats();
                const confirmationStats = zenUltraFastExecution.getConfirmationStats();
                const tradeEfficiency =
                    priceChangeStats.totalPriceChanges > 0
                        ? (priceChangeStats.tradesOnPriceChange / priceChangeStats.totalPriceChanges) * 100
                        : 0;

                const newStats = {
                    totalTrades: prev.totalTrades + 1,
                    tradesPerSecond: tradeTimestamps.current.length / 60,
                    avgExecutionTime:
                        (prev.avgExecutionTime * prev.totalTrades + executionTime) / (prev.totalTrades + 1),
                    fastestExecution: Math.min(prev.fastestExecution || Infinity, executionTime),
                    slowestExecution: Math.max(prev.slowestExecution, executionTime),
                    activeTrades: 0, // Will be updated from service
                    queuedTrades: 0, // Will be updated from service
                    priceChanges: priceChangeStats.tradesOnPriceChange,
                    skippedDuplicates: priceChangeStats.skippedDuplicates,
                    tradeEfficiency: tradeEfficiency,
                    confirmationRate: confirmationStats.confirmationRate,
                    avgConfirmationTime: confirmationStats.avgConfirmationTime,
                    pendingTrades: confirmationStats.pendingCount,
                };

                if (onStatsUpdate) {
                    onStatsUpdate(newStats);
                }

                return newStats;
            });
        };

        /**
         * Start ultra-fast trading
         */
        const handleStart = () => {
            console.log('🚀 Starting Ultra-Fast Trading Engine');

            setIsActive(true);
            zenUltraFastExecution.setEnabled(true);
            zenUltraFastExecution.resetStats();

            // Initialize tick reference
            lastTickRef.current = currentTick;

            // Start speed measurement
            speedMeasurementRef.current = setInterval(() => {
                const serviceStats = zenUltraFastExecution.getExecutionStats();
                console.log('⚡ Ultra-Fast Service Stats:', serviceStats);
            }, 5000);

            console.log('✅ Ultra-Fast Trading Engine started');
        };

        /**
         * Stop ultra-fast trading
         */
        const handleStop = () => {
            console.log('🛑 Stopping Ultra-Fast Trading Engine');

            setIsActive(false);
            zenUltraFastExecution.setEnabled(false);

            if (speedMeasurementRef.current) {
                clearInterval(speedMeasurementRef.current);
                speedMeasurementRef.current = null;
            }

            console.log('✅ Ultra-Fast Trading Engine stopped');
        };

        /**
         * Get Deriv contract type
         */
        const getDerivContractType = (tradeType: string): string => {
            const contractMap: Record<string, string> = {
                DIGITEVEN: 'DIGITEVEN',
                DIGITODD: 'DIGITODD',
                DIGITOVER: 'DIGITOVER',
                DIGITUNDER: 'DIGITUNDER',
                DIGITMATCHES: 'DIGITMATCHES',
                DIGITDIFFERS: 'DIGITDIFFERS',
                CALL: 'CALL',
                PUT: 'PUT',
            };
            return contractMap[tradeType] || 'DIGITEVEN';
        };

        /**
         * Get barrier value for contracts that need it
         */
        const getBarrierValue = (): string | undefined => {
            if (['DIGITOVER', 'DIGITUNDER'].includes(settings.tradeType)) {
                return settings.barrier?.toString() || '5';
            }
            if (['DIGITMATCHES', 'DIGITDIFFERS'].includes(settings.tradeType)) {
                return settings.prediction?.toString() || '5';
            }
            return undefined;
        };

        return (
            <div className='zen-ultra-fast-engine'>
                {/* Ultra-Fast Engine Status */}
                <div className='ultra-fast-status'>
                    <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
                        <span className='status-dot'></span>
                        <span>Ultra-Fast Engine: {isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>

                    {isActive && (
                        <div className='speed-metrics'>
                            <div className='metric'>
                                <span className='label'>TPS:</span>
                                <span className='value'>{stats.tradesPerSecond.toFixed(2)}</span>
                            </div>
                            <div className='metric'>
                                <span className='label'>Avg Exec:</span>
                                <span className='value'>{stats.avgExecutionTime.toFixed(2)}ms</span>
                            </div>
                            <div className='metric'>
                                <span className='label'>Fastest:</span>
                                <span className='value'>{stats.fastestExecution.toFixed(2)}ms</span>
                            </div>
                            <div className='metric'>
                                <span className='label'>Total:</span>
                                <span className='value'>{stats.totalTrades}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Indicators */}
                {isActive && (
                    <div className='performance-indicators'>
                        <div
                            className={`speed-indicator ${stats.tradesPerSecond > 1 ? 'fast' : stats.tradesPerSecond > 0.5 ? 'medium' : 'slow'}`}
                        >
                            {stats.tradesPerSecond > 1
                                ? '🚀 ULTRA FAST'
                                : stats.tradesPerSecond > 0.5
                                  ? '⚡ FAST'
                                  : '🐌 SLOW'}
                        </div>

                        <div
                            className={`execution-indicator ${stats.avgExecutionTime < 50 ? 'excellent' : stats.avgExecutionTime < 100 ? 'good' : 'slow'}`}
                        >
                            {stats.avgExecutionTime < 50
                                ? '🎯 EXCELLENT'
                                : stats.avgExecutionTime < 100
                                  ? '✅ GOOD'
                                  : '⚠️ SLOW'}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

ZenUltraFastEngine.displayName = 'ZenUltraFastEngine';
