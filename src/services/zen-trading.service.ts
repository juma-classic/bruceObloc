/**
 * Zen Trading Service
 * Simplified, intuitive trading without complex analysis
 * Integrates with existing Deriv API infrastructure for real contract purchasing
 */

import { API_CONFIG, getWebSocketURL } from '../config/api-config';
import { calculateProfit, type ContractDetails } from '../utils/profit-calculator';
import { masterTradeIntegrationService } from './master-trade-integration.service';

export interface ZenTradeConfig {
    strategy: 'Even' | 'Odd' | 'Matches' | 'Differs' | 'Over' | 'Under' | 'Rise' | 'Fall' | 'Straddle6';
    market: string;
    stake: number;
    martingaleMultiplier: number;
    ticks: number;
    defaultDigit: number;
    switchOnLoss: boolean;
    switchMarket: boolean;
    mainMode: boolean;
    lossesToSwitch: number;
    rounds: number;
    takeProfit?: number;
    stopLoss?: number;
    delay: boolean;
    everyTickMode?: boolean;
    highPerformanceMode?: boolean; // Fast Lane performance features
    ultraFastExecution?: boolean; // Fire-and-forget mode

    // Enhanced Contract Switching Configuration
    contractSwitching?: {
        enabled: boolean;
        mode: 'rotation' | 'performance' | 'adaptive' | 'custom';
        customSequence?: string[];
        resetOnWin: boolean;
        maxSwitches: number;
        cooldownPeriod: number; // minutes
        performanceWindow: number; // number of trades to analyze
        excludeStrategies?: string[]; // strategies to skip in rotation
    };
}

export interface AdvancedZenConfig {
    // Risk Management
    dynamicPositionSizing: boolean;
    maxPositionSize: number;
    volatilityAdjustment: boolean;
    correlationLimit: number;
    drawdownProtection: boolean;
    maxDrawdownPercent: number;

    // Strategy Optimization
    multiStrategyMode: boolean;
    autoStrategySwitch: boolean;
    strategyPerformanceWindow: number;
    customStrategies: any[];

    // Market Analysis
    volatilityDetection: boolean;
    patternRecognition: boolean;
    sentimentAnalysis: boolean;
    marketCorrelationTracking: boolean;

    // Execution Controls
    smartOrderRouting: boolean;
    slippageProtection: boolean;
    maxSlippagePercent: number;
    executionDelayMs: number;

    // Performance Analytics
    realTimePnL: boolean;
    sharpeRatioTracking: boolean;
    drawdownMonitoring: boolean;
    timeBasedAnalytics: boolean;

    // Advanced Features
    debugMode: boolean;
    verboseLogging: boolean;
    performanceOptimization: boolean;
    experimentalFeatures: boolean;
}

export interface ZenTradeResult {
    id: string;
    timestamp: number;
    strategy: string;
    market: string;
    stake: number;
    contractType: string;
    duration: number;
    entrySpot?: number;
    exitSpot?: number;
    payout?: number;
    profit?: number;
    status: 'pending' | 'won' | 'lost' | 'cancelled' | 'error';
    contractId?: string;
    proposalId?: string;
    error?: string;
    buyPrice?: number;
    transactionId?: number;
}

export interface ContractTypePerformance {
    contractType: string;
    strategy: string;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgProfit: number;
    totalProfit: number;
    lastUsed: number;
    recentPerformance: boolean[]; // Last 10 trades (true = win, false = loss)
}

export interface ContractSwitchingStats {
    totalSwitches: number;
    switchesThisSession: number;
    lastSwitchTime: number;
    switchHistory: Array<{
        timestamp: number;
        from: string;
        to: string;
        reason: string;
        consecutiveLosses: number;
    }>;
    performanceByContract: ContractTypePerformance[];
    bestPerformingContract: string;
    currentSwitchCooldown: number;
}

export interface ZenTradingStats {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    currentStreak: number;
    bestStreak: number;
    worstStreak: number;
    strategiesUsed: string[];
    marketsTraded: string[];
    contractSwitching: ContractSwitchingStats;
}

class ZenTradingService {
    private config: ZenTradeConfig | null = null;
    private isRunning = false;
    private trades: ZenTradeResult[] = [];
    private currentTick: number | null = null;
    private tickHistory: number[] = [];
    private wsConnection: WebSocket | null = null;
    private currentStreak = 0;
    private consecutiveLosses = 0;
    private sessionProfit = 0;
    private initialBalance: number | null = null;
    private authToken: string | null = null;
    private appId: string;
    private requestId = 1;
    private pendingRequests = new Map<
        number,
        { resolve: (value: Record<string, unknown>) => void; reject: (reason?: unknown) => void }
    >();
    private callbacks: {
        onTick?: (tick: number) => void;
        onTrade?: (trade: ZenTradeResult) => void;
        onStatusChange?: (running: boolean) => void;
        onError?: (error: string) => void;
        onReset?: () => void;
        onContractSwitch?: (switchInfo: { from: string; to: string; reason: string }) => void;
    } = {};
    private advancedConfig: AdvancedZenConfig | null = null;
    private advancedFeaturesEnabled = false;
    private lastTradeTickIndex = -1;

    // Enhanced Contract Switching Properties
    private contractPerformance: Map<string, ContractTypePerformance> = new Map();
    private switchHistory: Array<{
        timestamp: number;
        from: string;
        to: string;
        reason: string;
        consecutiveLosses: number;
    }> = [];
    private lastSwitchTime = 0;
    private switchesThisSession = 0;
    private originalStrategy: string = '';
    private isInCooldown = false;

    // Fast Lane Performance Features
    private fireAndForgetMode = false;
    private aggressivePollingInterval: NodeJS.Timeout | null = null;
    private lastTickTime = Date.now();
    private pendingTrades = new Set<string>();
    private executionQueue: (() => Promise<void>)[] = [];
    private isProcessingQueue = false;

    constructor() {
        this.authToken = this.getStoredAuthToken();
        this.appId = this.getStoredAppId();

        // Start contract reconciliation system
        this.startContractReconciliation();

        // Initialize aggressive polling system (will activate when high performance mode is enabled)
        this.initializeAggressivePolling();
    }

    /**
     * Initialize zen trading with configuration
     */
    initialize(config: ZenTradeConfig) {
        this.config = config;
        this.originalStrategy = config.strategy; // Store original strategy for reset functionality
        this.resetSession();
    }

    /**
     * Start zen trading
     */
    async start(): Promise<void> {
        if (!this.config) {
            throw new Error('Zen trading not initialized');
        }

        if (this.isRunning) {
            return;
        }

        // Validate trading requirements first
        this.validateTradingRequirements();

        try {
            await this.connectToMarket();

            // Initialize balance tracking for automatic profit synchronization
            await this.initializeBalanceTracking();

            this.isRunning = true;
            this.callbacks.onStatusChange?.(true);

            console.log(`Zen Trading Started: ${this.config.strategy} on ${this.config.market}`);
        } catch (error) {
            this.callbacks.onError?.(`Failed to start trading: ${error}`);
            throw error;
        }
    }

    /**
     * Stop zen trading with performance cleanup
     */
    stop(): void {
        this.isRunning = false;
        this.disconnectFromMarket();
        this.callbacks.onStatusChange?.(false);

        // Cleanup performance features
        this.cleanupPerformanceFeatures();

        // Show stop notification with performance stats
        const performanceInfo = this.config?.highPerformanceMode
            ? ` | Mode: ${this.config.ultraFastExecution ? 'Ultra-Fast' : 'High-Performance'}`
            : '';

        console.log(
            `Zen Trading Stopped. Session P&L: ${this.sessionProfit >= 0 ? '+' : ''}${this.sessionProfit.toFixed(2)}${performanceInfo}`
        );
    }

