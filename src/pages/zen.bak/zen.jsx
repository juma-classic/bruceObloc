import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MovableTickDisplay } from '@/components/fast-lane/MovableTickDisplay';
import TradingEngine from '@/components/fast-lane/TradingEngine';
import TransactionHistory from '@/components/fast-lane/TransactionHistory';
import { TickDrivenDashboard } from '@/components/tick-driven/TickDrivenDashboard';
import { ZenDigitFrequency } from '@/components/zen/ZenDigitFrequency';
import { ZenUltraFastEngine } from '@/components/zen/ZenUltraFastEngine';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { useOneTradePerGesture } from '@/hooks/useOneTradePerGesture';
import './zen.scss';

const Zen = () => {
    const { isAuthorized, connectionStatus } = useApiBase();
    const { client } = useStore();
    const accountBalance = typeof client.balance === 'number' ? client.balance : parseFloat(client.balance) || 0;

    const [transactions, setTransactions] = useState([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isAutoTrading, setIsAutoTrading] = useState(false);
    const [showMovableTick, setShowMovableTick] = useState(false);
    const [showDigitFrequency, setShowDigitFrequency] = useState(false);
    const [showTickDriven, setShowTickDriven] = useState(false);
    const [currentTick, setCurrentTick] = useState(0);
    const [lastDigit, setLastDigit] = useState(0);
    // Removed unused tickHistory state
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    // Tick-driven engine state
    const [tickDrivenActive, setTickDrivenActive] = useState(false);
    const [tickStats, setTickStats] = useState({
        totalTicks: 0,
        digitChanges: 0,
        changeRate: 0,
        currentDigit: 0,
        queueSize: 0,
    });
    const [tradeRules, setTradeRules] = useState([]);
    const containerRef = useRef(null);

    // Market selection state
    const [selectedMarkets, setSelectedMarkets] = useState(['R_50', 'R_25', 'R_10']);

    // Strategy selection state
    const [selectedStrategies, setSelectedStrategies] = useState(['DIGITEVEN', 'DIGITODD', 'CALL', 'PUT']);
    const [availableStrategies] = useState([
        {
            id: 'DIGITEVEN',
            name: 'Even',
            description: 'Last digit is even (0,2,4,6,8)',
            color: '#14b8a6',
            category: 'Digits',
        },
        {
            id: 'DIGITODD',
            name: 'Odd',
            description: 'Last digit is odd (1,3,5,7,9)',
            color: '#3b82f6',
            category: 'Digits',
        },
        {
            id: 'DIGITMATCHES',
            name: 'Matches',
            description: 'Last digit matches prediction',
            color: '#8b5cf6',
            category: 'Digits',
        },
        {
            id: 'DIGITDIFFERS',
            name: 'Differs',
            description: 'Last digit differs from prediction',
            color: '#f59e0b',
            category: 'Digits',
        },
        {
            id: 'DIGITOVER',
            name: 'Over',
            description: 'Last digit is over barrier',
            color: '#ef4444',
            category: 'Digits',
        },
        {
            id: 'DIGITUNDER',
            name: 'Under',
            description: 'Last digit is under barrier',
            color: '#06b6d4',
            category: 'Digits',
        },
        { id: 'CALL', name: 'Rise', description: 'Price will rise at expiry', color: '#10b981', category: 'Rise/Fall' },
        { id: 'PUT', name: 'Fall', description: 'Price will fall at expiry', color: '#dc2626', category: 'Rise/Fall' },
    ]);
    const [availableMarkets] = useState([
        // Standard Volatility Indices
        { id: 'R_10', name: 'Volatility 10', type: 'Volatility', color: '#10b981' },
        { id: 'R_25', name: 'Volatility 25', type: 'Volatility', color: '#3b82f6' },
        { id: 'R_50', name: 'Volatility 50', type: 'Volatility', color: '#8b5cf6' },
        { id: 'R_75', name: 'Volatility 75', type: 'Volatility', color: '#f59e0b' },
        { id: 'R_100', name: 'Volatility 100', type: 'Volatility', color: '#ef4444' },

        // 1-Second Volatility Indices
        { id: '1HZ10V', name: 'Volatility 10 (1s)', type: '1-Second', color: '#14b8a6' },
        { id: '1HZ25V', name: 'Volatility 25 (1s)', type: '1-Second', color: '#06b6d4' },
        { id: '1HZ50V', name: 'Volatility 50 (1s)', type: '1-Second', color: '#6366f1' },
        { id: '1HZ75V', name: 'Volatility 75 (1s)', type: '1-Second', color: '#f97316' },
        { id: '1HZ100V', name: 'Volatility 100 (1s)', type: '1-Second', color: '#dc2626' },

        // Bear/Bull Market Indices
        { id: 'RDBEAR', name: 'Bear Market', type: 'Volatility', color: '#991b1b' },
        { id: 'RDBULL', name: 'Bull Market', type: 'Volatility', color: '#059669' },

        // Boom Indices
        { id: 'BOOM1000', name: 'Boom 1000', type: 'Volatility', color: '#7c3aed' },
        { id: 'BOOM500', name: 'Boom 500', type: 'Volatility', color: '#8b5cf6' },
        { id: 'BOOM300', name: 'Boom 300', type: 'Volatility', color: '#a855f7' },

        // Crash Indices
        { id: 'CRASH1000', name: 'Crash 1000', type: 'Volatility', color: '#dc2626' },
        { id: 'CRASH500', name: 'Crash 500', type: 'Volatility', color: '#ef4444' },
        { id: 'CRASH300', name: 'Crash 300', type: 'Volatility', color: '#f87171' },

        // Step Indices
        { id: 'stpRNG', name: 'Step Index', type: 'Volatility', color: '#0891b2' },

        // Volatility Basket Indices
        { id: 'WLDAUD', name: 'AUD Basket', type: 'Volatility', color: '#f59e0b' },
        { id: 'WLDEUR', name: 'EUR Basket', type: 'Volatility', color: '#3b82f6' },
        { id: 'WLDGBP', name: 'GBP Basket', type: 'Volatility', color: '#10b981' },
        { id: 'WLDUSD', name: 'USD Basket', type: 'Volatility', color: '#059669' },

        // Jump Indices
        { id: 'JD10', name: 'Jump 10', type: 'Volatility', color: '#7c2d12' },
        { id: 'JD25', name: 'Jump 25', type: 'Volatility', color: '#166534' },
        { id: 'JD50', name: 'Jump 50', type: 'Volatility', color: '#0f766e' },
        { id: 'JD75', name: 'Jump 75', type: 'Volatility', color: '#0d9488' },
        { id: 'JD100', name: 'Jump 100', type: 'Volatility', color: '#14b8a6' },
    ]);

    // Collapsible sections state for mobile
    const [collapsedSections, setCollapsedSections] = useState({
        history: false,
    });
    const [settings, setSettings] = useState({
        market: 'R_50',
        tradeType: 'DIGITEVEN',
        stake: 0.35,
        duration: 1,
        barrier: '5',
        prediction: 2,
        stopLoss: 50, // Lower default stop loss
        takeProfit: 100, // Lower default take profit
        maxConsecutiveLosses: 5, // Increased from 3 for better resilience
        dailyLossLimit: 200, // Lower daily limit for safety
        targetTrades: 100, // Increased for longer trading sessions
        delayBetweenTrades: 500, // Reduced delay for faster trading
        strategy: 'momentum',
        // Martingale defaults
        enableMartingale: true, // Enable by default to enforce Martingale
        martingaleMultiplier: 2,
        martingaleMaxSteps: 3, // Reduced max steps for safety
        martingaleResetOnWin: true,
        autoContinueOnLoss: true, // Automatically continue trading after losses
        // Stop After Wins defaults
        stopAfterWins: true, // Enable by default
        stopAfterWinsCount: 10, // Increased target
        // Trade Every Tick defaults (Enhanced - price change based)
        enableTickTrading: false,
        tickTradingMaxTrades: 50, // Reduced for safety
        // Ultra-Fast Mode defaults (Multiple trades per price change)
        ultraFastMode: false,
        fireAndForget: true,
        maxConcurrentTrades: 5,
        batchBalanceUpdates: true,
        ultraFastInterval: 50, // 50ms intervals for multiple trades
        tradesPerPriceChange: 3, // 3 trades per price change
        // One Trade Per Cursor Movement safety feature
        oneTradePerGesture: false,
        // Additional settings for configuration
        switchOnLoss: false,
        switchMarket: false,
        mainMode: false,
        lossesToSwitch: 1,
        rounds: 1,
        delay: false,
    });

    const handleSettingsChange = newSettings => {
        setSettings(newSettings);
        console.log('⚙️ Settings updated:', newSettings);
    };

    // Initialize One Trade Per Gesture hook (simplified build-friendly version)
    const gestureHook = useOneTradePerGesture({
        enabled: settings.oneTradePerGesture,
        debounceMs: 400, // 400ms debounce timer
    });

    // Market selection functions
    const handleMarketToggle = marketId => {
        setSelectedMarkets(prev => {
            const isSelected = prev.includes(marketId);
            let newSelection;

            if (isSelected) {
                // Remove market (but keep at least one selected)
                newSelection = prev.length > 1 ? prev.filter(id => id !== marketId) : prev;
            } else {
                // Add market
                newSelection = [...prev, marketId];
            }

            console.log('🔄 Market selection updated:', newSelection);

            // If current market is not in selection, switch to first selected market
            if (!newSelection.includes(settings.market)) {
                handleSettingsChange({ ...settings, market: newSelection[0] });
            }

            return newSelection;
        });
    };

    // Strategy selection functions
    const handleStrategyToggle = strategyId => {
        setSelectedStrategies(prev => {
            const isSelected = prev.includes(strategyId);
            let newSelection;

            if (isSelected) {
                // Remove strategy (but keep at least one selected)
                newSelection = prev.length > 1 ? prev.filter(id => id !== strategyId) : prev;
            } else {
                // Add strategy
                newSelection = [...prev, strategyId];
            }

            console.log('🔄 Strategy selection updated:', newSelection);

            // If current strategy is not in selection, switch to first selected strategy
            if (!newSelection.includes(settings.tradeType)) {
                handleSettingsChange({ ...settings, tradeType: newSelection[0] });
            }

            return newSelection;
        });
    };

    // Enhanced configuration validation with real-time feedback
    const validateConfiguration = () => {
        const issues = [];
        const warnings = [];

        // Critical validation issues
        if (settings.stake < 0.35) issues.push('Stake must be at least $0.35');
        if (settings.stake > accountBalance) issues.push('Stake exceeds account balance');
        if (settings.takeProfit && settings.takeProfit > 0 && settings.takeProfit <= settings.stake)
            issues.push('Take profit should be higher than stake');
        if (settings.stopLoss && settings.stopLoss > 0 && settings.stopLoss <= settings.stake)
            issues.push('Stop loss should be higher than stake');
        if (settings.martingaleMultiplier && settings.martingaleMultiplier < 1)
            issues.push('Martingale multiplier must be at least 1');

        // Enhanced Martingale validation
        if (settings.enableMartingale) {
            if (settings.martingaleMultiplier < 1.1) {
                warnings.push('Martingale multiplier below 1.1 may not be effective');
            }
            if (settings.martingaleMaxSteps > 5) {
                warnings.push('Martingale max steps above 5 can be very risky');
            }
            const maxStake = settings.stake * Math.pow(settings.martingaleMultiplier, settings.martingaleMaxSteps);
            if (maxStake > accountBalance * 0.5) {
                warnings.push(`Martingale max stake (${maxStake.toFixed(2)}) could exceed 50% of balance`);
            }
        }

        // Advanced feature validation
        if (settings.switchOnLoss && (!settings.lossesToSwitch || settings.lossesToSwitch < 1)) {
            issues.push('Losses to switch must be at least 1 when Switch on Loss is enabled');
        }
        if (settings.switchMarket && !settings.switchOnLoss) {
            warnings.push('Switch Market works best with Switch on Loss enabled');
        }
        if (settings.switchMarket && selectedMarkets.length < 2) {
            issues.push('Select at least 2 markets when Switch Market is enabled');
        }
        if (settings.switchOnLoss && selectedStrategies.length < 2) {
            issues.push('Select at least 2 strategies when Switch on Loss is enabled');
        }
        if (settings.mainMode && (settings.rounds || 1) < 5) {
            warnings.push('Main Mode recommended with at least 5 rounds');
        }
        if (settings.delay && settings.delayBetweenTrades < 100) {
            issues.push('Delay must be at least 100ms when enabled');
        }

        // Risk management warnings
        if (settings.stake > accountBalance * 0.1) {
            warnings.push('Stake is more than 10% of balance - high risk');
        }
        if ((!settings.stopLoss || settings.stopLoss <= 0) && (!settings.takeProfit || settings.takeProfit <= 0)) {
            warnings.push('Consider setting stop loss or take profit for risk management');
        }

        return { issues, warnings };
    };

    const validation = validateConfiguration();
    const configIssues = validation.issues;
    const configWarnings = validation.warnings;
    const isConfigValid = configIssues.length === 0;

    const tradingEngineRef = useRef(null);
    const ultraFastEngineRef = useRef(null);
    const [ultraFastStats, setUltraFastStats] = useState({
        totalTrades: 0,
        tradesPerSecond: 0,
        avgExecutionTime: 0,
        fastestExecution: 0,
        slowestExecution: 0,
        activeTrades: 0,
        queuedTrades: 0,
    });

    // Centralized Martingale state management
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [martingaleStep, setMartingaleStep] = useState(0);

    const handleTradeExecuted = transaction => {
        console.log('📥 Zen received trade:', transaction);

        // Ensure trading engines are ready for next trade
        const ensureEngineReadiness = async () => {
            // Small delay to allow trade settlement
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reset any stuck states in trading engines
            if (tradingEngineRef.current) {
                // Force reset of tick reference and trading flags
                console.log('🔄 Ensuring TradingEngine readiness for next trade...');
            }

            if (ultraFastEngineRef.current) {
                // Ensure ultra-fast engine is ready
                console.log('🔄 Ensuring UltraFastEngine readiness for next trade...');
            }
        };

        // Update centralized Martingale state based on trade result
        if (settings.enableMartingale) {
            const isWin = transaction.profit > 0 || transaction.status === 'win';

            console.log('🎯 Centralized Martingale Update:', {
                isWin,
                profit: transaction.profit,
                status: transaction.status,
                currentConsecutiveLosses: consecutiveLosses,
                enableMartingale: settings.enableMartingale,
            });

            if (isWin) {
                // Reset on win
                if (settings.martingaleResetOnWin !== false) {
                    console.log('✅ Win - Resetting centralized Martingale to base stake');
                    setConsecutiveLosses(0);
                    setMartingaleStep(0);
                }

                // Ensure engines are ready after win
                ensureEngineReadiness();
            } else {
                // Increase step on loss
                const newConsecutiveLosses = consecutiveLosses + 1;
                const maxSteps = settings.martingaleMaxSteps || 3;
                const newStep = Math.min(newConsecutiveLosses, maxSteps);

                console.log('❌ Loss - Increasing centralized Martingale:', {
                    newConsecutiveLosses,
                    newStep,
                    nextStake: settings.stake * Math.pow(settings.martingaleMultiplier || 2, newStep),
                });

                setConsecutiveLosses(newConsecutiveLosses);
                setMartingaleStep(newStep);

                // Ensure engines are ready after loss
                ensureEngineReadiness();

                // Auto-continue trading after loss if enabled
                if (settings.autoContinueOnLoss && !isAutoTrading && newConsecutiveLosses <= maxSteps) {
                    console.log('🔄 Auto-continuing trading after loss with Martingale progression:', {
                        consecutiveLosses: newConsecutiveLosses,
                        maxSteps,
                        nextStake: settings.stake * Math.pow(settings.martingaleMultiplier || 2, newStep),
                        willContinue: true,
                    });

                    // Longer delay to ensure proper state reset and engine readiness
                    setTimeout(async () => {
                        await ensureEngineReadiness();
                        console.log('🚀 Auto-restart: Executing next trade with Martingale stake');
                        handleRunButtonClick();
                    }, 2000); // 2 second delay for complete state reset
                } else if (settings.autoContinueOnLoss && newConsecutiveLosses > maxSteps) {
                    console.log('⚠️ Auto-continue stopped: Maximum Martingale steps reached', {
                        consecutiveLosses: newConsecutiveLosses,
                        maxSteps,
                        message: 'Manual restart required',
                    });
                }
            }
        } else {
            // Even without Martingale, ensure engines are ready for next manual trade
            ensureEngineReadiness();
        }

        setTransactions(prev => {
            const updated = [transaction, ...prev];
            console.log('📊 Updated transactions array:', updated.length, 'trades');
            return updated;
        });
    };

    // Calculate current Martingale stake (centralized)
    const getCurrentMartingaleStake = () => {
        if (!settings.enableMartingale || consecutiveLosses === 0) {
            return settings.stake;
        }

        const multiplier = settings.martingaleMultiplier || 2;
        const maxSteps = settings.martingaleMaxSteps || 3;
        const effectiveStep = Math.min(consecutiveLosses, maxSteps);

        const calculatedStake = settings.stake * Math.pow(multiplier, effectiveStep);

        console.log('🎯 Centralized Martingale Stake Calculation:', {
            baseStake: settings.stake,
            consecutiveLosses,
            effectiveStep,
            multiplier,
            calculatedStake,
            enabled: settings.enableMartingale,
        });

        return calculatedStake;
    };

    // Reset Martingale when settings change
    useEffect(() => {
        console.log('⚙️ Settings changed - Resetting centralized Martingale');
        setConsecutiveLosses(0);
        setMartingaleStep(0);
    }, [settings.stake, settings.enableMartingale, settings.martingaleMultiplier, settings.martingaleMaxSteps]);

    const handleTickUpdate = (tick, digit) => {
        setCurrentTick(tick);
        setLastDigit(digit);
        // Removed tick history update as it's now handled by ZenDigitFrequency component
    };

    const handleAutoTradingChange = isActive => {
        setIsAutoTrading(isActive);
        console.log('🔄 Auto-trading state changed:', isActive);
    };

    const handleUltraFastStatsUpdate = stats => {
        setUltraFastStats(stats);
    };

    const handleSpeedUpdate = speed => {
        console.log(`⚡ Speed update: ${speed.toFixed(2)} TPS`);
    };

    // Tick-driven engine handlers
    const handleStartTickDriven = async () => {
        console.log('🚀 Starting tick-driven engine');
        if (ultraFastEngineRef.current?.startTickDriven) {
            await ultraFastEngineRef.current.startTickDriven();
            setTickDrivenActive(true);
        }
    };

    const handleStopTickDriven = () => {
        console.log('🛑 Stopping tick-driven engine');
        if (ultraFastEngineRef.current?.stopTickDriven) {
            ultraFastEngineRef.current.stopTickDriven();
            setTickDrivenActive(false);
        }
    };

    const handleAddTradeRule = rule => {
        console.log('📋 Adding trade rule:', rule);
        if (ultraFastEngineRef.current?.addRule) {
            ultraFastEngineRef.current.addRule(rule);
            setTradeRules(prev => [...prev, rule]);
        }
    };

    const handleDeleteTradeRule = ruleId => {
        console.log('🗑️ Deleting trade rule:', ruleId);
        if (ultraFastEngineRef.current?.removeRule) {
            ultraFastEngineRef.current.removeRule(ruleId);
            setTradeRules(prev => prev.filter(rule => rule.id !== ruleId));
        }
    };

    const handleToggleTradeRule = (ruleId, enabled) => {
        console.log(`🔄 Toggling trade rule ${ruleId}:`, enabled);
        if (ultraFastEngineRef.current?.toggleRule) {
            ultraFastEngineRef.current.toggleRule(ruleId, enabled);
            setTradeRules(prev => prev.map(rule => (rule.id === ruleId ? { ...rule, enabled } : rule)));
        }
    };

    // Update tick stats periodically when tick-driven mode is active
    useEffect(() => {
        if (!tickDrivenActive) return;

        const interval = setInterval(() => {
            if (ultraFastEngineRef.current?.getTickStats) {
                const stats = ultraFastEngineRef.current.getTickStats();
                setTickStats(stats);
            }
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, [tickDrivenActive]);

    const handleRunButtonClick = async () => {
        console.log('🚀 Starting auto-trading via RUN button');

        // Check gesture safety before starting
        if (settings.oneTradePerGesture && !canExecuteTradeWithSafety()) {
            console.log('❌ Trade blocked by gesture safety - cursor movement not stabilized');
            return;
        }

        // Force reset any stuck states before starting new trading session
        console.log('🔄 Pre-start: Ensuring clean state for new trading session...');

        // Brief pause to ensure any previous operations are complete
        await new Promise(resolve => setTimeout(resolve, 100));

        if (settings.ultraFastMode && settings.enableTickTrading) {
            // Ultra-Fast Mode: Multiple trades per price change (3 trades every 50ms)
            console.log('⚡ Starting Ultra-Fast Engine - Multiple trades per price change');

            // Ensure ultra-fast engine is properly reset before starting
            if (ultraFastEngineRef.current?.stop) {
                ultraFastEngineRef.current.stop();
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (ultraFastEngineRef.current?.start) {
                ultraFastEngineRef.current.start();
            }
        } else if (settings.enableTickTrading) {
            // Every Tick Mode: One trade per price change (like current Ultra-Fast behavior)
            console.log('🔄 Starting Every Tick Mode - One trade per price change');

            // Ensure trading engine is properly reset before starting
            if (tradingEngineRef.current?.handleStopAuto) {
                await tradingEngineRef.current.handleStopAuto();
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (tradingEngineRef.current?.handleStartAuto) {
                tradingEngineRef.current.handleStartAuto();
            }
        } else {
            // Normal Mode: Time-based trading with delays
            console.log('🔄 Starting Normal Trading Engine - Time-based with delays');

            // Ensure trading engine is properly reset before starting
            if (tradingEngineRef.current?.handleStopAuto) {
                await tradingEngineRef.current.handleStopAuto();
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (tradingEngineRef.current?.handleStartAuto) {
                tradingEngineRef.current.handleStartAuto();
            }
        }

        console.log('✅ Trading session start sequence completed');
        // Don't manually set state - let engines handle it via callback
    };

    const handleStopButtonClick = async () => {
        console.log('🛑 Stopping auto-trading via STOP button');

        // Stop both engines (only active one will respond)
        if (ultraFastEngineRef.current?.stop) {
            ultraFastEngineRef.current.stop();
        }
        if (tradingEngineRef.current?.handleStopAuto) {
            await tradingEngineRef.current.handleStopAuto();
        }
        // Don't manually set state - let engines handle it via callback
    };

    const handleExport = () => {
        console.log('📤 Export button clicked - transactions count:', transactions.length);
        // The actual export functionality is handled in TransactionHistory component
        // This is just a callback for additional actions if needed
        if (transactions.length > 0) {
            console.log('✅ Export initiated for', transactions.length, 'transactions');
        } else {
            console.log('⚠️ No transactions to export');
        }
    };

    const handleReset = async () => {
        console.log('🔄 Reset button clicked - current transactions:', transactions.length);

        // Always allow reset, even with no transactions (to reset engine state)
        const confirmed =
            transactions.length > 0
                ? window.confirm(
                      `Are you sure you want to clear all ${transactions.length} transactions and reset the trading engines? This cannot be undone.`
                  )
                : window.confirm('Reset all trading engines and clear any cached state?');

        if (confirmed) {
            console.log('🔄 Comprehensive reset starting...');

            // 1. Stop all trading activities first
            if (isAutoTrading) {
                console.log('🛑 Stopping active trading before reset...');
                await handleStopButtonClick();

                // Wait a moment for engines to fully stop
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 2. Reset transaction history
            setTransactions([]);

            // 3. Reset all local state
            setCurrentTick(0);
            setLastDigit(0);
            setTickDrivenActive(false);
            setTickStats({
                totalTicks: 0,
                digitChanges: 0,
                changeRate: 0,
                currentDigit: 0,
                queueSize: 0,
            });

            // 4. Reset trading engines via their refs
            if (tradingEngineRef.current?.handleStopAuto) {
                console.log('🔄 Resetting TradingEngine state...');
                await tradingEngineRef.current.handleStopAuto();
            }

            if (ultraFastEngineRef.current?.stop) {
                console.log('🔄 Resetting UltraFastEngine state...');
                ultraFastEngineRef.current.stop();
            }

            if (ultraFastEngineRef.current?.stopTickDriven) {
                console.log('🔄 Resetting TickDriven state...');
                ultraFastEngineRef.current.stopTickDriven();
            }

            // 5. Force component re-render by updating a key state
            setIsAutoTrading(false);

            console.log('✅ Comprehensive reset completed successfully');

            // Show success message
            setTimeout(() => {
                console.log('📊 All systems reset - ready for new trading session');
            }, 100);
        } else {
            console.log('❌ Reset cancelled by user');
        }
    };

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                const scrollTop = containerRef.current.scrollTop;
                setShowScrollTop(scrollTop > 300);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const scrollToTop = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    };

    const toggleSection = section => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    // Handle cursor movement for gesture detection
    const handleMouseMove = useCallback(() => {
        if (settings.oneTradePerGesture) {
            gestureHook.notifyCursorMove();
        }
    }, [settings.oneTradePerGesture, gestureHook]);

    // Enhanced trade execution with gesture safety
    const canExecuteTradeWithSafety = useCallback(() => {
        if (settings.oneTradePerGesture) {
            return gestureHook.canExecuteTrade();
        }
        return true; // Feature disabled - allow trade
    }, [settings.oneTradePerGesture, gestureHook]);

    // Notify gesture hook when trade is executed
    const notifyTradeExecutedWithGesture = useCallback((transaction) => {
        if (settings.oneTradePerGesture) {
            gestureHook.notifyTradeExecuted();
        }
        // Continue with normal trade handling
        handleTradeExecuted(transaction);
    }, [settings.oneTradePerGesture, gestureHook, handleTradeExecuted]);

    return (
        <div className={`zen-container ${isDarkTheme ? 'theme-dark' : 'theme-light'}`} onMouseMove={handleMouseMove}>
            <div className='zen' ref={containerRef}>
                <div className='zen__header'>
                    <div className='zen__title-section'>
                        <h1 className='zen__title'>
                            Zen Trading
                            <span className='zen__pro-badge'>PRO</span>
                        </h1>
                        <div className='zen__header-buttons'>
                            <button
                                className={`zen__digit-frequency-btn ${showDigitFrequency ? 'active' : ''}`}
                                onClick={() => setShowDigitFrequency(!showDigitFrequency)}
                                title={
                                    showDigitFrequency
                                        ? 'Hide digit frequency analysis'
                                        : 'Show digit frequency analysis'
                                }
                            >
                                🎯 {showDigitFrequency ? 'Hide' : 'Show'} Digit Stats
                            </button>
                            <button
                                className={`zen__movable-tick-toggle ${showMovableTick ? 'active' : ''}`}
                                onClick={() => setShowMovableTick(!showMovableTick)}
                                title={showMovableTick ? 'Hide movable tick display' : 'Show movable tick display'}
                            >
                                📊 {showMovableTick ? 'Hide' : 'Show'} Movable Tick
                            </button>
                            <button
                                className={`zen__tick-driven-toggle ${showTickDriven ? 'active' : ''}`}
                                onClick={() => setShowTickDriven(!showTickDriven)}
                                title={showTickDriven ? 'Hide tick-driven engine' : 'Show tick-driven engine'}
                            >
                                🎯 {showTickDriven ? 'Hide' : 'Show'} Tick Engine
                            </button>
                            <button
                                className={`zen__theme-toggle ${!isDarkTheme ? 'active' : ''}`}
                                onClick={() => setIsDarkTheme(!isDarkTheme)}
                                title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                            >
                                {isDarkTheme ? '☀️ Light' : '🌙 Dark'}
                            </button>
                        </div>
                    </div>
                    <p className='zen__description'>
                        Professional trading with advanced algorithms, risk management, and real-time analytics
                    </p>
                </div>

                {/* HORIZONTAL SCROLLABLE SELECTOR */}
                <div className='zen__horizontal-selector'>
                    <div className='zen__horizontal-selector-header'>
                        <h2>🎯 Quick Selection</h2>
                        <div className='zen__horizontal-selector-status'>
                            <span className={`zen__switch-status ${settings.switchMarket ? 'active' : 'inactive'}`}>
                                {settings.switchMarket ? '🔄 Market Switch: ON' : '🔒 Market Switch: OFF'}
                            </span>
                            <span className={`zen__switch-status ${settings.switchOnLoss ? 'active' : 'inactive'}`}>
                                {settings.switchOnLoss ? '🔄 Strategy Switch: ON' : '🔒 Strategy Switch: OFF'}
                            </span>
                        </div>
                    </div>

                    <div className='zen__horizontal-scroll-container'>
                        <div className='zen__horizontal-scroll-content'>
                            {/* Markets Section */}
                            <div className='zen__horizontal-section'>
                                <div className='zen__horizontal-section-title'>Markets</div>
                                <div className='zen__horizontal-items'>
                                    {availableMarkets.map(market => {
                                        const isSelected = selectedMarkets.includes(market.id);
                                        const isCurrent = settings.market === market.id;

                                        return (
                                            <div
                                                key={market.id}
                                                className={`zen__horizontal-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                                                onClick={() => {
                                                    if (settings.switchMarket || isCurrent) {
                                                        handleMarketToggle(market.id);
                                                    } else {
                                                        // Direct selection when switch is off
                                                        handleSettingsChange({ ...settings, market: market.id });
                                                    }
                                                }}
                                                style={{ '--item-color': market.color }}
                                            >
                                                <div
                                                    className='zen__horizontal-item-indicator'
                                                    style={{ backgroundColor: market.color }}
                                                >
                                                    {isSelected ? '✓' : '○'}
                                                </div>
                                                <div className='zen__horizontal-item-name'>{market.name}</div>
                                                <div className='zen__horizontal-item-id'>{market.id}</div>
                                                {isCurrent && <div className='zen__horizontal-current-badge'>●</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Strategies Section */}
                            <div className='zen__horizontal-section'>
                                <div className='zen__horizontal-section-title'>Strategies</div>
                                <div className='zen__horizontal-items'>
                                    {availableStrategies.map(strategy => {
                                        const isSelected = selectedStrategies.includes(strategy.id);
                                        const isCurrent = settings.tradeType === strategy.id;

                                        return (
                                            <div
                                                key={strategy.id}
                                                className={`zen__horizontal-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                                                onClick={() => {
                                                    if (settings.switchOnLoss || isCurrent) {
                                                        handleStrategyToggle(strategy.id);
                                                    } else {
                                                        // Direct selection when switch is off
                                                        handleSettingsChange({ ...settings, tradeType: strategy.id });
                                                    }
                                                }}
                                                style={{ '--item-color': strategy.color }}
                                            >
                                                <div
                                                    className='zen__horizontal-item-indicator'
                                                    style={{ backgroundColor: strategy.color }}
                                                >
                                                    {isSelected ? '✓' : '○'}
                                                </div>
                                                <div className='zen__horizontal-item-name'>{strategy.name}</div>
                                                <div className='zen__horizontal-item-description'>
                                                    {strategy.description}
                                                </div>
                                                {isCurrent && <div className='zen__horizontal-current-badge'>●</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ZEN-STYLE CONFIGURATION GRID */}
                <div className='zen__zen-config'>
                    {/* Row 1 */}
                    <div className='zen__config-row'>
                        <div className='zen__config-group'>
                            <label>Market</label>
                            <select
                                value={settings.market}
                                onChange={e => handleSettingsChange({ ...settings, market: e.target.value })}
                            >
                                <optgroup label='Standard Volatility'>
                                    <option value='R_10'>Volatility 10 Index</option>
                                    <option value='R_25'>Volatility 25 Index</option>
                                    <option value='R_50'>Volatility 50 Index</option>
                                    <option value='R_75'>Volatility 75 Index</option>
                                    <option value='R_100'>Volatility 100 Index</option>
                                </optgroup>
                                <optgroup label='1-Second Volatility'>
                                    <option value='1HZ10V'>Volatility 10 (1s)</option>
                                    <option value='1HZ25V'>Volatility 25 (1s)</option>
                                    <option value='1HZ50V'>Volatility 50 (1s)</option>
                                    <option value='1HZ75V'>Volatility 75 (1s)</option>
                                    <option value='1HZ100V'>Volatility 100 (1s)</option>
                                </optgroup>
                                <optgroup label='Boom/Crash'>
                                    <option value='BOOM1000'>Boom 1000</option>
                                    <option value='BOOM500'>Boom 500</option>
                                    <option value='BOOM300'>Boom 300</option>
                                    <option value='CRASH1000'>Crash 1000</option>
                                    <option value='CRASH500'>Crash 500</option>
                                    <option value='CRASH300'>Crash 300</option>
                                </optgroup>
                                <optgroup label='Jump Indices'>
                                    <option value='JD10'>Jump 10</option>
                                    <option value='JD25'>Jump 25</option>
                                    <option value='JD50'>Jump 50</option>
                                    <option value='JD75'>Jump 75</option>
                                    <option value='JD100'>Jump 100</option>
                                </optgroup>
                            </select>
                            <div className='zen__market-info'>🟠 Volatility • Normal • High</div>
                        </div>

                        <div className='zen__config-group'>
                            <label>Default Stake</label>
                            <input
                                type='number'
                                value={settings.stake}
                                onChange={e =>
                                    handleSettingsChange({ ...settings, stake: parseFloat(e.target.value) || 0.35 })
                                }
                                min='0.35'
                                step='0.01'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Martingale Multiplier</label>
                            <input
                                type='number'
                                value={settings.martingaleMultiplier}
                                onChange={e =>
                                    handleSettingsChange({
                                        ...settings,
                                        martingaleMultiplier: parseFloat(e.target.value) || 2,
                                    })
                                }
                                min='1'
                                step='0.01'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Enable Martingale</label>
                            <button
                                className={`zen__working-toggle ${settings.enableMartingale ? 'zen__working-toggle--active' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.enableMartingale;
                                    handleSettingsChange({ ...settings, enableMartingale: newValue });
                                    console.log('🎯 Martingale:', newValue ? 'ENABLED' : 'DISABLED');
                                }}
                                title={
                                    settings.enableMartingale
                                        ? 'Click to disable Martingale progression'
                                        : 'Click to enable Martingale progression (increases stake after losses)'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.enableMartingale ? '📈' : '📊'}</span>
                                <span className='zen__toggle-text'>{settings.enableMartingale ? 'ON' : 'OFF'}</span>
                                <span className='zen__toggle-status'>
                                    {settings.enableMartingale ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </button>
                            <div className='zen__button-description'>
                                Increases stake by {settings.martingaleMultiplier}x after each loss (max{' '}
                                {settings.martingaleMaxSteps} steps)
                            </div>
                            {settings.enableMartingale && (
                                <div className='zen__toggle-info'>
                                    Next stakes: {settings.stake.toFixed(2)} →{' '}
                                    {(settings.stake * settings.martingaleMultiplier).toFixed(2)} →{' '}
                                    {(settings.stake * Math.pow(settings.martingaleMultiplier, 2)).toFixed(2)} →{' '}
                                    {(settings.stake * Math.pow(settings.martingaleMultiplier, 3)).toFixed(2)}
                                </div>
                            )}
                        </div>

                        {settings.enableMartingale && (
                            <div className='zen__config-group'>
                                <label>Auto-Continue on Loss</label>
                                <button
                                    className={`zen__working-toggle ${settings.autoContinueOnLoss ? 'zen__working-toggle--active' : ''}`}
                                    onClick={() => {
                                        const newValue = !settings.autoContinueOnLoss;
                                        handleSettingsChange({ ...settings, autoContinueOnLoss: newValue });
                                        console.log('🔄 Auto-Continue on Loss:', newValue ? 'ENABLED' : 'DISABLED');
                                    }}
                                    title={
                                        settings.autoContinueOnLoss
                                            ? 'Click to disable auto-continue (system will stop after losses)'
                                            : 'Click to enable auto-continue (system will automatically continue trading after losses with Martingale)'
                                    }
                                >
                                    <span className='zen__toggle-icon'>
                                        {settings.autoContinueOnLoss ? '🔄' : '⏸️'}
                                    </span>
                                    <span className='zen__toggle-text'>
                                        {settings.autoContinueOnLoss ? 'ON' : 'OFF'}
                                    </span>
                                    <span className='zen__toggle-status'>
                                        {settings.autoContinueOnLoss ? 'AUTO-CONTINUE' : 'MANUAL-RESTART'}
                                    </span>
                                </button>
                                <div className='zen__button-description'>
                                    Automatically continues trading after losses to apply Martingale progression
                                    immediately
                                </div>
                            </div>
                        )}

                        <div className='zen__config-group'>
                            <label>Ticks</label>
                            <input
                                type='number'
                                value={settings.duration}
                                onChange={e =>
                                    handleSettingsChange({ ...settings, duration: parseInt(e.target.value) || 1 })
                                }
                                min='1'
                                max='10'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Strategy</label>
                            <select
                                value={settings.tradeType}
                                onChange={e => handleSettingsChange({ ...settings, tradeType: e.target.value })}
                            >
                                <option value='DIGITEVEN'>Even</option>
                                <option value='DIGITODD'>Odd</option>
                                <option value='DIGITOVER'>Over</option>
                                <option value='DIGITUNDER'>Under</option>
                                <option value='DIGITMATCHES'>Matches</option>
                                <option value='DIGITDIFFERS'>Differs</option>
                                <option value='CALL'>Rise</option>
                                <option value='PUT'>Fall</option>
                            </select>
                        </div>

                        {/* Conditional Barrier/Prediction Field */}
                        {['DIGITOVER', 'DIGITUNDER'].includes(settings.tradeType) && (
                            <div className='zen__config-group'>
                                <label>Barrier</label>
                                <select
                                    value={settings.barrier || '5'}
                                    onChange={e => handleSettingsChange({ ...settings, barrier: e.target.value })}
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                        <option key={n} value={n.toString()}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {['DIGITMATCHES', 'DIGITDIFFERS'].includes(settings.tradeType) && (
                            <div className='zen__config-group'>
                                <label>Prediction</label>
                                <select
                                    value={settings.prediction?.toString() || '2'}
                                    onChange={e =>
                                        handleSettingsChange({ ...settings, prediction: parseInt(e.target.value) })
                                    }
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                        <option key={n} value={n.toString()}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className='zen__config-group'>
                            <label>Switch on Loss</label>
                            <button
                                className={`zen__working-toggle ${settings.switchOnLoss ? 'zen__working-toggle--active' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.switchOnLoss;
                                    handleSettingsChange({ ...settings, switchOnLoss: newValue });
                                    console.log('🔄 Switch on Loss:', newValue ? 'ENABLED' : 'DISABLED');
                                }}
                                title={
                                    settings.switchOnLoss
                                        ? 'Click to disable switching strategy on losses'
                                        : 'Click to enable switching strategy on losses'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.switchOnLoss ? '✅' : '❌'}</span>
                                <span className='zen__toggle-text'>{settings.switchOnLoss ? 'ON' : 'OFF'}</span>
                                <span className='zen__toggle-status'>
                                    {settings.switchOnLoss ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </button>
                            <div className='zen__button-description'>Changes strategy after consecutive losses</div>
                            {settings.switchOnLoss && (
                                <div className='zen__toggle-info'>
                                    Will switch strategy after {settings.lossesToSwitch || 1} consecutive losses
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className='zen__config-row'>
                        <div className='zen__config-group'>
                            <label>Switch Market</label>
                            <button
                                className={`zen__working-toggle ${settings.switchMarket ? 'zen__working-toggle--active' : ''} ${!settings.switchOnLoss ? 'zen__working-toggle--warning' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.switchMarket;
                                    handleSettingsChange({ ...settings, switchMarket: newValue });
                                    console.log('🔄 Switch Market:', newValue ? 'ENABLED' : 'DISABLED');
                                }}
                                title={
                                    settings.switchMarket
                                        ? 'Click to disable market switching'
                                        : 'Click to enable market switching (works best with Switch on Loss)'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.switchMarket ? '🔄' : '🔒'}</span>
                                <span className='zen__toggle-text'>{settings.switchMarket ? 'ON' : 'OFF'}</span>
                                <span className='zen__toggle-status'>
                                    {settings.switchMarket ? 'SWITCHING' : 'FIXED'}
                                </span>
                            </button>
                            <div className='zen__button-description'>Rotates between different volatility markets</div>
                            {settings.switchMarket && !settings.switchOnLoss && (
                                <div className='zen__toggle-warning'>
                                    ⚠️ Enable &quot;Switch on Loss&quot; for better market switching
                                </div>
                            )}
                            {settings.switchMarket && settings.switchOnLoss && (
                                <div className='zen__toggle-info'>Will switch between volatility markets on losses</div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <label>Main Mode</label>
                            <button
                                className={`zen__working-toggle ${settings.mainMode ? 'zen__working-toggle--active' : ''} ${settings.mainMode && (settings.rounds || 1) < 5 ? 'zen__working-toggle--warning' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.mainMode;
                                    handleSettingsChange({ ...settings, mainMode: newValue });
                                    console.log('🔄 Main Mode:', newValue ? 'ENABLED' : 'DISABLED');
                                }}
                                title={
                                    settings.mainMode
                                        ? 'Click to disable main trading mode'
                                        : 'Click to enable main trading mode (recommended with 5+ rounds)'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.mainMode ? '🚀' : '⏸️'}</span>
                                <span className='zen__toggle-text'>{settings.mainMode ? 'ON' : 'OFF'}</span>
                                <span className='zen__toggle-status'>{settings.mainMode ? 'MAIN' : 'TEST'}</span>
                            </button>
                            <div className='zen__button-description'>Activates full trading mode with all features</div>
                            {settings.mainMode && (settings.rounds || 1) < 5 && (
                                <div className='zen__toggle-warning'>
                                    ⚠️ Consider increasing rounds to 5+ for Main Mode
                                </div>
                            )}
                            {settings.mainMode && (settings.rounds || 1) >= 5 && (
                                <div className='zen__toggle-info'>
                                    Main trading mode with {settings.rounds || 1} rounds
                                </div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <label>One Trade Per Cursor Movement</label>
                            <button
                                className={`zen__working-toggle ${settings.oneTradePerGesture ? 'zen__working-toggle--active' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.oneTradePerGesture;
                                    handleSettingsChange({ ...settings, oneTradePerGesture: newValue });
                                    console.log('🎯 One Trade Per Gesture:', newValue ? 'ENABLED' : 'DISABLED');
                                    
                                    // Reset gesture hook when toggling
                                    if (!newValue) {
                                        gestureHook.reset();
                                    }
                                }}
                                title={
                                    settings.oneTradePerGesture
                                        ? 'Click to disable cursor gesture safety - allows multiple trades per movement'
                                        : 'Click to enable cursor gesture safety - ensures only one trade per completed cursor gesture'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.oneTradePerGesture ? '🎯' : '🖱️'}</span>
                                <span className='zen__toggle-text'>{settings.oneTradePerGesture ? 'ON' : 'OFF'}</span>
                                <span className='zen__toggle-status'>
                                    {settings.oneTradePerGesture ? 'SAFE' : 'NORMAL'}
                                </span>
                            </button>
                            <div className='zen__button-description'>Ensures only one trade is executed per completed cursor gesture</div>
                            {settings.oneTradePerGesture && (
                                <div className='zen__toggle-info'>
                                    {(() => {
                                        const status = gestureHook.getGestureStatus();
                                        return (
                                            <div className={`zen__gesture-status zen__gesture-status--${status.status}`}>
                                                {status.message}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <label>Losses to switch</label>
                            <input
                                type='number'
                                value={settings.lossesToSwitch || 1}
                                onChange={e =>
                                    handleSettingsChange({ ...settings, lossesToSwitch: parseInt(e.target.value) || 1 })
                                }
                                min='1'
                                max='10'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Rounds</label>
                            <input
                                type='number'
                                value={settings.rounds || 1}
                                onChange={e =>
                                    handleSettingsChange({ ...settings, rounds: parseInt(e.target.value) || 1 })
                                }
                                min='1'
                                max='100'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Take Profit ($)</label>
                            <input
                                type='number'
                                value={settings.takeProfit || ''}
                                onChange={e => {
                                    const value = e.target.value;
                                    handleSettingsChange({
                                        ...settings,
                                        takeProfit: value === '' ? null : parseFloat(value) || null,
                                    });
                                }}
                                placeholder='Optional'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Stop Loss ($)</label>
                            <input
                                type='number'
                                value={settings.stopLoss || ''}
                                onChange={e => {
                                    const value = e.target.value;
                                    handleSettingsChange({
                                        ...settings,
                                        stopLoss: value === '' ? null : parseFloat(value) || null,
                                    });
                                }}
                                placeholder='Optional'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Max Consecutive Losses</label>
                            <input
                                type='number'
                                value={settings.maxConsecutiveLosses || 5}
                                onChange={e =>
                                    handleSettingsChange({
                                        ...settings,
                                        maxConsecutiveLosses: parseInt(e.target.value) || 5,
                                    })
                                }
                                min='1'
                                max='20'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Target Trades</label>
                            <input
                                type='number'
                                value={settings.targetTrades || 100}
                                onChange={e =>
                                    handleSettingsChange({
                                        ...settings,
                                        targetTrades: parseInt(e.target.value) || 100,
                                    })
                                }
                                min='1'
                                max='1000'
                            />
                        </div>

                        <div className='zen__config-group'>
                            <label>Daily Loss Limit ($)</label>
                            <input
                                type='number'
                                value={settings.dailyLossLimit || ''}
                                onChange={e => {
                                    const value = e.target.value;
                                    handleSettingsChange({
                                        ...settings,
                                        dailyLossLimit: value === '' ? null : parseFloat(value) || null,
                                    });
                                }}
                                placeholder='Optional'
                            />
                        </div>
                    </div>

                    {/* Row 3 - Action Buttons */}
                    <div className='zen__config-row zen__config-row--buttons'>
                        <div className='zen__config-group'>
                            <button
                                className={`zen__working-toggle ${settings.delay ? 'zen__working-toggle--active' : ''} ${settings.delay && settings.delayBetweenTrades < 100 ? 'zen__working-toggle--error' : ''}`}
                                onClick={() => {
                                    const newValue = !settings.delay;
                                    handleSettingsChange({ ...settings, delay: newValue });
                                    console.log('🔄 Delay:', newValue ? 'ENABLED' : 'DISABLED');
                                }}
                                title={
                                    settings.delay
                                        ? 'Click to disable trading delay'
                                        : 'Click to enable trading delay (recommended for stability)'
                                }
                            >
                                <span className='zen__toggle-icon'>{settings.delay ? '⏱️' : '⚡'}</span>
                                <span className='zen__toggle-text'>{settings.delay ? 'DELAY ON' : 'NO DELAY'}</span>
                                <span className='zen__toggle-status'>
                                    {settings.delay ? `${settings.delayBetweenTrades}ms` : 'INSTANT'}
                                </span>
                            </button>
                            <div className='zen__button-description'>Adds pause between trades for stability</div>
                            {settings.delay && (
                                <div className='zen__delay-controls'>
                                    <input
                                        type='number'
                                        value={settings.delayBetweenTrades}
                                        onChange={e => {
                                            const value = parseInt(e.target.value) || 500;
                                            handleSettingsChange({
                                                ...settings,
                                                delayBetweenTrades: value,
                                            });
                                        }}
                                        min='100'
                                        max='10000'
                                        step='100'
                                        placeholder='Delay (ms)'
                                        className='zen__delay-input'
                                    />
                                    <div className='zen__delay-presets'>
                                        {[
                                            { value: 100, label: 'Ultra Fast' },
                                            { value: 500, label: 'Very Fast' },
                                            { value: 1000, label: 'Fast' },
                                            { value: 2000, label: 'Normal' },
                                            { value: 5000, label: 'Slow' },
                                        ].map(preset => (
                                            <button
                                                key={preset.value}
                                                className={`zen__delay-preset ${settings.delayBetweenTrades === preset.value ? 'active' : ''}`}
                                                onClick={() =>
                                                    handleSettingsChange({
                                                        ...settings,
                                                        delayBetweenTrades: preset.value,
                                                    })
                                                }
                                                title={`${preset.value}ms - ${preset.label}`}
                                            >
                                                <span className='zen__preset-label'>{preset.label}</span>
                                                <span className='zen__preset-time'>{preset.value}ms</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {settings.delay && settings.delayBetweenTrades < 100 && (
                                <div className='zen__toggle-error'>❌ Delay must be at least 100ms</div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <button
                                className={`zen__zen-btn zen__zen-btn--success ${settings.enableTickTrading ? 'active' : ''}`}
                                onClick={() =>
                                    handleSettingsChange({
                                        ...settings,
                                        enableTickTrading: !settings.enableTickTrading,
                                    })
                                }
                            >
                                Every Tick Mode
                            </button>
                            <div className='zen__button-description'>
                                Trades on EVERY tick from Deriv WebSocket - Maximum frequency
                            </div>
                            {settings.enableTickTrading && (
                                <div className='zen__tick-runs-input'>
                                    <label>Max Runs</label>
                                    <input
                                        type='number'
                                        value={settings.tickTradingMaxTrades}
                                        onChange={e =>
                                            handleSettingsChange({
                                                ...settings,
                                                tickTradingMaxTrades: parseInt(e.target.value) || 50,
                                            })
                                        }
                                        min='1'
                                        max='1000'
                                        placeholder='50'
                                        className='zen__tick-runs-field'
                                    />
                                </div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <button
                                className={`zen__zen-btn zen__zen-btn--ultra ${settings.ultraFastMode ? 'active' : ''} ${!settings.enableTickTrading ? 'disabled' : ''}`}
                                onClick={() =>
                                    handleSettingsChange({
                                        ...settings,
                                        ultraFastMode: !settings.ultraFastMode,
                                    })
                                }
                                disabled={!settings.enableTickTrading}
                            >
                                🚀 ULTRA-FAST MODE
                                {ultraFastStats.tradesPerSecond > 0 && (
                                    <span className='zen__speed-indicator'>
                                        {' '}
                                        • {ultraFastStats.tradesPerSecond.toFixed(1)} TPS
                                    </span>
                                )}
                            </button>
                            <div className='zen__button-description'>
                                Multiple trades per tick (3 trades every 50ms) - Requires Every Tick mode
                            </div>
                            {settings.ultraFastMode && settings.enableTickTrading && (
                                <div className='zen__ultra-fast-stats'>
                                    <div className='zen__stat-row'>
                                        <span>Exec Speed:</span>
                                        <span
                                            className={
                                                ultraFastStats.avgExecutionTime < 50
                                                    ? 'excellent'
                                                    : ultraFastStats.avgExecutionTime < 100
                                                      ? 'good'
                                                      : 'slow'
                                            }
                                        >
                                            {ultraFastStats.avgExecutionTime.toFixed(1)}ms
                                        </span>
                                    </div>
                                    <div className='zen__stat-row'>
                                        <span>Price Changes:</span>
                                        <span className='excellent'>{ultraFastStats.priceChanges || 0}</span>
                                    </div>
                                    <div className='zen__stat-row'>
                                        <span>Confirmed:</span>
                                        <span
                                            className={
                                                ultraFastStats.confirmationRate > 95
                                                    ? 'excellent'
                                                    : ultraFastStats.confirmationRate > 85
                                                      ? 'good'
                                                      : 'slow'
                                            }
                                        >
                                            {ultraFastStats.confirmationRate?.toFixed(1) || 0}%
                                        </span>
                                    </div>
                                    <div className='zen__stat-row'>
                                        <span>Pending:</span>
                                        <span
                                            className={
                                                ultraFastStats.pendingTrades > 5
                                                    ? 'slow'
                                                    : ultraFastStats.pendingTrades > 2
                                                      ? 'good'
                                                      : 'excellent'
                                            }
                                        >
                                            {ultraFastStats.pendingTrades || 0}
                                        </span>
                                    </div>
                                    <div className='zen__ultra-fast-config'>
                                        <div className='zen__config-input-group'>
                                            <label>Trades per Price Change</label>
                                            <input
                                                type='number'
                                                value={settings.tradesPerPriceChange}
                                                onChange={e =>
                                                    handleSettingsChange({
                                                        ...settings,
                                                        tradesPerPriceChange: parseInt(e.target.value) || 3,
                                                    })
                                                }
                                                min='1'
                                                max='10'
                                                placeholder='3'
                                                className='zen__config-input'
                                            />
                                        </div>
                                        <div className='zen__config-input-group'>
                                            <label>Interval (ms)</label>
                                            <input
                                                type='number'
                                                value={settings.ultraFastInterval}
                                                onChange={e =>
                                                    handleSettingsChange({
                                                        ...settings,
                                                        ultraFastInterval: parseInt(e.target.value) || 50,
                                                    })
                                                }
                                                min='10'
                                                max='500'
                                                step='10'
                                                placeholder='50'
                                                className='zen__config-input'
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className='zen__config-group'>
                            <button className='zen__zen-btn zen__zen-btn--info'>⚙️ Advanced Features</button>
                            <div className='zen__button-description'>Access professional trading tools</div>
                        </div>

                        <div className='zen__config-group'>
                            <button
                                className={`zen__zen-btn zen__zen-btn--purple ${showDigitFrequency ? 'active' : ''}`}
                                onClick={() => setShowDigitFrequency(!showDigitFrequency)}
                            >
                                📊 TICK ANALYSIS
                            </button>
                            <div className='zen__button-description'>Shows real-time tick pattern analysis</div>
                        </div>

                        <div className='zen__config-group'>
                            <button
                                className={`zen__zen-btn zen__zen-btn--orange ${showMovableTick ? 'active' : ''}`}
                                onClick={() => setShowMovableTick(!showMovableTick)}
                            >
                                🎯 DIGIT STATS
                            </button>
                            <div className='zen__button-description'>Displays digit frequency statistics</div>
                        </div>
                    </div>

                    {/* Row 4 - Run and Stop Buttons */}
                    <div className='zen__config-row zen__config-row--run'>
                        <button
                            className={`zen__run-btn zen__run-btn--start ${isAutoTrading ? 'zen__run-btn--disabled' : ''} ${settings.oneTradePerGesture && !canExecuteTradeWithSafety() ? 'zen__run-btn--gesture-blocked' : ''}`}
                            onClick={handleRunButtonClick}
                            disabled={!isAuthorized || !isConfigValid || isAutoTrading || (settings.oneTradePerGesture && !canExecuteTradeWithSafety())}
                            title={
                                !isAuthorized
                                    ? 'Please login to your Deriv account first'
                                    : !isConfigValid
                                      ? 'Please fix configuration issues first'
                                      : isAutoTrading
                                        ? 'Trading is already running'
                                        : settings.oneTradePerGesture && !canExecuteTradeWithSafety()
                                          ? 'Blocked by gesture safety - move cursor and wait for stabilization'
                                          : 'Start automated trading'
                            }
                        >
                            🚀 RUN
                            {settings.oneTradePerGesture && !canExecuteTradeWithSafety() && (
                                <span className='zen__gesture-block-indicator'>🎯</span>
                            )}
                        </button>

                        <button
                            className={`zen__run-btn zen__run-btn--stop ${!isAutoTrading ? 'zen__run-btn--disabled' : ''}`}
                            onClick={handleStopButtonClick}
                            disabled={!isAutoTrading}
                            title={!isAutoTrading ? 'No trading session to stop' : 'Stop automated trading'}
                        >
                            🛑 STOP
                        </button>
                        <div className='zen__button-description'>
                            Start/Stop automated trading system
                            {settings.oneTradePerGesture && (
                                <span className='zen__gesture-safety-note'> • Gesture safety enabled</span>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Configuration Status */}
                    <div className='zen__config-status'>
                        <div
                            className={`zen__config-indicator ${isConfigValid ? 'zen__config-indicator--valid' : 'zen__config-indicator--invalid'}`}
                        >
                            {isConfigValid ? '✅ Configuration Valid' : '❌ Configuration Issues'}
                            {isConfigValid && configWarnings.length > 0 && (
                                <span className='zen__config-warnings-count'>({configWarnings.length} warnings)</span>
                            )}
                        </div>

                        {/* Critical Issues */}
                        {!isConfigValid && (
                            <div className='zen__config-issues'>
                                <div className='zen__config-section-title'>❌ Critical Issues:</div>
                                {configIssues.map((issue, index) => (
                                    <div key={index} className='zen__config-issue'>
                                        <span className='zen__issue-icon'>🚫</span>
                                        {issue}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Warnings */}
                        {configWarnings.length > 0 && (
                            <div className='zen__config-warnings'>
                                <div className='zen__config-section-title'>⚠️ Recommendations:</div>
                                {configWarnings.map((warning, index) => (
                                    <div key={index} className='zen__config-warning'>
                                        <span className='zen__warning-icon'>💡</span>
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Configuration Summary */}
                        {isConfigValid && (
                            <div className='zen__config-summary'>
                                <div className='zen__summary-item'>
                                    <span>Strategy:</span> {settings.tradeType}
                                </div>
                                <div className='zen__summary-item'>
                                    <span>Stake:</span> ${settings.stake}
                                </div>
                                <div className='zen__summary-item'>
                                    <span>Martingale:</span>
                                    {settings.enableMartingale ? (
                                        <span className='zen__martingale-active'>
                                            ✅ {settings.martingaleMultiplier}x (Max {settings.martingaleMaxSteps}{' '}
                                            steps) {settings.autoContinueOnLoss ? '🔄 Auto-Continue' : '⏸️ Manual'}
                                        </span>
                                    ) : (
                                        <span className='zen__martingale-disabled'>❌ Disabled</span>
                                    )}
                                </div>
                                <div className='zen__summary-item'>
                                    <span>Features:</span>
                                    {settings.switchOnLoss && ' Switch-Loss'}
                                    {settings.switchMarket && ' Switch-Market'}
                                    {settings.mainMode && ' Main-Mode'}
                                    {settings.delay && ' Delay'}
                                    {settings.enableTickTrading && ' Tick-Trading'}
                                    {settings.ultraFastMode && ' Ultra-Fast'}
                                    {!settings.switchOnLoss &&
                                        !settings.switchMarket &&
                                        !settings.mainMode &&
                                        !settings.delay &&
                                        !settings.enableTickTrading &&
                                        !settings.ultraFastMode &&
                                        ' Basic'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Authentication Status - Zen Style */}
                <div className='zen__auth-status'>
                    <div className='zen__auth-header'>
                        <strong>Account Status</strong>
                        <div
                            className={`zen__auth-badge ${isAuthorized ? 'zen__auth-badge--success' : 'zen__auth-badge--error'}`}
                        >
                            {isAuthorized ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}
                        </div>
                    </div>
                    <div className='zen__auth-details'>
                        Balance: ${accountBalance.toFixed(2)} USD | Connection: {connectionStatus}
                        {!isAuthorized && (
                            <div className='zen__auth-warning'>
                                ⚠️ Please login to your Deriv account to start trading
                                <br />
                                <span>Visit deriv.com → Login → Return to this page</span>
                            </div>
                        )}
                    </div>
                </div>

                {!isAuthorized ? (
                    <div className='zen__not-authorized'>
                        <div className='zen__not-authorized-content'>
                            <svg width='64' height='64' viewBox='0 0 64 64' fill='none'>
                                <circle cx='32' cy='32' r='28' stroke='#14b8a6' strokeWidth='3' opacity='0.3' />
                                <path d='M32 20v16M32 44v2' stroke='#14b8a6' strokeWidth='3' strokeLinecap='round' />
                            </svg>
                            <h2>Please Log In</h2>
                            <p>You need to be logged in to your Deriv account to use Zen Trading</p>
                            <small>Connection Status: {connectionStatus}</small>
                        </div>
                    </div>
                ) : (
                    <div className='zen__content'>
                        {/* Hidden Trading Engine - Runs in Background */}
                        <div style={{ display: 'none' }}>
                            <TradingEngine
                                ref={tradingEngineRef}
                                settings={settings}
                                onTradeExecuted={notifyTradeExecutedWithGesture}
                                onAutoTradingChange={handleAutoTradingChange}
                                onTickUpdate={handleTickUpdate}
                                selectedStrategies={selectedStrategies}
                                selectedMarkets={selectedMarkets}
                                onSettingsChange={handleSettingsChange}
                                centralizedMartingale={{
                                    consecutiveLosses,
                                    martingaleStep,
                                    getCurrentStake: getCurrentMartingaleStake,
                                }}
                                gestureSafety={{
                                    enabled: settings.oneTradePerGesture,
                                    canExecuteTrade: canExecuteTradeWithSafety,
                                    notifyTradeExecuted: () => {
                                        if (settings.oneTradePerGesture) {
                                            gestureHook.notifyTradeExecuted();
                                        }
                                    },
                                }}
                            />

                            {/* Ultra-Fast Engine for Maximum Speed */}
                            <ZenUltraFastEngine
                                ref={ultraFastEngineRef}
                                settings={settings}
                                onTradeExecuted={notifyTradeExecutedWithGesture}
                                onStatsUpdate={handleUltraFastStatsUpdate}
                                onSpeedUpdate={handleSpeedUpdate}
                                centralizedMartingale={{
                                    consecutiveLosses,
                                    martingaleStep,
                                    getCurrentStake: getCurrentMartingaleStake,
                                }}
                                gestureSafety={{
                                    enabled: settings.oneTradePerGesture,
                                    canExecuteTrade: canExecuteTradeWithSafety,
                                    notifyTradeExecuted: () => {
                                        if (settings.oneTradePerGesture) {
                                            gestureHook.notifyTradeExecuted();
                                        }
                                    },
                                }}
                            />
                        </div>

                        {/* Tick-Driven Trading Engine Dashboard */}
                        {showTickDriven && (
                            <TickDrivenDashboard
                                isActive={tickDrivenActive}
                                tickStats={tickStats}
                                rules={tradeRules}
                                currentPrice={currentTick}
                                onStart={handleStartTickDriven}
                                onStop={handleStopTickDriven}
                                onAddRule={handleAddTradeRule}
                                onDeleteRule={handleDeleteTradeRule}
                                onToggleRule={handleToggleTradeRule}
                            />
                        )}

                        {/* Zen-Style Layout */}
                        <div className='zen__zen-layout'>
                            {/* Transaction History */}
                            <div className='zen__transactions-section'>
                                <div className='zen__transactions-header'>
                                    <h3 className='zen__transactions-title'>
                                        📊 Transaction History ({transactions.length})
                                    </h3>
                                </div>
                                <TransactionHistory
                                    transactions={transactions}
                                    onExport={handleExport}
                                    onReset={handleReset}
                                />
                            </div>
                        </div>

                        {/* Mobile Layout - Transaction History Only */}
                        <div className='zen__mobile-layout'>
                            {/* Transaction History Section */}
                            <div className='zen__mobile-section'>
                                <div className='zen__mobile-section-header' onClick={() => toggleSection('history')}>
                                    <h3 className='zen__mobile-section-title'>
                                        📊 Transaction History ({transactions.length})
                                    </h3>
                                    <button
                                        className={`zen__mobile-toggle ${collapsedSections.history ? 'collapsed' : ''}`}
                                    >
                                        <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                                            <path
                                                d='M5 7.5l5 5 5-5'
                                                stroke='currentColor'
                                                strokeWidth='2'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <div
                                    className={`zen__mobile-section-content ${collapsedSections.history ? 'zen__mobile-section-content--collapsed' : ''}`}
                                >
                                    <TransactionHistory
                                        transactions={transactions}
                                        onExport={handleExport}
                                        onReset={handleReset}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scroll to Top Button */}
                {showScrollTop && (
                    <button className='zen__scroll-top' onClick={scrollToTop} title='Scroll to top'>
                        <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                            <path
                                d='M10 15V5M10 5l-4 4M10 5l4 4'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </button>
                )}

                {/* Movable Tick Display */}
                <MovableTickDisplay
                    currentTick={currentTick}
                    lastDigit={lastDigit}
                    market={settings.market}
                    isVisible={showMovableTick}
                    isTickTrading={settings.enableTickTrading && isAutoTrading}
                    subscriptionActive={true} // This should be passed from TradingEngine
                    onClose={() => setShowMovableTick(false)}
                />

                {/* Digit Frequency Analysis - Zen Style */}
                <ZenDigitFrequency
                    symbol={settings.market}
                    isVisible={showDigitFrequency}
                    onClose={() => setShowDigitFrequency(false)}
                />
            </div>
        </div>
    );
};

export default Zen;