    /**
     * Connect to market data stream using configured app ID
     */
    private async connectToMarket(): Promise<void> {
        if (!this.config) return;

        this.disconnectFromMarket();

        return new Promise((resolve, reject) => {
            // 🚀 SERVER SELECTION: Ensure consistent server usage
            const preferredServer = this.getPreferredServer();
            const wsUrl = getWebSocketURL(preferredServer, { app_id: this.appId });

            console.log(`🔌 Zen Trading connecting to: ${wsUrl}`);
            console.log(`📊 Server: ${preferredServer} | App ID: ${this.appId} | Guaranteed Consistency: ✅`);

            this.wsConnection = new WebSocket(wsUrl);

            this.wsConnection.onopen = async () => {
                console.log('✅ Zen Trading WebSocket connected');

                // Require authorization for trading
                if (!this.authToken) {
                    throw new Error('Authentication required. Please login to your Deriv account first.');
                }

                try {
                    await this.authorize();
                    console.log('✅ Zen Trading authorized');
                } catch (error) {
                    throw new Error(
                        `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }

                // Subscribe to ticks
                this.wsConnection?.send(
                    JSON.stringify({
                        ticks: this.config!.market,
                        subscribe: 1,
                        req_id: this.requestId++,
                    })
                );
                resolve();
            };

            this.wsConnection.onmessage = event => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.wsConnection.onerror = error => {
                console.error('❌ Zen Trading WebSocket error:', error);
                reject(error);
            };

            this.wsConnection.onclose = () => {
                console.log('🔌 Zen Trading WebSocket closed');
                if (this.isRunning) {
                    // Reconnect if still running
                    setTimeout(() => this.connectToMarket(), 2000);
                }
            };

            // Keep connection alive
            setInterval(() => {
                if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
                    this.wsConnection.send(JSON.stringify({ ping: 1 }));
                }
            }, 30000);
        });
    }

    /**
     * Disconnect from market data stream
     */
    private disconnectFromMarket(): void {
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
    }

    /**
     * Handle WebSocket messages
     */
    private handleWebSocketMessage(data: Record<string, unknown>): void {
        // Handle tick data
        if (data.tick && typeof data.tick === 'object' && data.tick !== null) {
            const tick = data.tick as Record<string, unknown>;
            if (typeof tick.quote === 'number') {
                this.handleTick(tick.quote);
            }
        }

        // Handle balance updates
        if (data.balance && typeof data.balance === 'object' && data.balance !== null) {
            const balance = data.balance as Record<string, unknown>;
            console.log('💰 Balance update received:', {
                balance: balance.balance,
                currency: balance.currency,
                sessionProfit: this.sessionProfit.toFixed(2),
                timestamp: new Date().toLocaleTimeString(),
            });
        }

        // Handle API responses
        if (data.req_id && typeof data.req_id === 'number' && this.pendingRequests.has(data.req_id)) {
            const { resolve, reject } = this.pendingRequests.get(data.req_id)!;
            this.pendingRequests.delete(data.req_id);

            if (data.error && typeof data.error === 'object' && data.error !== null) {
                const error = data.error as Record<string, unknown>;
                reject(new Error((error.message as string) || 'API Error'));
            } else {
                resolve(data);
            }
        }

        // Handle contract updates - can come as proposal_open_contract or direct contract data
        if (
            data.proposal_open_contract &&
            typeof data.proposal_open_contract === 'object' &&
            data.proposal_open_contract !== null
        ) {
            console.log('📊 Contract update received via proposal_open_contract:', data.proposal_open_contract);
            this.handleContractUpdate(data.proposal_open_contract as Record<string, unknown>);
        }

        // Also check for direct contract updates (some responses come this way)
        if (data.contract_id && (data.is_settled !== undefined || data.current_spot !== undefined)) {
            console.log('📊 Direct contract update received:', data);
            this.handleContractUpdate(data);
        }

        // Handle contract status updates that might come in different formats
        if (data.contract_status && typeof data.contract_status === 'object') {
            console.log('📊 Contract status update received:', data.contract_status);
            this.handleContractUpdate(data.contract_status as Record<string, unknown>);
        }

        // Log all WebSocket messages to debug missing contract updates
        if (data.msg_type) {
            console.log(`📡 WebSocket message type: ${data.msg_type}`, data);
        }
    }

    /**
     * Handle incoming tick data with Fast Lane performance optimizations
     */
    private handleTick(tick: number): void {
        this.currentTick = tick;
        this.tickHistory.push(tick);
        this.lastTickTime = Date.now();

        // Keep only last 100 ticks
        if (this.tickHistory.length > 100) {
            this.tickHistory.shift();
        }

        this.callbacks.onTick?.(tick);

        // Ultra-high frequency: Trade on every single tick if enabled
        const currentTickIndex = this.tickHistory.length - 1;

        // Enhanced debug logging for performance monitoring
        if (this.config?.everyTickMode) {
            console.log(
                `⚡ Ultra-Fast Tick ${currentTickIndex}: ${tick.toFixed(3)} | Last trade: ${this.lastTradeTickIndex} | Queue: ${this.executionQueue.length} | Pending: ${this.pendingTrades.size}`
            );
        }

        // Check if we should execute a trade with aggressive execution
        if (this.shouldExecuteTrade()) {
            console.log(`🚀 High-Speed Execution on tick ${currentTickIndex}`);

            // Fire-and-forget mode for ultra-fast execution
            if (this.fireAndForgetMode) {
                this.queueTradeExecution();
            } else {
                this.executeTrade();
            }
        }
    }

    /**
     * Determine if we should execute a trade with Fast Lane aggressive logic
     */
    private shouldExecuteTrade(): boolean {
        if (!this.config || !this.isRunning) return false;

        // Prevent duplicate trades on the same tick
        const currentTickIndex = this.tickHistory.length - 1;
        if (currentTickIndex <= this.lastTradeTickIndex) {
            return false;
        }

        // Ultra-high frequency: For every-tick mode, trade on every price movement
        if (this.config.everyTickMode || this.config.ticks === 1) {
            // Additional performance check: ensure we have a valid tick and not too many pending
            const canExecute = this.tickHistory.length > 0 && this.currentTick !== null && this.pendingTrades.size < 10; // Limit concurrent trades

            if (this.config.everyTickMode && canExecute) {
                console.log(
                    `⚡ Ultra-fast execution ready: Tick ${currentTickIndex}, Pending: ${this.pendingTrades.size}`
                );
            }

            return canExecute;
        }

        // For multi-tick contracts, wait for the specified number of ticks
        return this.tickHistory.length >= this.config.ticks;
    }

    /**
     * Execute a zen trade with Fast Lane performance optimizations
     */
    private async executeTrade(): Promise<void> {
        if (!this.config || !this.currentTick) return;

        // Validate we have authentication
        if (!this.authToken) {
            this.callbacks.onError?.('Authentication required to execute trades');
            return;
        }

        // Determine execution mode based on configuration
        const isHighPerformance = this.config.highPerformanceMode;
        const isUltraFast = this.config.ultraFastExecution && isHighPerformance;
        this.fireAndForgetMode = isUltraFast;

        console.log(
            `🚀 Zen execution mode: ${
                isUltraFast ? 'ULTRA-FAST (Fire-and-Forget)' : isHighPerformance ? 'HIGH-PERFORMANCE' : 'STANDARD'
            }`
        );

        // Handle Straddle6 strategy (dual trades)
        if (this.config.strategy === 'Straddle6') {
            await this.executeStraddleTrade();
            return;
        }

        // Regular single trade execution with performance optimization
        if (this.fireAndForgetMode) {
            // Ultra-fast: Fire-and-forget mode
            this.executeSingleTradeAsync().catch(error => {
                console.error('❌ Ultra-fast trade failed:', error);
                this.callbacks.onError?.(`Ultra-fast trade failed: ${error.message}`);
            });
        } else if (isHighPerformance) {
            // High-performance: Fast execution with monitoring
            this.queueTradeExecution();
        } else {
            // Standard execution: Wait for completion
            await this.executeSingleTrade();
        }
    }

    /**
     * Execute a single zen trade
     */
    private async executeSingleTrade(): Promise<void> {
        if (!this.config || !this.currentTick) return;

        const tradeId = `zen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const contractType = this.getContractType();
        const stake = this.calculateStake();

        // Validate trade parameters
        if (stake <= 0) {
            this.callbacks.onError?.('Invalid stake amount');
            return;
        }

        if (!this.config.market) {
            this.callbacks.onError?.('No market selected');
            return;
        }

        const trade: ZenTradeResult = {
            id: tradeId,
            timestamp: Date.now(),
            strategy: this.config.strategy,
            market: this.config.market,
            stake,
            contractType,
            duration: this.config.ticks,
            entrySpot: this.currentTick,
            status: 'pending',
        };

        console.log('🎯 Executing trade:', {
            strategy: trade.strategy,
            market: trade.market,
            contractType: trade.contractType,
            stake: trade.stake,
            duration: trade.duration,
            entrySpot: trade.entrySpot,
        });

        // Update last trade tick index to prevent duplicates
        this.lastTradeTickIndex = this.tickHistory.length - 1;

        this.trades.push(trade);
        this.callbacks.onTrade?.(trade);

        try {
            // Execute real trade using Deriv API
            await this.executeRealTrade(trade);
        } catch (error) {
            console.error('❌ Trade execution error:', error);
            trade.status = 'error';
            trade.error = error instanceof Error ? error.message : 'Unknown error';
            this.callbacks.onError?.(`Trade execution failed: ${trade.error}`);
            this.callbacks.onTrade?.(trade);
        }
    }

    /**
     * Execute Straddle6 strategy (Over 6 and Under 6 simultaneously)
     */
    private async executeStraddleTrade(): Promise<void> {
        if (!this.config || !this.currentTick) return;

        const baseStake = this.calculateStake() / 2; // Split stake between two trades
        const timestamp = Date.now();

        // Create Over 6 trade
        const overTrade: ZenTradeResult = {
            id: `zen_straddle_over_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp,
            strategy: 'Straddle6',
            market: this.config.market,
            stake: baseStake,
            contractType: 'DIGITOVER',
            duration: this.config.ticks,
            entrySpot: this.currentTick,
            status: 'pending',
        };

        // Create Under 6 trade
        const underTrade: ZenTradeResult = {
            id: `zen_straddle_under_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp,
            strategy: 'Straddle6',
            market: this.config.market,
            stake: baseStake,
            contractType: 'DIGITUNDER',
            duration: this.config.ticks,
            entrySpot: this.currentTick,
            status: 'pending',
        };

        console.log('🎯 Executing Straddle6 trades:', {
            overStake: baseStake,
            underStake: baseStake,
            totalStake: baseStake * 2,
            market: this.config.market,
            duration: this.config.ticks,
        });

        // Update last trade tick index to prevent duplicates
        this.lastTradeTickIndex = this.tickHistory.length - 1;

        // Add both trades to the list
        this.trades.push(overTrade, underTrade);
        this.callbacks.onTrade?.(overTrade);
        this.callbacks.onTrade?.(underTrade);

        try {
            // Execute both trades simultaneously
            const [overResult, underResult] = await Promise.allSettled([
                this.executeRealTrade(overTrade),
                this.executeRealTrade(underTrade),
            ]);

            // Handle any failures
            if (overResult.status === 'rejected') {
                console.error('❌ Over 6 trade failed:', overResult.reason);
                overTrade.status = 'error';
                overTrade.error = overResult.reason instanceof Error ? overResult.reason.message : 'Unknown error';
                this.callbacks.onTrade?.(overTrade);
            }

            if (underResult.status === 'rejected') {
                console.error('❌ Under 6 trade failed:', underResult.reason);
                underTrade.status = 'error';
                underTrade.error = underResult.reason instanceof Error ? underResult.reason.message : 'Unknown error';
                this.callbacks.onTrade?.(underTrade);
            }

            console.log('✅ Straddle6 trades executed successfully');
        } catch (error) {
            console.error('❌ Straddle6 execution error:', error);
            this.callbacks.onError?.(
                `Straddle6 execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Get contract type based on strategy
     */
    private getContractType(): string {
        if (!this.config) return 'CALL';

        // Use correct Deriv API contract type names
        const strategyMap: Record<string, string> = {
            Even: 'DIGITEVEN',
            Odd: 'DIGITODD',
            Matches: 'DIGITMATCH',
            Differs: 'DIGITDIFF',
            Over: 'DIGITOVER',
            Under: 'DIGITUNDER',
            Rise: 'CALL',
            Fall: 'PUT',
            Straddle6: 'DIGITOVER', // Default for straddle, but handled separately
        };

        const contractType = strategyMap[this.config.strategy] || 'CALL';
        console.log(`📊 Strategy: ${this.config.strategy} → Contract Type: ${contractType}`);

        return contractType;
    }

    /**
     * Calculate stake based on martingale and zen principles
     */
    private calculateStake(): number {
        if (!this.config) return 1;

        let stake = this.config.stake;

        // Apply martingale if enabled and we have consecutive losses
        if (this.consecutiveLosses > 0 && this.config.martingaleMultiplier > 1.0) {
            const originalStake = stake;
            stake = this.config.stake * Math.pow(this.config.martingaleMultiplier, this.consecutiveLosses);

            console.log(`🎯 MARTINGALE ACTIVE:`, {
                baseStake: this.config.stake,
                consecutiveLosses: this.consecutiveLosses,
                multiplier: this.config.martingaleMultiplier,
                calculatedStake: stake,
                increase: `${((stake / originalStake - 1) * 100).toFixed(1)}%`,
            });
        } else if (this.consecutiveLosses > 0) {
            console.log(
                `📊 Martingale disabled (multiplier: ${this.config.martingaleMultiplier}) - using base stake: ${stake}`
            );
        }

        // Apply advanced configuration adjustments (ONLY if advanced features are enabled)
        if (this.advancedConfig && this.advancedFeaturesEnabled) {
            console.log(`⚙️ ADVANCED CONFIG ACTIVE - Applying additional adjustments to martingale stake: ${stake}`);

            // Dynamic position sizing based on volatility
            if (this.advancedConfig.dynamicPositionSizing && this.advancedConfig.volatilityAdjustment) {
                const volatilityFactor = this.calculateVolatilityFactor();
                const originalStake = stake;
                stake = stake * volatilityFactor;
                console.log(
                    `📊 Volatility adjustment: ${originalStake} → ${stake} (factor: ${volatilityFactor.toFixed(3)})`
                );
            }

            // Apply maximum position size limit
            if (this.advancedConfig.maxPositionSize > 0) {
                const originalStake = stake;
                stake = Math.min(stake, this.advancedConfig.maxPositionSize);
                if (originalStake !== stake) {
                    console.log(
                        `🔒 Max position limit: ${originalStake} → ${stake} (limit: ${this.advancedConfig.maxPositionSize})`
                    );
                }
            }

            // Drawdown protection
            if (this.advancedConfig.drawdownProtection) {
                const drawdownPercent = (Math.abs(this.sessionProfit) / (this.config.stake * 100)) * 100;
                if (drawdownPercent > this.advancedConfig.maxDrawdownPercent / 2) {
                    const originalStake = stake;
                    stake = stake * 0.5; // Reduce stake by 50% when approaching max drawdown
                    console.log(
                        `🛡️ Drawdown protection: ${originalStake} → ${stake} (drawdown: ${drawdownPercent.toFixed(1)}%)`
                    );
                }
            }
        } else if (this.advancedConfig) {
            console.log(`⚙️ Advanced config exists but features disabled - using pure martingale`);
        }

        // Apply basic risk management (max 10x base stake or advanced config limit)
        const maxStake = this.advancedConfig?.maxPositionSize || this.config.stake * 10;
        stake = Math.min(stake, maxStake);

        // CRITICAL: Round to 2 decimal places for Deriv API compliance
        // Deriv API rejects stakes with more than 2 decimal places
        stake = Math.round(stake * 100) / 100;

        // Ensure minimum stake of 0.35 (Deriv's minimum for most markets)
        stake = Math.max(stake, 0.35);

        console.log(`💰 Calculated stake: ${stake.toFixed(2)} (rounded to 2 decimal places)`);

        return stake;
    }

    /**
     * Calculate volatility factor for dynamic position sizing
     */
    private calculateVolatilityFactor(): number {
        if (this.tickHistory.length < 10) return 1.0;

        // Calculate recent tick volatility (standard deviation of last 20 ticks)
        const recentTicks = this.tickHistory.slice(-20);
        const mean = recentTicks.reduce((sum, tick) => sum + tick, 0) / recentTicks.length;
        const variance = recentTicks.reduce((sum, tick) => sum + Math.pow(tick - mean, 2), 0) / recentTicks.length;
        const volatility = Math.sqrt(variance);

        // Normalize volatility to a factor between 0.5 and 1.5
        const normalizedVolatility = Math.max(0.5, Math.min(1.5, 1 - volatility * 0.1));

        console.log(`📊 Volatility factor: ${normalizedVolatility.toFixed(3)} (volatility: ${volatility.toFixed(6)})`);

        return normalizedVolatility;
    }

    /**
     * Initialize aggressive polling system for performance
     */
    private initializeAggressivePolling(): void {
        // Enhanced polling fallback for high-performance execution
        this.aggressivePollingInterval = setInterval(
            async () => {
                // Only activate aggressive polling in high performance mode
                if (!this.isRunning || !this.config?.highPerformanceMode) return;

                const now = Date.now();
                const timeSinceLastTick = now - this.lastTickTime;

                // Aggressive polling intervals based on mode
                const pollThreshold = this.config.ultraFastExecution ? 1500 : 3000; // 1.5s for ultra-fast, 3s for high-perf

                if (timeSinceLastTick > pollThreshold) {
                    console.log(
                        `⚡ Aggressive polling: No ticks for ${pollThreshold / 1000}s, fetching latest price...`
                    );
                    await this.pollLatestPrice();
                }
            },
            this.config?.ultraFastExecution ? 500 : 1000
        ); // Poll every 500ms for ultra-fast, 1s for high-perf
    }

    /**
     * Poll latest price as fallback mechanism
     */
    private async pollLatestPrice(): Promise<void> {
        if (!this.config || !this.wsConnection) return;

        try {
            const response = await this.sendRequest({
                ticks_history: this.config.market,
                count: 1,
                end: 'latest',
                req_id: this.requestId++,
            });

            if (response.history?.prices?.length > 0) {
                const latestPrice = response.history.prices[0];
                console.log('📊 Polled price:', latestPrice, 'vs current:', this.currentTick);

                if (latestPrice !== this.currentTick) {
                    console.log('⚡ POLLING TRIGGERED PRICE UPDATE!');
                    this.handleTick(latestPrice);
                }
            }
        } catch (error) {
            console.error('❌ Aggressive polling failed:', error);
        }
    }

    /**
     * Queue trade execution for fire-and-forget mode
     */
    private queueTradeExecution(): void {
        const tradeExecution = async () => {
            try {
                await this.executeSingleTrade();
            } catch (error) {
                console.error('❌ Queued trade execution failed:', error);
            }
        };

        this.executionQueue.push(tradeExecution);
        this.processExecutionQueue();
    }

    /**
     * Process execution queue for high-performance trading
     */
    private async processExecutionQueue(): Promise<void> {
        if (this.isProcessingQueue || this.executionQueue.length === 0) return;

        this.isProcessingQueue = true;
        console.log(`⚡ Processing execution queue: ${this.executionQueue.length} trades`);

        while (this.executionQueue.length > 0 && this.isRunning) {
            const execution = this.executionQueue.shift();
            if (execution) {
                // Execute without waiting (fire-and-forget)
                execution().catch(error => {
                    console.error('❌ Queue execution error:', error);
                });

                // Small delay to prevent API overload
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Async version of executeSingleTrade for fire-and-forget mode
     */
    private async executeSingleTradeAsync(): Promise<void> {
        if (!this.config || !this.currentTick) return;

        const tradeId = `zen_fast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const contractType = this.getContractType();
        const stake = this.calculateStake();

        // Quick validation
        if (stake <= 0 || !this.config.market) {
            console.error('❌ Fast trade validation failed');
            return;
        }

        const trade: ZenTradeResult = {
            id: tradeId,
            timestamp: Date.now(),
            strategy: this.config.strategy,
            market: this.config.market,
            stake,
            contractType,
            duration: this.config.ticks,
            entrySpot: this.currentTick,
            status: 'pending',
        };

        console.log('⚡ Fire-and-forget trade:', {
            strategy: trade.strategy,
            stake: trade.stake,
            entrySpot: trade.entrySpot,
        });

        // Update last trade tick index to prevent duplicates
        this.lastTradeTickIndex = this.tickHistory.length - 1;
        this.pendingTrades.add(tradeId);

        this.trades.push(trade);
        this.callbacks.onTrade?.(trade);

        try {
            // Execute with minimal monitoring for speed
            await this.executeRealTradeFast(trade);
        } catch (error) {
            console.error('❌ Fast trade execution error:', error);
            trade.status = 'error';
            trade.error = error instanceof Error ? error.message : 'Unknown error';
            this.callbacks.onTrade?.(trade);
        } finally {
            this.pendingTrades.delete(tradeId);
        }
    }

    /**
     * Fast version of executeRealTrade with minimal overhead
     */
    private async executeRealTradeFast(trade: ZenTradeResult): Promise<void> {
        try {
            console.log('⚡ Fast execution for:', trade.strategy, 'on', trade.market);

            // Step 1: Get proposal (streamlined)
            const proposal = await this.getProposal(trade);
            if (!proposal.id) {
                throw new Error('No proposal ID received');
            }

            trade.proposalId = proposal.id as string;

            // Step 2: Buy contract (fire-and-forget style)
            const buyResponse = await this.buyContract(proposal.id as string, trade.stake);

            if (buyResponse.buy && typeof buyResponse.buy === 'object') {
                const buyData = buyResponse.buy as Record<string, unknown>;
                trade.contractId = String(buyData.contract_id);
                trade.buyPrice = Number(buyData.buy_price);
                trade.payout = Number(buyData.payout);

                console.log(`⚡ Fast trade executed: Contract ${trade.contractId}`);

                // 🔗 COPY TRADING INTEGRATION: Execute copy trades for clients (fast mode)
                try {
                    console.log('🔗 Triggering copy trading for fast Zen trade...');
                    await masterTradeIntegrationService.onZenTrade({
                        market: trade.market,
                        contractType: trade.contractType,
                        stake: trade.stake,
                        duration: trade.duration,
                        durationUnit: 't',
                        strategy: trade.strategy,
                        contractId: trade.contractId,
                    });
                    console.log('✅ Copy trading executed successfully (fast mode)');
                } catch (copyError) {
                    console.error('❌ Copy trading failed (fast mode):', copyError);
                    // Don't fail the main trade if copy trading fails
                }

                // Minimal monitoring for fire-and-forget mode
                this.monitorContractFast(trade);
            } else {
                throw new Error('Invalid buy response');
            }
        } catch (error) {
            console.error('❌ Fast trade execution failed:', error);
            throw error;
        }
    }

    /**
     * Fast contract monitoring with aggressive polling
     */
    private monitorContractFast(trade: ZenTradeResult): void {
        if (!trade.contractId) return;

        console.log(`⚡ Fast monitoring for contract: ${trade.contractId}`);

        // Aggressive polling every 500ms for 10 seconds max
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds at 500ms intervals

        const fastPoll = setInterval(async () => {
            attempts++;

            if (attempts >= maxAttempts || trade.status !== 'pending') {
                clearInterval(fastPoll);
                return;
            }

            try {
                const statusResponse = await this.sendRequest({
                    proposal_open_contract: 1,
                    contract_id: parseInt(trade.contractId!),
                    req_id: this.requestId++,
                });

                if (statusResponse.proposal_open_contract) {
                    this.handleContractUpdate(statusResponse.proposal_open_contract as Record<string, unknown>);
                }
            } catch (error) {
                console.error(`❌ Fast poll failed for ${trade.contractId}:`, error);
            }
        }, 500); // Poll every 500ms for speed
    }

    /**
     * Cleanup performance features when stopping
     */
    private cleanupPerformanceFeatures(): void {
        // Clear aggressive polling
        if (this.aggressivePollingInterval) {
            clearInterval(this.aggressivePollingInterval);
            this.aggressivePollingInterval = null;
        }

        // Clear execution queue
        this.executionQueue = [];
        this.isProcessingQueue = false;
        this.pendingTrades.clear();
        this.fireAndForgetMode = false;

        console.log('🧹 Performance features cleaned up');
    }

    /**
     * Get performance statistics
     */
    public getPerformanceStats(): {
        mode: string;
        pendingTrades: number;
        queueLength: number;
        fireAndForgetMode: boolean;
        aggressivePolling: boolean;
    } {
        return {
            mode: this.config?.ultraFastExecution
                ? 'Ultra-Fast'
                : this.config?.highPerformanceMode
                  ? 'High-Performance'
                  : 'Standard',
            pendingTrades: this.pendingTrades.size,
            queueLength: this.executionQueue.length,
            fireAndForgetMode: this.fireAndForgetMode,
            aggressivePolling: !!this.aggressivePollingInterval,
        };
    }

    /**
     * Request balance update from Deriv API
     */
    private async requestBalanceUpdate(): Promise<void> {
        try {
            if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
                const balanceRequest = {
                    balance: 1,
                    subscribe: 1,
                    req_id: this.requestId++,
                };

                console.log('💰 Requesting balance update from Deriv API...');
                this.wsConnection.send(JSON.stringify(balanceRequest));
            }
        } catch (error) {
            console.error('❌ Failed to request balance update:', error);
        }
    }

    /**
     * Update configuration with performance mode changes
     */
    public updateConfig(newConfig: Partial<ZenTradeConfig>): void {
        if (this.config) {
            this.config = { ...this.config, ...newConfig };

            // Restart aggressive polling if performance mode changed
            if (newConfig.highPerformanceMode !== undefined) {
                this.cleanupPerformanceFeatures();
                if (newConfig.highPerformanceMode) {
                    this.initializeAggressivePolling();
                }
            }

            console.log('⚙️ Zen config updated:', newConfig);
        }
    }

    /**
     * Execute real trade using Deriv API
     */
    private async executeRealTrade(trade: ZenTradeResult): Promise<void> {
        try {
            console.log('🚀 Starting trade execution for:', trade.strategy, 'on', trade.market);

            // Step 1: Get proposal
            const proposal = await this.getProposal(trade);
            if (typeof proposal.id === 'string') {
                trade.proposalId = proposal.id;
                console.log('📋 Proposal ID received:', proposal.id);
            } else {
                throw new Error('No proposal ID received from Deriv API');
            }

            // Step 2: Buy contract
            const buyResponse = await this.buyContract(proposal.id as string, trade.stake);

            if (buyResponse.buy && typeof buyResponse.buy === 'object') {
                const buyData = buyResponse.buy as Record<string, unknown>;
                trade.contractId = String(buyData.contract_id);
                trade.buyPrice = Number(buyData.buy_price);
                trade.transactionId = Number(buyData.transaction_id);
                trade.payout = Number(buyData.payout);

                console.log(
                    `✅ Zen Trade executed: Contract ${trade.contractId} for ${trade.stake} ${this.getCurrency()}`
                );

                // 🔗 COPY TRADING INTEGRATION: Execute copy trades for clients
                try {
                    console.log('🔗 Triggering copy trading for Zen trade...');
                    await masterTradeIntegrationService.onZenTrade({
                        market: trade.market,
                        contractType: trade.contractType,
                        stake: trade.stake,
                        duration: trade.duration,
                        durationUnit: 't',
                        strategy: trade.strategy,
                        contractId: trade.contractId,
                    });
                    console.log('✅ Copy trading executed successfully');
                } catch (copyError) {
                    console.error('❌ Copy trading failed:', copyError);
                    // Don't fail the main trade if copy trading fails
                }
            } else {
                throw new Error('Invalid buy response from Deriv API');
            }

            // Step 3: Monitor contract result
            this.monitorContract(trade);

            // Step 4: Set up periodic status checks for contract settlement
            this.setupContractStatusChecking(trade);
        } catch (error) {
            console.error('❌ Zen Trade execution failed:', error);

            // Handle specific error cases
            if (error instanceof Error) {
                if (error.message.includes('InsufficientBalance')) {
                    trade.error = 'Insufficient balance to place trade';
                } else if (error.message.includes('InvalidSymbol')) {
                    trade.error = 'Invalid market symbol';
                } else if (error.message.includes('MarketIsClosed')) {
                    trade.error = 'Market is currently closed';
                } else if (error.message.includes('InvalidContractType')) {
                    trade.error = 'Invalid contract type for this market';
                } else {
                    trade.error = error.message;
                }
            } else {
                trade.error = 'Unknown trading error';
            }

            trade.status = 'error';
            this.callbacks.onTrade?.(trade);
            throw error;
        }
    }

    /**
     * Get contract proposal from Deriv API
     */
    private async getProposal(trade: ZenTradeResult): Promise<Record<string, unknown>> {
        // Ensure stake is properly formatted to 2 decimal places
        const formattedStake = Math.round(trade.stake * 100) / 100;

        const proposalRequest: Record<string, unknown> = {
            proposal: 1,
            amount: formattedStake,
            basis: 'stake',
            contract_type: trade.contractType,
            currency: this.getCurrency(),
            duration: trade.duration,
            duration_unit: 't', // ticks
            symbol: trade.market,
            req_id: this.requestId++,
        };

        // Add barrier for digit trades that need it
        if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(trade.contractType)) {
            // For Straddle6, always use digit 6
            if (trade.strategy === 'Straddle6') {
                proposalRequest.barrier = '6';
            } else {
                proposalRequest.barrier = this.config!.defaultDigit.toString();
            }
        }

        console.log('📋 Sending proposal request:', proposalRequest);

        const response = await this.sendRequest(proposalRequest);
        console.log('📋 Proposal response:', response);

        if (response.proposal && typeof response.proposal === 'object') {
            return response.proposal as Record<string, unknown>;
        } else {
            throw new Error('Invalid proposal response from Deriv API');
        }
    }

    /**
     * Buy contract using Deriv API
     */
    private async buyContract(proposalId: string, price: number): Promise<Record<string, unknown>> {
        // Ensure price is properly formatted to 2 decimal places
        const formattedPrice = Math.round(price * 100) / 100;

        const buyRequest = {
            buy: proposalId,
            price: formattedPrice,
            req_id: this.requestId++,
        };

        console.log('💰 Sending buy request:', buyRequest);

        const response = await this.sendRequest(buyRequest);
        console.log('💰 Buy response:', response);

        return response;
    }

    /**
     * Monitor contract for completion with enhanced polling
     */
    private monitorContract(trade: ZenTradeResult): void {
        if (!trade.contractId) return;

        console.log(`🔍 Starting enhanced monitoring for contract: ${trade.contractId}`);

        const checkContract = async () => {
            try {
                // First, get the current contract status without subscription
                const statusRequest = {
                    proposal_open_contract: 1,
                    contract_id: parseInt(trade.contractId!),
                    req_id: this.requestId++,
                };

                console.log('🔍 Sending initial contract status request:', statusRequest);
                const statusResponse = await this.sendRequest(statusRequest);
                console.log('🔍 Initial contract status response:', statusResponse);

                // Handle initial status
                if (statusResponse.proposal_open_contract) {
                    this.handleContractUpdate(statusResponse.proposal_open_contract as Record<string, unknown>);
                }

                // If contract is already settled, no need to subscribe
                if (trade.status !== 'pending') {
                    console.log(`✅ Contract ${trade.contractId} already settled: ${trade.status}`);
                    return;
                }

                // Then set up subscription for updates
                const monitorRequest = {
                    proposal_open_contract: 1,
                    contract_id: parseInt(trade.contractId!),
                    subscribe: 1,
                    req_id: this.requestId++,
                };

                console.log('🔍 Sending contract monitor subscription:', monitorRequest);
                const monitorResponse = await this.sendRequest(monitorRequest);
                console.log('🔍 Contract monitor subscription response:', monitorResponse);

                // Set up aggressive polling as backup
                this.setupAggressivePolling(trade);
            } catch (error) {
                console.error('❌ Error monitoring contract:', error);
                trade.status = 'error';
                trade.error = 'Failed to monitor contract';
                this.callbacks.onTrade?.(trade);
            }
        };

        checkContract();
    }

    /**
     * Set up aggressive polling for contract settlement
     */
    private setupAggressivePolling(trade: ZenTradeResult): void {
        if (!trade.contractId) return;

        console.log(`⚡ Setting up aggressive polling for contract: ${trade.contractId}`);

        // Poll every 2 seconds for the first 30 seconds
        const aggressiveInterval = setInterval(async () => {
            if (trade.status !== 'pending') {
                clearInterval(aggressiveInterval);
                return;
            }

            try {
                console.log(`⚡ Aggressive poll for contract ${trade.contractId}`);
                await this.checkContractStatus(trade);
            } catch (error) {
                console.error(`❌ Aggressive poll failed for ${trade.contractId}:`, error);
            }
        }, 2000);

        // Clear aggressive polling after 30 seconds
        setTimeout(() => {
            clearInterval(aggressiveInterval);
            console.log(`⏰ Aggressive polling ended for contract ${trade.contractId}`);
        }, 30000);
    }

    /**
     * Handle contract updates from WebSocket
     */
    private handleContractUpdate(contractData: Record<string, unknown>): void {
        const contractId = contractData.contract_id?.toString();

        // Try multiple ways to find the trade (sometimes contract IDs have different formats)
        let trade = this.trades.find(t => t.contractId === contractId);

        // If not found, try finding by numeric comparison
        if (!trade && contractId) {
            trade = this.trades.find(
                t =>
                    t.contractId === contractId ||
                    parseInt(t.contractId || '0').toString() === contractId ||
                    t.contractId === parseInt(contractId).toString()
            );
        }

        console.log(`📊 Processing contract update for ${contractId}:`, contractData);
        console.log(
            `📊 Current trades:`,
            this.trades.map(t => ({ id: t.id, contractId: t.contractId, status: t.status }))
        );

        if (!trade) {
            console.warn(`⚠️ No trade found for contract ID: ${contractId}`);
            console.warn(
                `⚠️ Available contract IDs:`,
                this.trades.map(t => t.contractId)
            );
            return;
        }

        // Enhanced settlement detection with multiple indicators
        const isSettled =
            contractData.is_settled === 1 ||
            contractData.is_settled === true ||
            contractData.status === 'sold' ||
            contractData.contract_status === 'sold' ||
            contractData.is_expired === 1 ||
            contractData.is_expired === true ||
            (contractData.sell_price && Number(contractData.sell_price) > 0) ||
            (contractData.profit !== undefined && contractData.profit !== null) ||
            contractData.is_valid_to_sell === 0 ||
            contractData.is_valid_to_sell === false;

        console.log(`🔍 Settlement check for ${contractId}:`, {
            is_settled: contractData.is_settled,
            status: contractData.status,
            contract_status: contractData.contract_status,
            is_expired: contractData.is_expired,
            sell_price: contractData.sell_price,
            profit: contractData.profit,
            is_valid_to_sell: contractData.is_valid_to_sell,
            isSettled,
        });

        // Log the complete contract data for debugging
        console.log(`📋 Complete contract data for ${contractId}:`, contractData);

        if (isSettled) {
            // Contract is finished - extract all possible profit/loss data
            const sellPrice = Number(contractData.sell_price) || 0;

            // 🚀 MANUAL PROFIT CALCULATION METHOD (API-Independent & Faster)
            // Calculate profit manually to reduce API dependency and improve performance
            const exitSpot =
                Number(contractData.exit_tick) ||
                Number(contractData.current_spot) ||
                Number(contractData.exit_spot) ||
                0;

            if (!exitSpot || !trade.entrySpot) {
                console.warn(`⚠️ Missing spot data for manual calculation:`, {
                    contractId,
                    exitSpot,
                    entrySpot: trade.entrySpot,
                    contractData: {
                        exit_tick: contractData.exit_tick,
                        current_spot: contractData.current_spot,
                        exit_spot: contractData.exit_spot,
                    },
                });
                return; // Skip calculation if we don't have required data
            }

            const contractDetails: ContractDetails = {
                contractType: trade.contractType,
                stake: trade.stake,
                entrySpot: trade.entrySpot,
                exitSpot: exitSpot,
                duration: trade.duration,
                defaultDigit: this.config?.defaultDigit || 0,
            };

            const profitResult = calculateProfit(contractDetails);

            console.log(`💰 MANUAL CALCULATION: ${trade.strategy} → ${profitResult.outcome.toUpperCase()}`, {
                contractId,
                entrySpot: trade.entrySpot,
                exitSpot,
                exitDigit: Math.floor((exitSpot * 10) % 10),
                calculatedProfit: profitResult.profit,
                apiProfit: contractData.profit, // For comparison
                outcome: profitResult.outcome,
                roi: profitResult.roi.toFixed(1) + '%',
            });

            // Use manual calculation results
            trade.status = profitResult.outcome === 'win' ? 'won' : 'lost';
            trade.profit = profitResult.profit;
            trade.exitSpot = exitSpot;

            // 🚀 ENHANCED: Store additional profit details for better transaction history
            trade.buyPrice = profitResult.buyPrice;
            trade.payout = profitResult.payout;
            if (sellPrice > 0) (trade as Record<string, unknown>).sellPrice = sellPrice;

            // Store the exit digit for display purposes (using same method as profit calculator)
            const exitDigit = Math.floor((exitSpot * 1000) % 10);
            (trade as Record<string, unknown>).exitDigit = exitDigit;

            console.log(
                `🚀 MANUAL PROFIT: ${trade.strategy} → ${trade.status.toUpperCase()} | Profit: ${profitResult.profit >= 0 ? '+' : ''}${profitResult.profit.toFixed(2)} | Exit: ${exitSpot} (${exitDigit}) | Buy: ${profitResult.buyPrice} | Payout: ${profitResult.payout} | ROI: ${profitResult.roi.toFixed(1)}%`
            );

            this.updateTradingStats(trade);
            this.callbacks.onTrade?.(trade);
        } else {
            // Contract is still running - update current info
            trade.exitSpot = Number(contractData.current_spot) || Number(contractData.spot) || 0;

            // Log current contract state for debugging
            console.log(`📊 Contract ${contractId} still PENDING:`, {
                current_spot: contractData.current_spot,
                spot: contractData.spot,
                is_settled: contractData.is_settled,
                status: contractData.status,
                sell_price: contractData.sell_price,
                profit: contractData.profit,
            });

            // Update the trade to trigger UI refresh
            this.callbacks.onTrade?.(trade);
        }
    }

    /**
     * Update trading statistics with balance validation
     */
    private updateTradingStats(trade: ZenTradeResult): void {
        const previousSessionProfit = this.sessionProfit;
        this.sessionProfit += trade.profit || 0;

        console.log(`📊 SESSION PROFIT UPDATE:`, {
            previousTotal: previousSessionProfit.toFixed(2),
            tradeProfit: (trade.profit || 0).toFixed(2),
            newTotal: this.sessionProfit.toFixed(2),
            tradeId: trade.id,
            contractId: trade.contractId,
        });

        // Update contract performance tracking
        this.updateContractPerformance(trade);

        // Using Fast Lane's simple approach - no complex synchronization needed

        // For Straddle6, only update streak/losses when both trades are complete
        if (trade.strategy === 'Straddle6') {
            this.updateStraddleStats(trade);
        } else {
            // Regular strategy stats update
            if (trade.status === 'won') {
                this.currentStreak = this.currentStreak > 0 ? this.currentStreak + 1 : 1;
                const previousLosses = this.consecutiveLosses;
                this.consecutiveLosses = 0;

                // Handle win reset if configured
                this.handleWinReset();

                console.log(`✅ WIN - Martingale Reset:`, {
                    previousConsecutiveLosses: previousLosses,
                    newConsecutiveLosses: this.consecutiveLosses,
                    nextStakeWillBe: this.config?.stake,
                    profit: trade.profit,
                });
            } else if (trade.status === 'lost') {
                this.currentStreak = this.currentStreak < 0 ? this.currentStreak - 1 : -1;
                this.consecutiveLosses++;

                const nextStake = this.config
                    ? this.config.stake * Math.pow(this.config.martingaleMultiplier, this.consecutiveLosses)
                    : this.config?.stake;

                console.log(`❌ LOSS - Martingale Increase:`, {
                    consecutiveLosses: this.consecutiveLosses,
                    multiplier: this.config?.martingaleMultiplier,
                    baseStake: this.config?.stake,
                    nextStake: nextStake,
                    loss: trade.profit,
                });
            }
        }

        // Check stop conditions
        this.checkStopConditions();

        // Check strategy switching
        this.checkStrategySwitch();

        // Auto-switch to best strategy if enabled
        if (this.advancedConfig?.autoStrategySwitch) {
            this.autoSwitchToBestStrategy();
        }
    }

    /**
     * Update statistics for Straddle6 trades
     */
    private updateStraddleStats(completedTrade: ZenTradeResult): void {
        // Find the pair trade for this straddle
        const straddleTrades = this.trades.filter(
            t =>
                t.strategy === 'Straddle6' &&
                Math.abs(t.timestamp - completedTrade.timestamp) < 5000 && // Within 5 seconds
                t.id !== completedTrade.id
        );

        if (straddleTrades.length === 0) return; // Pair not found yet

        const pairTrade = straddleTrades[0];

        // Only update stats when both trades are complete
        if (pairTrade.status === 'won' || pairTrade.status === 'lost') {
            const totalProfit = (completedTrade.profit || 0) + (pairTrade.profit || 0);
            const isStraddleWin = totalProfit > 0;

            if (isStraddleWin) {
                this.currentStreak = this.currentStreak > 0 ? this.currentStreak + 1 : 1;
                const previousLosses = this.consecutiveLosses;
                this.consecutiveLosses = 0;
                console.log(`✅ Straddle6 WIN - Martingale Reset:`, {
                    totalProfit: totalProfit.toFixed(2),
                    previousConsecutiveLosses: previousLosses,
                    newConsecutiveLosses: this.consecutiveLosses,
                });
            } else {
                this.currentStreak = this.currentStreak < 0 ? this.currentStreak - 1 : -1;
                this.consecutiveLosses++;

                const nextStake = this.config
                    ? this.config.stake * Math.pow(this.config.martingaleMultiplier, this.consecutiveLosses)
                    : this.config?.stake;

                console.log(`❌ Straddle6 LOSS - Martingale Increase:`, {
                    totalLoss: totalProfit.toFixed(2),
                    consecutiveLosses: this.consecutiveLosses,
                    nextStake: nextStake,
                });
            }
        }
    }

    /**
     * Check if we should stop trading based on limits
     */
    private checkStopConditions(): void {
        if (!this.config) return;

        if (this.config.takeProfit && this.sessionProfit >= this.config.takeProfit) {
            this.stop();
            console.log(`Take Profit Reached: ${this.config.takeProfit} achieved!`);
        }

        if (this.config.stopLoss && this.sessionProfit <= -this.config.stopLoss) {
            this.stop();
            console.log(`Stop Loss Triggered: ${this.config.stopLoss} reached.`);
        }
    }

    /**
     * Check if we should switch contract types/strategies
     */
    private checkStrategySwitch(): void {
        if (!this.config?.switchOnLoss && !this.config?.contractSwitching?.enabled) return;

        // Use legacy switchOnLoss if new config not available
        const shouldSwitch = this.config.contractSwitching?.enabled
            ? this.consecutiveLosses >= this.config.lossesToSwitch
            : this.config.switchOnLoss && this.consecutiveLosses >= this.config.lossesToSwitch;

        if (shouldSwitch) {
            this.executeContractSwitch();
        }
    }

    /**
     * Execute contract type switching with enhanced logic
     */
    private executeContractSwitch(): void {
        if (!this.config) return;

        // Check cooldown period
        if (this.isInSwitchCooldown()) {
            console.log('🕒 Contract switch on cooldown, skipping...');
            return;
        }

        // Check max switches limit
        if (this.hasReachedMaxSwitches()) {
            console.log('🚫 Max switches reached for this session');
            return;
        }

        const currentStrategy = this.config.strategy;
        const switchingConfig = this.config.contractSwitching;
        let newStrategy: string;
        let switchReason: string;

        // Determine switching mode
        if (switchingConfig?.mode === 'performance') {
            newStrategy = this.selectBestPerformingStrategy();
            switchReason = 'Performance-based selection';
        } else if (switchingConfig?.mode === 'adaptive') {
            newStrategy = this.selectAdaptiveStrategy();
            switchReason = 'Market-adaptive selection';
        } else if (switchingConfig?.mode === 'custom' && switchingConfig.customSequence) {
            newStrategy = this.selectFromCustomSequence();
            switchReason = 'Custom sequence';
        } else {
            // Default rotation mode
            newStrategy = this.selectNextInRotation();
            switchReason = 'Sequential rotation';
        }

        // Execute the switch
        this.performContractSwitch(currentStrategy, newStrategy, switchReason);
    }

    /**
     * Check if we're in switch cooldown period
     */
    private isInSwitchCooldown(): boolean {
        if (!this.config?.contractSwitching?.cooldownPeriod) return false;

        const cooldownMs = this.config.contractSwitching.cooldownPeriod * 60 * 1000;
        return Date.now() - this.lastSwitchTime < cooldownMs;
    }

    /**
     * Check if max switches limit reached
     */
    private hasReachedMaxSwitches(): boolean {
        if (!this.config?.contractSwitching?.maxSwitches) return false;
        return this.switchesThisSession >= this.config.contractSwitching.maxSwitches;
    }

    /**
     * Select best performing strategy based on recent performance
     */
    private selectBestPerformingStrategy(): string {
        const performanceWindow = this.config?.contractSwitching?.performanceWindow || 10;
        const strategies = this.getAvailableStrategies();

        let bestStrategy = strategies[0];
        let bestWinRate = 0;

        for (const strategy of strategies) {
            const performance = this.contractPerformance.get(strategy);
            if (performance && performance.totalTrades >= 3) {
                // Calculate recent win rate
                const recentWins = performance.recentPerformance.filter(win => win).length;
                const recentWinRate = recentWins / Math.min(performance.recentPerformance.length, performanceWindow);

                if (recentWinRate > bestWinRate) {
                    bestWinRate = recentWinRate;
                    bestStrategy = strategy;
                }
            }
        }

        console.log(`📊 Best performing strategy: ${bestStrategy} (${(bestWinRate * 100).toFixed(1)}% win rate)`);
        return bestStrategy;
    }

    /**
     * Select strategy based on market conditions (adaptive mode)
     */
    private selectAdaptiveStrategy(): string {
        const volatility = this.calculateMarketVolatility();
        const trend = this.calculateMarketTrend();

        console.log(`📈 Market analysis: Volatility=${volatility.toFixed(3)}, Trend=${trend.toFixed(3)}`);

        // High volatility - prefer Rise/Fall
        if (volatility > 0.5) {
            return trend > 0 ? 'Rise' : 'Fall';
        }

        // Low volatility - prefer digit contracts
        if (volatility < 0.2) {
            const lastDigit = this.getLastTickDigit();
            return lastDigit % 2 === 0 ? 'Even' : 'Odd';
        }

        // Medium volatility - use digit over/under
        const lastDigit = this.getLastTickDigit();
        return lastDigit > 5 ? 'Under' : 'Over';
    }

    /**
     * Select next strategy from custom sequence
     */
    private selectFromCustomSequence(): string {
        const customSequence = this.config?.contractSwitching?.customSequence;
        if (!customSequence || customSequence.length === 0) {
            return this.selectNextInRotation();
        }

        const currentIndex = customSequence.indexOf(this.config!.strategy);
        const nextIndex = (currentIndex + 1) % customSequence.length;
        return customSequence[nextIndex];
    }

    /**
     * Select next strategy in default rotation
     */
    private selectNextInRotation(): string {
        const strategies = this.getAvailableStrategies();
        const currentIndex = strategies.indexOf(this.config!.strategy);
        const nextIndex = (currentIndex + 1) % strategies.length;
        return strategies[nextIndex];
    }

    /**
     * Get available strategies (excluding any that are disabled)
     */
    private getAvailableStrategies(): string[] {
        const allStrategies = ['Even', 'Odd', 'Matches', 'Differs', 'Over', 'Under', 'Rise', 'Fall', 'Straddle6'];
        const excludeStrategies = this.config?.contractSwitching?.excludeStrategies || [];
        return allStrategies.filter(strategy => !excludeStrategies.includes(strategy));
    }

    /**
     * Perform the actual contract switch
     */
    private performContractSwitch(fromStrategy: string, toStrategy: string, reason: string): void {
        if (!this.config) return;

        // Update strategy
        this.config.strategy = toStrategy as ZenTradeConfig['strategy'];

        // Reset consecutive losses (or not, based on config)
        const shouldResetLosses = this.config.contractSwitching?.resetOnWin !== false; // default true
        if (shouldResetLosses) {
            this.consecutiveLosses = 0;
        }

        // Update tracking
        this.lastSwitchTime = Date.now();
        this.switchesThisSession++;

        // Record switch history
        this.switchHistory.push({
            timestamp: Date.now(),
            from: fromStrategy,
            to: toStrategy,
            reason,
            consecutiveLosses: this.consecutiveLosses,
        });

        // Notify callbacks
        this.callbacks.onContractSwitch?.({
            from: fromStrategy,
            to: toStrategy,
            reason,
        });

        console.log(`🔄 CONTRACT SWITCH: ${fromStrategy} → ${toStrategy}`, {
            reason,
            consecutiveLosses: this.consecutiveLosses,
            switchesThisSession: this.switchesThisSession,
            cooldownMinutes: this.config.contractSwitching?.cooldownPeriod || 0,
        });
    }

    /**
     * Calculate market volatility from recent ticks
     */
    private calculateMarketVolatility(): number {
        if (this.tickHistory.length < 10) return 0.5; // default medium volatility

        const recentTicks = this.tickHistory.slice(-20);
        const mean = recentTicks.reduce((sum, tick) => sum + tick, 0) / recentTicks.length;
        const variance = recentTicks.reduce((sum, tick) => sum + Math.pow(tick - mean, 2), 0) / recentTicks.length;
        const volatility = Math.sqrt(variance);

        // Normalize to 0-1 range
        return Math.min(1, volatility * 1000);
    }

    /**
     * Calculate market trend from recent ticks
     */
    private calculateMarketTrend(): number {
        if (this.tickHistory.length < 5) return 0;

        const recentTicks = this.tickHistory.slice(-10);
        const firstHalf = recentTicks.slice(0, Math.floor(recentTicks.length / 2));
        const secondHalf = recentTicks.slice(Math.floor(recentTicks.length / 2));

        const firstAvg = firstHalf.reduce((sum, tick) => sum + tick, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, tick) => sum + tick, 0) / secondHalf.length;

        return secondAvg - firstAvg; // Positive = uptrend, Negative = downtrend
    }

    /**
     * Get last digit of current tick
     */
    private getLastTickDigit(): number {
        if (!this.currentTick) return 5; // default middle digit
        return Math.floor((this.currentTick * 10000) % 10);
    }

    /**
     * Update contract performance tracking
     */
    private updateContractPerformance(trade: ZenTradeResult): void {
        const strategy = trade.strategy;

        if (!this.contractPerformance.has(strategy)) {
            this.contractPerformance.set(strategy, {
                contractType: trade.contractType,
                strategy: strategy,
                totalTrades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgProfit: 0,
                totalProfit: 0,
                lastUsed: Date.now(),
                recentPerformance: [],
            });
        }

        const performance = this.contractPerformance.get(strategy)!;
        performance.totalTrades++;
        performance.lastUsed = Date.now();

        const isWin = trade.status === 'won';
        const profit = trade.profit || 0;

        if (isWin) {
            performance.wins++;
        } else {
            performance.losses++;
        }

        performance.totalProfit += profit;
        performance.winRate = performance.wins / performance.totalTrades;
        performance.avgProfit = performance.totalProfit / performance.totalTrades;

        // Update recent performance (keep last 10 trades)
        performance.recentPerformance.push(isWin);
        if (performance.recentPerformance.length > 10) {
            performance.recentPerformance.shift();
        }

        console.log(`📊 Updated performance for ${strategy}:`, {
            winRate: `${(performance.winRate * 100).toFixed(1)}%`,
            totalTrades: performance.totalTrades,
            avgProfit: performance.avgProfit.toFixed(2),
        });
    }

    /**
     * Reset on win if configured
     */
    private handleWinReset(): void {
        if (this.config?.contractSwitching?.resetOnWin && this.originalStrategy) {
            if (this.config.strategy !== this.originalStrategy) {
                console.log(`🎯 Win detected - resetting to original strategy: ${this.originalStrategy}`);
                this.performContractSwitch(this.config.strategy, this.originalStrategy, 'Reset to original on win');
            }
        }
    }

    /**
     * Reset trading session
     */
    private resetSession(): void {
        this.trades = [];
        this.currentStreak = 0;
        this.consecutiveLosses = 0;
        this.sessionProfit = 0;
        this.initialBalance = null;
        this.tickHistory = [];
        this.lastTradeTickIndex = -1;

        // Reset contract switching data
        this.switchHistory = [];
        this.lastSwitchTime = 0;
        this.switchesThisSession = 0;
        this.isInCooldown = false;
        // Note: We don't reset contractPerformance as it should persist across sessions
    }

    /**
     * Public method to reset session (for UI reset button)
     */
    resetSessionPublic(): void {
        this.resetSession();

        // Notify callbacks about the reset
        this.callbacks.onReset?.();

        console.log('🔄 Zen Trading session reset - all data cleared');
    }

    /**
     * Get contract switching statistics
     */
    public getContractSwitchingStats(): ContractSwitchingStats {
        const performanceArray = Array.from(this.contractPerformance.values());
        const bestPerforming = performanceArray.reduce(
            (best, current) => (current.winRate > best.winRate ? current : best),
            performanceArray[0] || { strategy: 'None' }
        );

        const cooldownRemaining = this.config?.contractSwitching?.cooldownPeriod
            ? Math.max(0, this.config.contractSwitching.cooldownPeriod * 60 * 1000 - (Date.now() - this.lastSwitchTime))
            : 0;

        return {
            totalSwitches: this.switchHistory.length,
            switchesThisSession: this.switchesThisSession,
            lastSwitchTime: this.lastSwitchTime,
            switchHistory: [...this.switchHistory],
            performanceByContract: performanceArray,
            bestPerformingContract: bestPerforming?.strategy || 'None',
            currentSwitchCooldown: Math.ceil(cooldownRemaining / 1000 / 60), // minutes
        };
    }

    /**
     * Get performance for a specific contract type
     */
    public getContractPerformance(strategy: string): ContractTypePerformance | null {
        return this.contractPerformance.get(strategy) || null;
    }

    /**
     * Manually trigger a contract switch (for testing or manual override)
     */
    public manualContractSwitch(targetStrategy?: string): boolean {
        if (!this.config) return false;

        if (this.isInSwitchCooldown()) {
            console.log('🕒 Manual switch blocked - cooldown active');
            return false;
        }

        if (this.hasReachedMaxSwitches()) {
            console.log('🚫 Manual switch blocked - max switches reached');
            return false;
        }

        const currentStrategy = this.config.strategy;
        const newStrategy = targetStrategy || this.selectNextInRotation();

        this.performContractSwitch(currentStrategy, newStrategy, 'Manual override');
        return true;
    }

    /**
     * Reset contract performance data
     */
    public resetContractPerformance(): void {
        this.contractPerformance.clear();
        console.log('📊 Contract performance data reset');
    }

    /**
     * Update contract switching configuration
     */
    public updateContractSwitchingConfig(config: Partial<ZenTradeConfig['contractSwitching']>): void {
        if (!this.config) return;

        this.config.contractSwitching = {
            ...this.config.contractSwitching,
            ...config,
        } as ZenTradeConfig['contractSwitching'];

        console.log('⚙️ Contract switching config updated:', config);
    }

    /**
     * Initialize balance tracking for profit synchronization
     */
    private async initializeBalanceTracking(): Promise<void> {
        try {
            const balanceResponse = await this.sendRequest({
                balance: 1,
                req_id: this.requestId++,
            });

            if (balanceResponse.balance && typeof balanceResponse.balance === 'object') {
                this.initialBalance = Number(balanceResponse.balance.balance);
                console.log(`💰 Balance tracking initialized: ${this.initialBalance.toFixed(2)}`);
            }
        } catch (error) {
            console.error('❌ Failed to initialize balance tracking:', error);
        }
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks: {
        onTick?: (tick: number) => void;
        onTrade?: (trade: ZenTradeResult) => void;
        onStatusChange?: (running: boolean) => void;
        onError?: (error: string) => void;
        onReset?: () => void;
    }): void {
        this.callbacks = callbacks;
    }

    /**
     * Get trading statistics
     */
    getStats(): ZenTradingStats {
        const completedTrades = this.trades.filter(t => t.status === 'won' || t.status === 'lost');
        const wins = completedTrades.filter(t => t.status === 'won').length;

        return {
            totalTrades: completedTrades.length,
            winRate: completedTrades.length > 0 ? wins / completedTrades.length : 0,
            totalProfit: this.sessionProfit,
            currentStreak: this.currentStreak,
            bestStreak: Math.max(...this.trades.map(() => this.currentStreak), 0),
            worstStreak: Math.min(...this.trades.map(() => this.currentStreak), 0),
            strategiesUsed: [...new Set(this.trades.map(t => t.strategy))],
            marketsTraded: [...new Set(this.trades.map(t => t.market))],
        };
    }

    /**
     * Get recent trades
     */
    getRecentTrades(limit = 10): ZenTradeResult[] {
        return this.trades.slice(-limit);
    }

    /**
     * 🚀 ENHANCED: Get detailed profit analytics
     */
    getProfitAnalytics(): {
        totalProfit: number;
        avgProfitPerTrade: number;
        totalROI: number;
        profitByStrategy: Record<string, number>;
        profitByMarket: Record<string, number>;
        bestTrade: ZenTradeResult | null;
        worstTrade: ZenTradeResult | null;
        totalStaked: number;
        totalPayout: number;
    } {
        const completedTrades = this.trades.filter(t => t.status === 'won' || t.status === 'lost');
        const totalStaked = completedTrades.reduce((sum, t) => sum + t.stake, 0);
        const totalPayout = completedTrades.reduce((sum, t) => sum + (t.payout || 0), 0);

        // Profit by strategy
        const profitByStrategy: Record<string, number> = {};
        completedTrades.forEach(t => {
            profitByStrategy[t.strategy] = (profitByStrategy[t.strategy] || 0) + (t.profit || 0);
        });

        // Profit by market
        const profitByMarket: Record<string, number> = {};
        completedTrades.forEach(t => {
            profitByMarket[t.market] = (profitByMarket[t.market] || 0) + (t.profit || 0);
        });

        // Best and worst trades
        const tradesWithProfit = completedTrades.filter(t => t.profit !== undefined);
        const bestTrade = tradesWithProfit.reduce(
            (best, current) => (!best || (current.profit || 0) > (best.profit || 0) ? current : best),
            null as ZenTradeResult | null
        );
        const worstTrade = tradesWithProfit.reduce(
            (worst, current) => (!worst || (current.profit || 0) < (worst.profit || 0) ? current : worst),
            null as ZenTradeResult | null
        );

        return {
            totalProfit: this.sessionProfit,
            avgProfitPerTrade: completedTrades.length > 0 ? this.sessionProfit / completedTrades.length : 0,
            totalROI: totalStaked > 0 ? (this.sessionProfit / totalStaked) * 100 : 0,
            profitByStrategy,
            profitByMarket,
            bestTrade,
            worstTrade,
            totalStaked,
            totalPayout,
        };
    }

    /**
     * Get current configuration
     */
    getConfig(): ZenTradeConfig | null {
        return this.config;
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ZenTradeConfig>): void {
        if (this.config) {
            this.config = { ...this.config, ...updates };
        }
    }

    /**
     * Check if trading is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Send request to Deriv API
     */
    private async sendRequest(request: Record<string, unknown>): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const reqId = (request.req_id as number) || this.requestId++;
            request.req_id = reqId;

            this.pendingRequests.set(reqId, { resolve, reject });
            this.wsConnection.send(JSON.stringify(request));

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(reqId)) {
                    this.pendingRequests.delete(reqId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Authorize with stored token
     */
    private async authorize(): Promise<Record<string, unknown>> {
        if (!this.authToken) {
            throw new Error('No auth token available');
        }

        return this.sendRequest({
            authorize: this.authToken,
            req_id: this.requestId++,
        });
    }

    /**
     * Get stored auth token from various sources
     */
    public getStoredAuthToken(): string | null {
        try {
            // Method 1: Try to get from localStorage (where Deriv stores it)
            const accounts = localStorage.getItem('client.accounts');
            const activeLoginId = localStorage.getItem('active_loginid');

            if (accounts && activeLoginId) {
                const accountsData = JSON.parse(accounts);
                const activeAccount = accountsData[activeLoginId];
                if (activeAccount?.token) {
                    console.log('✅ Zen Trading: Token found in client.accounts');
                    return activeAccount.token;
                }
            }

            // Method 2: Try alternative localStorage keys
            const alternativeKeys = [
                'authToken',
                'deriv_token',
                'api_token',
                'client.token',
                'speed_mode_token',
                'zen_token',
            ];

            for (const key of alternativeKeys) {
                const token = localStorage.getItem(key);
                if (token && token.length > 10) {
                    // Basic validation
                    console.log(`✅ Zen Trading: Token found in ${key}`);
                    return token;
                }
            }

            console.warn('⚠️ Zen Trading: No auth token found - trading requires authentication');
            return null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    /**
     * Get stored app ID with fallback hierarchy
     */
    getStoredAppId(): string {
        try {
            // 1. Check for zen-specific app ID
            const zenAppId = localStorage.getItem('zen_app_id');
            if (zenAppId) {
                console.log(`✅ Zen Trading: Using zen app ID: ${zenAppId}`);
                return zenAppId;
            }

            // 2. Check for speed mode app ID
            const speedModeAppId = localStorage.getItem('speed_mode_app_id');
            if (speedModeAppId) {
                console.log(`✅ Zen Trading: Using speed mode app ID: ${speedModeAppId}`);
                return speedModeAppId;
            }

            // 3. Check for general config app ID
            const configAppId = localStorage.getItem('config.app_id');
            if (configAppId && configAppId !== '80058') {
                console.log(`✅ Zen Trading: Using config app ID: ${configAppId}`);
                return configAppId;
            }

            // 4. Use the configured default from API_CONFIG
            console.log(`✅ Zen Trading: Using default app ID: ${API_CONFIG.APP_ID}`);
            return API_CONFIG.APP_ID;
        } catch (error) {
            console.error('Error getting app ID:', error);
            return API_CONFIG.APP_ID;
        }
    }

    /**
     * Get currency for trades
     */
    private getCurrency(): string {
        // Try to get from stored account info
        try {
            const accounts = localStorage.getItem('client.accounts');
            const activeLoginId = localStorage.getItem('active_loginid');

            if (accounts && activeLoginId) {
                const accountsData = JSON.parse(accounts);
                const activeAccount = accountsData[activeLoginId];
                if (activeAccount?.currency) {
                    return activeAccount.currency;
                }
            }
        } catch (error) {
            console.warn('Could not get currency from account info');
        }

        // Default to USD
        return 'USD';
    }

    /**
     * Set auth token manually (for users who want to provide their own)
     */
    setAuthToken(token: string): void {
        this.authToken = token;
        localStorage.setItem('zen_token', token);
        console.log('✅ Zen Trading: Auth token set manually');
    }

    /**
     * Set app ID manually
     */
    setAppId(appId: string): void {
        this.appId = appId;
        localStorage.setItem('zen_app_id', appId);
        console.log(`✅ Zen Trading: App ID set to: ${appId}`);
    }

    /**
     * Get current auth status
     */
    getAuthStatus(): { hasToken: boolean; appId: string; currency: string } {
        return {
            hasToken: !!this.authToken,
            appId: this.appId,
            currency: this.getCurrency(),
        };
    }

    /**
     * Set up enhanced periodic contract status checking
     */
    private setupContractStatusChecking(trade: ZenTradeResult): void {
        if (!trade.contractId) return;

        console.log(`⏰ Setting up enhanced periodic status checks for contract: ${trade.contractId}`);

        // Immediate check after 3 seconds
        setTimeout(() => {
            if (trade.status === 'pending') {
                console.log(`⚡ Immediate check for contract ${trade.contractId}`);
                this.checkContractStatus(trade);
            }
        }, 3000);

        // Check every 5 seconds for the first minute
        const quickCheckInterval = setInterval(() => {
            if (trade.status === 'pending') {
                console.log(`⏰ Quick check for contract ${trade.contractId}`);
                this.checkContractStatus(trade);
            } else {
                clearInterval(quickCheckInterval);
            }
        }, 5000);

        // Clear quick checks after 1 minute
        setTimeout(() => {
            clearInterval(quickCheckInterval);
        }, 60000);

        // Medium frequency checks every 15 seconds for next 2 minutes
        const mediumCheckInterval = setInterval(() => {
            if (trade.status === 'pending') {
                console.log(`⏰ Medium check for contract ${trade.contractId}`);
                this.checkContractStatus(trade);
            } else {
                clearInterval(mediumCheckInterval);
            }
        }, 15000);

        // Clear medium checks after 3 minutes total
        setTimeout(() => {
            clearInterval(mediumCheckInterval);
        }, 180000);

        // Final aggressive check after 3 minutes if still pending
        setTimeout(() => {
            if (trade.status === 'pending') {
                console.log(`🚨 FINAL AGGRESSIVE CHECK for contract ${trade.contractId}`);

                // Try multiple check methods
                this.performFinalContractCheck(trade);

                // If still pending after final check, mark as error
                setTimeout(() => {
                    if (trade.status === 'pending') {
                        console.warn(
                            `❌ Contract ${trade.contractId} TIMEOUT - marking as error after all checks failed`
                        );
                        trade.status = 'error';
                        trade.error = 'Contract settlement timeout - all monitoring methods failed';
                        trade.profit = -trade.stake; // Assume loss for timeout
                        this.callbacks.onTrade?.(trade);
                    }
                }, 15000);
            }
        }, 180000);
    }

    /**
     * Perform final aggressive contract check with multiple methods
     */
    private async performFinalContractCheck(trade: ZenTradeResult): Promise<void> {
        if (!trade.contractId) return;

        console.log(`🚨 Performing final aggressive check for contract ${trade.contractId}`);

        try {
            // Method 1: Standard proposal_open_contract
            await this.checkContractStatus(trade);

            if (trade.status !== 'pending') return;

            // Method 2: Try with different request format
            const alternativeRequest = {
                proposal_open_contract: 1,
                contract_id: trade.contractId, // Try string format
                req_id: this.requestId++,
            };

            console.log('🚨 Trying alternative contract check format:', alternativeRequest);
            const altResponse = await this.sendRequest(alternativeRequest);

            if (altResponse.proposal_open_contract) {
                this.handleContractUpdate(altResponse.proposal_open_contract as Record<string, unknown>);
            }

            if (trade.status !== 'pending') return;

            // Method 3: Try portfolio check to find the contract
            const portfolioRequest = {
                portfolio: 1,
                req_id: this.requestId++,
            };

            console.log('🚨 Trying portfolio check to find contract:', portfolioRequest);
            const portfolioResponse = await this.sendRequest(portfolioRequest);

            if (portfolioResponse.portfolio && Array.isArray(portfolioResponse.portfolio.contracts)) {
                const contracts = portfolioResponse.portfolio.contracts as Record<string, unknown>[];
                const foundContract = contracts.find(c => c.contract_id?.toString() === trade.contractId);

                if (foundContract) {
                    console.log('🚨 Found contract in portfolio:', foundContract);
                    this.handleContractUpdate(foundContract);
                }
            }
        } catch (error) {
            console.error(`❌ Final contract check failed for ${trade.contractId}:`, error);
        }
    }

    /**
     * Check contract status as fallback if no updates received
     */
    private async checkContractStatus(trade: ZenTradeResult): Promise<void> {
        if (!trade.contractId) return;

        try {
            console.log(`🔍 Fallback: Checking status for contract ${trade.contractId}`);

            const response = await this.sendRequest({
                proposal_open_contract: 1,
                contract_id: parseInt(trade.contractId),
                req_id: this.requestId++,
            });

            console.log(`🔍 Fallback contract status response:`, response);

            if (response.proposal_open_contract) {
                this.handleContractUpdate(response.proposal_open_contract as Record<string, unknown>);
            }
        } catch (error) {
            console.error(`❌ Failed to check contract status for ${trade.contractId}:`, error);
        }
    }

    /**
     * Start contract reconciliation system to periodically check all pending contracts
     */
    private startContractReconciliation(): void {
        // Check all pending contracts every 30 seconds
        setInterval(() => {
            const pendingTrades = this.trades.filter(t => t.status === 'pending');

            if (pendingTrades.length > 0) {
                console.log(`🔄 Contract reconciliation: Checking ${pendingTrades.length} pending contracts`);

                pendingTrades.forEach(trade => {
                    // Only check contracts that are older than 30 seconds
                    const tradeAge = Date.now() - trade.timestamp;
                    if (tradeAge > 30000 && trade.contractId) {
                        console.log(
                            `🔄 Reconciling contract ${trade.contractId} (age: ${Math.round(tradeAge / 1000)}s)`
                        );
                        this.checkContractStatus(trade);
                    }
                });
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Check if ready for trading (authentication required)
     */
    isReadyForTrading(): boolean {
        return !!this.authToken && !!this.appId;
    }

    /**
     * Validate trading requirements before starting
     */
    validateTradingRequirements(): void {
        if (!this.authToken) {
            throw new Error('Authentication required. Please login to your Deriv account to start trading.');
        }
        if (!this.appId) {
            throw new Error('App ID configuration missing. Please contact support.');
        }
    }

    /**
     * Manually trigger enhanced contract reconciliation
     */
    reconcileAllContracts(): void {
        const pendingTrades = this.trades.filter(t => t.status === 'pending');
        console.log(`🔄 Enhanced manual reconciliation: Checking ${pendingTrades.length} pending contracts`);

        pendingTrades.forEach(trade => {
            if (trade.contractId) {
                console.log(`🔄 Manually checking contract ${trade.contractId}`);

                // Perform immediate check
                this.checkContractStatus(trade);

                // Also try the final aggressive check method
                setTimeout(() => {
                    if (trade.status === 'pending') {
                        console.log(`🔄 Applying aggressive check to ${trade.contractId}`);
                        this.performFinalContractCheck(trade);
                    }
                }, 2000);
            }
        });
    }

    /**
     * Force settlement check for all pending contracts (emergency method)
     */
    forceSettlementCheck(): void {
        const pendingTrades = this.trades.filter(t => t.status === 'pending');
        console.log(`🚨 FORCE SETTLEMENT CHECK: ${pendingTrades.length} pending contracts`);

        pendingTrades.forEach(trade => {
            if (trade.contractId) {
                console.log(`🚨 Force checking contract ${trade.contractId}`);

                // Assume loss if contract is very old (over 5 minutes)
                const contractAge = Date.now() - trade.timestamp;
                if (contractAge > 300000) {
                    // 5 minutes
                    console.warn(
                        `🚨 Contract ${trade.contractId} is ${Math.round(contractAge / 1000)}s old - assuming loss`
                    );
                    trade.status = 'lost';
                    trade.profit = -trade.stake;
                    trade.error = 'Assumed loss due to settlement timeout';
                    this.callbacks.onTrade?.(trade);
                } else {
                    // Try one more aggressive check
                    this.performFinalContractCheck(trade);
                }
            }
        });
    }

    /**
     * Update advanced configuration
     */
    updateAdvancedConfig(config: AdvancedZenConfig | null): void {
        this.advancedConfig = config;

        if (config === null) {
            console.log('⚙️ Advanced configuration disabled - using normal martingale only');
        } else {
            console.log('⚙️ Advanced configuration updated:', config);

            // Apply immediate effects
            if (config.debugMode) {
                console.log('🐛 Debug mode enabled - verbose logging activated');
            }

            if (config.experimentalFeatures) {
                console.log('🧪 Experimental features enabled');
            }
        }
    }

    /**
     * Update advanced features enabled state
     */
    updateAdvancedFeaturesEnabled(enabled: boolean): void {
        this.advancedFeaturesEnabled = enabled;
        console.log(`⚙️ Advanced features ${enabled ? 'ENABLED' : 'DISABLED'} - Pure martingale: ${!enabled}`);
    }

    /**
     * Get current advanced configuration
     */
    getAdvancedConfig(): AdvancedZenConfig | null {
        return this.advancedConfig;
    }

    /**
     * Get current tick for price synchronization checks
     */
    getCurrentTick(): number | null {
        return this.currentTick;
    }

    /**
     * Get preferred server for consistent connections
     */
    private getPreferredServer(): 'production' | 'binary' {
        try {
            // Check for user's preferred server
            const storedServer = localStorage.getItem('zen_preferred_server');
            if (storedServer === 'binary' || storedServer === 'production') {
                console.log(`📊 Using stored server preference: ${storedServer}`);
                return storedServer;
            }

            // Default to production (derivws.com) for better reliability
            console.log('📊 Using default server: production (derivws.com)');
            return 'production';
        } catch (error) {
            console.error('Error getting preferred server:', error);
            return 'production';
        }
    }

    /**
     * Set preferred server for all connections
     */
    setPreferredServer(server: 'production' | 'binary'): void {
        localStorage.setItem('zen_preferred_server', server);
        console.log(`📊 Server preference set to: ${server}`);

        // If currently connected, recommend reconnection
        if (this.wsConnection) {
            console.log('⚠️ Server changed - restart trading to apply new server');
        }
    }

    /**
     * Check if advanced features are enabled
     */
    isAdvancedFeaturesEnabled(): boolean {
        return this.advancedConfig?.experimentalFeatures || false;
    }

    /**
     * Get strategy performance metrics for auto-switching
     */
    getStrategyPerformance(): Record<string, { winRate: number; avgProfit: number; trades: number }> {
        const performance: Record<
            string,
            { winRate: number; avgProfit: number; trades: number; wins: number; totalProfit: number }
        > = {};

        // Group trades by strategy
        this.trades.forEach(trade => {
            if (trade.status === 'won' || trade.status === 'lost') {
                if (!performance[trade.strategy]) {
                    performance[trade.strategy] = { winRate: 0, avgProfit: 0, trades: 0, wins: 0, totalProfit: 0 };
                }

                performance[trade.strategy].trades++;
                performance[trade.strategy].totalProfit += trade.profit || 0;

                if (trade.status === 'won') {
                    performance[trade.strategy].wins++;
                }
            }
        });

        // Calculate final metrics
        Object.keys(performance).forEach(strategy => {
            const data = performance[strategy];
            data.winRate = data.trades > 0 ? data.wins / data.trades : 0;
            data.avgProfit = data.trades > 0 ? data.totalProfit / data.trades : 0;

            // Clean up temporary fields
            delete (data as Record<string, unknown>).wins;
            delete (data as Record<string, unknown>).totalProfit;
        });

        return performance as Record<string, { winRate: number; avgProfit: number; trades: number }>;
    }

    /**
     * Manually recalculate profit for all completed trades (debug method)
     */
    recalculateAllProfits(): void {
        console.log('🔄 Recalculating profits for all completed trades...');

        const completedTrades = this.trades.filter(t => t.status === 'won' || t.status === 'lost');

        completedTrades.forEach(trade => {
            if (trade.contractId) {
                console.log(
                    `🔄 Rechecking contract ${trade.contractId} - Current status: ${trade.status}, Profit: ${trade.profit}`
                );

                // Request fresh contract data
                this.checkContractStatus(trade);
            }
        });

        console.log(`🔄 Triggered recalculation for ${completedTrades.length} completed trades`);
    }

    /**
     * Get detailed profit breakdown for debugging
     */
    getProfitBreakdown(): { totalCalculated: number; tradeCount: number; trades: any[] } {
        const completedTrades = this.trades.filter(t => t.status === 'won' || t.status === 'lost');
        const totalCalculated = completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

        return {
            totalCalculated,
            tradeCount: completedTrades.length,
            trades: completedTrades.map(t => ({
                id: t.id,
                contractId: t.contractId,
                status: t.status,
                profit: t.profit,
                stake: t.stake,
                strategy: t.strategy,
            })),
        };
    }

    /**
     * Auto-switch to best performing strategy
     */
    autoSwitchToBestStrategy(): void {
        if (!this.config || !this.advancedConfig?.autoStrategySwitch) return;

        const performance = this.getStrategyPerformance();
        const strategies = Object.keys(performance);

        if (strategies.length < 2) return; // Need at least 2 strategies to compare

        // Find best strategy by win rate, then by average profit
        let bestStrategy = strategies[0];
        let bestScore = performance[bestStrategy].winRate + performance[bestStrategy].avgProfit * 0.1;

        strategies.forEach(strategy => {
            const score = performance[strategy].winRate + performance[strategy].avgProfit * 0.1;
            if (
                score > bestScore &&
                performance[strategy].trades >= this.advancedConfig!.strategyPerformanceWindow / 4
            ) {
                bestStrategy = strategy;
                bestScore = score;
            }
        });

        if (bestStrategy !== this.config.strategy) {
            console.log(
                `🎯 Auto-switching from ${this.config.strategy} to ${bestStrategy} (score: ${bestScore.toFixed(3)})`
            );
            this.config.strategy = bestStrategy as ZenTradeConfig['strategy'];
        }
    }
}

// Export singleton instance
export const zenTradingService = new ZenTradingService();
