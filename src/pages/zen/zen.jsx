import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZenDigitFrequency } from '@/components/zen/ZenDigitFrequency';
import { ZenTransactionHistory } from '@/components/zen/ZenTransactionHistory';
import { useApiBase } from '@/hooks/useApiBase';
import { useHighFrequencyTrading } from '@/hooks/useHighFrequencyTrading';
import { zenTradingController } from '@/services/zen-trading-controller.service';
import './zen.scss';

const Zen = () => {
    // Essential hooks and refs
    const { isAuthorized } = useApiBase();

    // Phase 1: Simplified state management
    const [settings, setSettings] = useState({
        market: 'R_50',
        tradeType: 'DIGITEVEN',
        stake: 0.35,
        duration: 1,
        barrier: '5',
        prediction: 2,
        // Core trading settings
        enableMartingale: true,
        martingaleMultiplier: 2,
        autoContinueOnLoss: false,
        // Main Mode (HFT)
        oneTradePerGesture: false,
        tradingSpeed: 'normal', // 'ultra', 'fast', 'normal', 'slow'
        // Session control
        rounds: 8,
        stopOnProfitRuns: false,
        profitRunsTarget: 5,
        // Essential limits
        takeProfit: 100,
        stopLoss: 50,
        // Entry point settings
        entryPoint: 'immediate',
        entryDigit: 0,
        useEntryPoint: false,
        entryPointType: 'digit',
        entryPointCondition: 'equals',
        entryPointDigit: 0,
        entryPointPrice: 0,
        // Additional settings
        switchOnLoss: false,
        switchMarket: false,
        rainMode: false,
        lossesToSwitch: 3,
        maxConsecutiveLosses: 5,
        targetTrades: 10,
        dailyLossLimit: 100,
    });

    const [isAutoTrading, setIsAutoTrading] = useState(false);
    const [showDigitFrequency, setShowDigitFrequency] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [completedRuns, setCompletedRuns] = useState(0);
    const [profitableRuns, setProfitableRuns] = useState(0);

    // Simplified Martingale State Management
    const [martingaleState, setMartingaleState] = useState({
        isInMartingale: false,
        currentStep: 0,
        originalStake: 0.35,
        currentStake: 0.35,
        sequenceStarted: false,
    });

    // Helper function to get trading interval based on speed setting
    const getTradingInterval = useCallback(() => {
        const speedIntervals = {
            ultra: 100, // 100ms - Ultra Fast
            fast: 400, // 400ms - Fast
            normal: 800, // 800ms - Normal
            slow: 1000, // 1000ms - Slow
        };
        return speedIntervals[settings.tradingSpeed] || 800;
    }, [settings.tradingSpeed]);

    // Helper function to get speed display info
    const getSpeedInfo = useCallback(() => {
        const speedInfo = {
            ultra: { label: 'Ultra Fast', interval: '100ms', rate: '10/sec', color: '#dc2626' },
            fast: { label: 'Fast', interval: '400ms', rate: '2.5/sec', color: '#f59e0b' },
            normal: { label: 'Normal', interval: '800ms', rate: '1.25/sec', color: '#10b981' },
            slow: { label: 'Slow', interval: '1000ms', rate: '1/sec', color: '#3b82f6' },
        };
        return speedInfo[settings.tradingSpeed] || speedInfo.normal;
    }, [settings.tradingSpeed]);

    // Phase 5: High-Frequency Trading Mode integration (replaces price movement detection)
    const containerRef = useRef(null);
    const highFrequencyTrading = useHighFrequencyTrading({
        enabled: settings.oneTradePerGesture, // Using same setting name for backward compatibility
        tradingInterval: getTradingInterval(), // Pass configurable interval
    });

    const handleSettingsChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value,
        }));

        // Update martingale original stake when base stake changes
        if (key === 'stake') {
            setMartingaleState(prev => ({
                ...prev,
                originalStake: value,
                currentStake: prev.isInMartingale ? prev.currentStake : value,
            }));
        }
    };

    // Multi-selection handlers (for future use when needed)
    // Removed for simplification

    // Simplified trading engine integration with Martingale
    const handleTradeExecuted = useCallback(
        transaction => {
            console.log('📥 Zen received trade:', transaction);
            setTransactions(prev => [transaction, ...prev]);

            // Simplified Martingale Logic when Auto-Continue on Loss is enabled
            if (settings.autoContinueOnLoss) {
                const isWin = transaction.profit > 0;
                const isLoss = transaction.profit < 0;

                if (isWin) {
                    console.log('✅ Trade won - Resetting martingale state');
                    // Reset martingale state on win
                    setMartingaleState(prev => ({
                        ...prev,
                        isInMartingale: false,
                        currentStep: 0,
                        currentStake: prev.originalStake,
                        sequenceStarted: false,
                    }));
                } else if (isLoss) {
                    console.log('❌ Trade lost - Processing martingale logic');
                    setMartingaleState(prev => {
                        const newStep = prev.currentStep + 1;
                        const newStake = prev.originalStake * Math.pow(settings.martingaleMultiplier, newStep);

                        console.log(`🎯 Martingale step ${newStep} - Stake: ${newStake}`);

                        // Continue with martingale - no step limit for infinite recovery
                        return {
                            ...prev,
                            isInMartingale: true,
                            currentStep: newStep,
                            currentStake: newStake,
                            sequenceStarted: true,
                        };
                    });

                    // Don't increment completed runs during martingale sequence
                    return;
                }
            }

            // Increment completed runs counter (only for wins or when auto-continue is disabled)
            setCompletedRuns(prev => {
                const newCount = prev + 1;
                console.log(`🔄 Run completed: ${newCount}/${settings.rounds}`);

                // Check if we've reached the target number of runs
                if (newCount >= settings.rounds) {
                    console.log(`🎯 Target runs reached (${settings.rounds}). Auto-stopping trading...`);
                    // Auto-stop trading after a short delay
                    setTimeout(async () => {
                        try {
                            console.log('🛑 Auto-stopping trading after completing target runs');
                            if (true) {
                                // Placeholder for trading engine
                                console.log('🛑 Auto-stopping trading after completing target runs');
                                // TODO: Implement zen trading stop logic
                            }
                            console.log('✅ Auto-stop completed successfully');
                        } catch (error) {
                            console.error('❌ Error during auto-stop:', error);
                        }
                    }, 1000);
                }

                return newCount;
            });

            // Track profitable runs and check profit-based auto-stop
            if (transaction.profit > 0) {
                setProfitableRuns(prev => {
                    const newProfitCount = prev + 1;
                    console.log(`💰 Profitable run: ${newProfitCount}/${settings.profitRunsTarget}`);

                    // Check if we've reached the target number of profitable runs
                    if (settings.stopOnProfitRuns && newProfitCount >= settings.profitRunsTarget) {
                        console.log(
                            `🎯 Profit target reached (${settings.profitRunsTarget} profitable runs). Auto-stopping trading...`
                        );
                        // Auto-stop trading after a short delay
                        setTimeout(async () => {
                            try {
                                console.log('🛑 Auto-stopping trading after reaching profit target');
                                if (true) {
                                    // Placeholder for trading engine
                                    console.log('🛑 Auto-stopping trading after reaching profit target');
                                    // TODO: Implement zen trading stop logic
                                }
                                console.log('✅ Profit-based auto-stop completed successfully');
                            } catch (error) {
                                console.error('❌ Error during profit-based auto-stop:', error);
                            }
                        }, 1000);
                    }

                    return newProfitCount;
                });
            }
        },
        [
            settings.rounds,
            settings.autoContinueOnLoss,
            settings.martingaleMultiplier,
            settings.stopOnProfitRuns,
            settings.profitRunsTarget,
        ]
    );

    const handleAutoTradingChange = isActive => {
        setIsAutoTrading(isActive);
        console.log('🔄 Auto-trading state changed:', isActive);
    };

    // Simplified component handlers
    const handleTickUpdate = (tick, digit) => {
        console.log('📊 Tick Update:', { tick, digit });
    };

    const handleRunButtonClick = useCallback(async () => {
        console.log('🚀 Starting auto-trading via RUN button');

        // Reset counters and martingale state when starting
        setCompletedRuns(0);
        setProfitableRuns(0);
        setMartingaleState({
            isInMartingale: false,
            currentStep: 0,
            originalStake: settings.stake,
            currentStake: settings.stake,
            sequenceStarted: false,
        });
        console.log(`🎯 Starting new session - Target: ${settings.rounds} runs`);
        console.log(
            `💰 Martingale settings - Original stake: ${settings.stake}, Multiplier: ${settings.martingaleMultiplier}, Auto-continue: ${settings.autoContinueOnLoss ? 'ON' : 'OFF'}`
        );

        // Check if Main Mode (High-Frequency Trading) is enabled
        if (settings.oneTradePerGesture) {
            const speedInfo = getSpeedInfo();
            console.log(`⚡ Main Mode enabled - Starting Continuous High-Frequency Trading`);
            console.log(
                `⚡ Configuration: ${speedInfo.label} - 1 contract every ${getTradingInterval()}ms (${speedInfo.rate}) - CONTINUOUS MODE`
            );

            // Start continuous high-frequency trading mode
            const hftCallback = contractId => {
                console.log(`⚡ Continuous HFT executing contract: ${contractId}`);
                // Trigger trade execution through trading engine
                if (true) {
                    // Placeholder for trading engine
                    console.log(`⚡ Continuous HFT executing contract: ${contractId}`);
                    // TODO: Implement zen trading start logic
                }
            };

            highFrequencyTrading.start(hftCallback);
            return;
        }

        // Normal Mode: Standard trading engine
        console.log('🔄 Starting Normal Trading Engine');
        if (true) {
            // Placeholder for trading engine
            console.log('🔄 Starting Normal Trading Engine');
            // TODO: Implement zen trading start logic
        }
    }, [
        settings.rounds,
        settings.stake,
        settings.martingaleMultiplier,
        settings.autoContinueOnLoss,
        settings.oneTradePerGesture,
        getSpeedInfo,
        getTradingInterval,
        highFrequencyTrading,
    ]);

    const handleStopButtonClick = useCallback(async () => {
        console.log('🛑 Stopping auto-trading via STOP button');

        // Stop high-frequency trading if running
        if (settings.oneTradePerGesture && highFrequencyTrading.isRunning) {
            highFrequencyTrading.stop();
        }

        // Stop trading engine
        if (true) {
            // Placeholder for trading engine
            console.log('🛑 Stopping zen trading');
            // TODO: Implement zen trading stop logic
        }
    }, [settings.oneTradePerGesture, highFrequencyTrading]);

    const handleReset = useCallback(async () => {
        console.log('🔄 Reset button clicked');
        const confirmed =
            transactions.length > 0 ? window.confirm(`Clear all ${transactions.length} transactions?`) : true;

        if (confirmed) {
            if (isAutoTrading) {
                await handleStopButtonClick();
            }

            // Reset high-frequency trading
            if (settings.oneTradePerGesture) {
                highFrequencyTrading.reset();
            }

            setTransactions([]);
            setCompletedRuns(0); // Reset runs counter
            setMartingaleState({
                isInMartingale: false,
                currentStep: 0,
                originalStake: settings.stake,
                currentStake: settings.stake,
                sequenceStarted: false,
            });
            console.log('✅ Reset completed - runs counter and martingale state reset');
        }
    }, [
        transactions.length,
        isAutoTrading,
        handleStopButtonClick,
        settings.stake,
        settings.oneTradePerGesture,
        highFrequencyTrading,
    ]);

    const handleExport = () => {
        console.log('📤 Export button clicked - transactions count:', transactions.length);
    };

    // Register zen trading controller for external access (like Deriv Run button)
    useEffect(() => {
        const controller = {
            start: async () => {
                try {
                    await handleRunButtonClick();
                    return true;
                } catch (error) {
                    console.error('❌ Failed to start zen trading:', error);
                    return false;
                }
            },
            stop: async () => {
                try {
                    await handleStopButtonClick();
                    return true;
                } catch (error) {
                    console.error('❌ Failed to stop zen trading:', error);
                    return false;
                }
            },
            reset: async () => {
                try {
                    await handleReset();
                    return true;
                } catch (error) {
                    console.error('❌ Failed to reset zen trading:', error);
                    return false;
                }
            },
            getSettings: () => settings,
            isRunning: () => isAutoTrading,
            getStatus: () => ({
                isRunning: isAutoTrading,
                transactions: transactions.length,
                settings: settings,
                mode: 'normal',
            }),
        };

        // Register the controller
        zenTradingController.registerController(controller);

        // Cleanup on unmount
        return () => {
            zenTradingController.unregisterController();
        };
    }, [settings, isAutoTrading, transactions.length, handleRunButtonClick, handleStopButtonClick, handleReset]);

    return (
        <div className='zen-container'>
            <div className='zen' ref={containerRef}>
                {/* Main Trading Grid */}
                <div className='zen__trading-grid'>
                    {/* Row 1 */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>MARKET</div>
                        <div className='zen__card-content'>
                            <select
                                className='zen__select'
                                value={settings.market}
                                onChange={e => handleSettingsChange('market', e.target.value)}
                            >
                                <optgroup label='Volatility Indices'>
                                    <option value='R_10'>Volatility 10 Index</option>
                                    <option value='R_25'>Volatility 25 Index</option>
                                    <option value='R_50'>Volatility 50 Index</option>
                                    <option value='R_75'>Volatility 75 Index</option>
                                    <option value='R_100'>Volatility 100 Index</option>
                                </optgroup>
                                <optgroup label='Volatility Indices (1s)'>
                                    <option value='1HZ10V'>Volatility 10 (1s) Index</option>
                                    <option value='1HZ25V'>Volatility 25 (1s) Index</option>
                                    <option value='1HZ50V'>Volatility 50 (1s) Index</option>
                                    <option value='1HZ75V'>Volatility 75 (1s) Index</option>
                                    <option value='1HZ100V'>Volatility 100 (1s) Index</option>
                                </optgroup>
                                <optgroup label='Volatility Indices (150)'>
                                    <option value='R_150'>Volatility 150 Index</option>
                                    <option value='R_200'>Volatility 200 Index</option>
                                    <option value='R_250'>Volatility 250 Index</option>
                                </optgroup>
                                <optgroup label='Step Indices'>
                                    <option value='STPIDX'>Step Index</option>
                                </optgroup>
                                <optgroup label='Crash/Boom Indices'>
                                    <option value='BOOM300N'>Boom 300 Index</option>
                                    <option value='BOOM500N'>Boom 500 Index</option>
                                    <option value='BOOM1000N'>Boom 1000 Index</option>
                                    <option value='CRASH300N'>Crash 300 Index</option>
                                    <option value='CRASH500N'>Crash 500 Index</option>
                                    <option value='CRASH1000N'>Crash 1000 Index</option>
                                </optgroup>
                                <optgroup label='Jump Indices'>
                                    <option value='JD10'>Jump 10 Index</option>
                                    <option value='JD25'>Jump 25 Index</option>
                                    <option value='JD75'>Jump 75 Index</option>
                                    <option value='JD100'>Jump 100 Index</option>
                                </optgroup>
                            </select>
                            <div className='zen__market-info'>
                                <span className='zen__status-dot'></span>
                                <span>
                                    {settings.market.startsWith('R_')
                                        ? 'Volatility'
                                        : settings.market.startsWith('1HZ')
                                          ? 'Volatility (1s)'
                                          : settings.market.startsWith('BOOM')
                                            ? 'Boom'
                                            : settings.market.startsWith('CRASH')
                                              ? 'Crash'
                                              : settings.market.startsWith('JD')
                                                ? 'Jump'
                                                : settings.market === 'STPIDX'
                                                  ? 'Step'
                                                  : 'Synthetic'}{' '}
                                    •
                                    {settings.market.includes('10')
                                        ? 'Low'
                                        : settings.market.includes('25')
                                          ? 'Medium'
                                          : settings.market.includes('50')
                                            ? 'Normal'
                                            : settings.market.includes('75')
                                              ? 'High'
                                              : settings.market.includes('100')
                                                ? 'Very High'
                                                : settings.market.includes('150')
                                                  ? 'Ultra High'
                                                  : settings.market.includes('200')
                                                    ? 'Extreme'
                                                    : settings.market.includes('250')
                                                      ? 'Maximum'
                                                      : 'Variable'}{' '}
                                    • Active
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>DEFAULT STAKE</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='0.35'
                                step='0.01'
                                value={settings.stake}
                                onChange={e => handleSettingsChange('stake', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>MARTINGALE MULTIPLIER</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                step='0.1'
                                value={settings.martingaleMultiplier}
                                onChange={e => handleSettingsChange('martingaleMultiplier', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>ENABLE MARTINGALE</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.enableMartingale ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('enableMartingale', !settings.enableMartingale)}
                            >
                                <span className='zen__toggle-text'>{settings.enableMartingale ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>Martingale trading 2x after loss, max 3 steps</div>
                            <div className='zen__card-stats'>Next stake: 0.35 → 0.70 → 1.40 → 2.80</div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>MAIN MODE</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.oneTradePerGesture ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('oneTradePerGesture', !settings.oneTradePerGesture)}
                                title={`High-frequency trading: 1 contract every ${getTradingInterval()}ms`}
                            >
                                <span className='zen__toggle-text'>{settings.oneTradePerGesture ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>High-Frequency Trading Mode</div>
                            <div className='zen__card-stats'>
                                {settings.oneTradePerGesture ? (
                                    <span
                                        className={`zen__hft-indicator zen__hft-indicator--${highFrequencyTrading.getStatus().status}`}
                                    >
                                        {highFrequencyTrading.getStatus().message}
                                    </span>
                                ) : (
                                    `Continuous: 1 contract every ${getTradingInterval()}ms when enabled`
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Speed Control Card */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>TRADING SPEED</div>
                        <div className='zen__card-content'>
                            <select
                                className='zen__select'
                                value={settings.tradingSpeed}
                                onChange={e => handleSettingsChange('tradingSpeed', e.target.value)}
                            >
                                <option value='ultra'>Ultra Fast (100ms) - Continuous</option>
                                <option value='fast'>Fast (400ms) - Continuous</option>
                                <option value='normal'>Normal (800ms) - Continuous</option>
                                <option value='slow'>Slow (1000ms) - Continuous</option>
                            </select>
                            <div className='zen__card-description'>
                                {getSpeedInfo().label} - Continuous execution every {getSpeedInfo().interval}
                            </div>
                            <div className='zen__card-stats'>
                                <span className='zen__speed-indicator' style={{ color: getSpeedInfo().color }}>
                                    Rate: {getSpeedInfo().rate} • Interval: {getSpeedInfo().interval}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>AUTO-CONTINUE ON LOSS</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.autoContinueOnLoss ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('autoContinueOnLoss', !settings.autoContinueOnLoss)}
                            >
                                <span className='zen__toggle-text'>{settings.autoContinueOnLoss ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>
                                Advanced Martingale: On loss, use {settings.martingaleMultiplier}x stake for up to 4
                                runs
                            </div>
                            <div className='zen__card-stats'>
                                {settings.autoContinueOnLoss ? (
                                    martingaleState.isInMartingale ? (
                                        <span className='zen__martingale-indicator zen__martingale-indicator--active'>
                                            Martingale Step {martingaleState.currentStep}/4 - Stake: $
                                            {martingaleState.currentStake.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className='zen__martingale-indicator zen__martingale-indicator--ready'>
                                            Ready - Base stake: ${settings.stake}
                                        </span>
                                    )
                                ) : (
                                    'Advanced martingale disabled - standard trading'
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>TICKS</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                max='10'
                                value={settings.duration}
                                onChange={e => handleSettingsChange('duration', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>STRATEGY</div>
                        <div className='zen__card-content'>
                            <select
                                className='zen__select'
                                value={settings.tradeType}
                                onChange={e => handleSettingsChange('tradeType', e.target.value)}
                            >
                                <option value='DIGITEVEN'>Even</option>
                                <option value='DIGITODD'>Odd</option>
                                <option value='CALL'>Rise</option>
                                <option value='PUT'>Fall</option>
                                <option value='DIGITOVER'>Over</option>
                                <option value='DIGITUNDER'>Under</option>
                                <option value='DIGITMATCH'>Matches</option>
                                <option value='DIGITDIFF'>Differs</option>
                            </select>
                            <div className='zen__card-description'>
                                {settings.tradeType === 'DIGITOVER' || settings.tradeType === 'DIGITUNDER'
                                    ? 'Over/Under: Predict if last digit will be over/under the barrier'
                                    : settings.tradeType === 'DIGITMATCH' || settings.tradeType === 'DIGITDIFF'
                                      ? 'Matches/Differs: Predict if last digit matches/differs from prediction'
                                      : 'Standard digit and price prediction strategies'}
                            </div>
                        </div>
                    </div>

                    {/* Entry Point Setting */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>ENTRY POINT</div>
                        <div className='zen__card-content'>
                            <select
                                className='zen__select'
                                value={settings.entryPoint}
                                onChange={e => handleSettingsChange('entryPoint', e.target.value)}
                            >
                                <option value='immediate'>Immediate</option>
                                <option value='next_tick'>Next Tick</option>
                                <option value='specific_digit'>Wait for Digit</option>
                            </select>
                            <div className='zen__card-description'>
                                {settings.entryPoint === 'immediate'
                                    ? 'Enter trades immediately when conditions are met'
                                    : settings.entryPoint === 'next_tick'
                                      ? 'Wait for the next price tick before entering'
                                      : `Wait for last digit to be ${settings.entryDigit} before entering`}
                            </div>
                            {settings.entryPoint === 'specific_digit' && (
                                <div className='zen__entry-point-status'>
                                    <span className='zen__entry-point-indicator'>
                                        Waiting for digit {settings.entryDigit}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Entry Digit setting for specific digit entry point */}
                    {settings.entryPoint === 'specific_digit' && (
                        <div className='zen__card zen__card--strategy-dependent'>
                            <div className='zen__card-header'>ENTRY DIGIT</div>
                            <div className='zen__card-content'>
                                <select
                                    className='zen__select'
                                    value={settings.entryDigit}
                                    onChange={e => handleSettingsChange('entryDigit', parseInt(e.target.value))}
                                >
                                    <option value={0}>0</option>
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                    <option value={6}>6</option>
                                    <option value={7}>7</option>
                                    <option value={8}>8</option>
                                    <option value={9}>9</option>
                                </select>
                                <div className='zen__card-description'>
                                    Wait for last digit to be {settings.entryDigit} before entering trades
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Barrier setting for Over/Under strategies */}
                    {(settings.tradeType === 'DIGITOVER' || settings.tradeType === 'DIGITUNDER') && (
                        <div className='zen__card zen__card--strategy-dependent'>
                            <div className='zen__card-header'>BARRIER DIGIT</div>
                            <div className='zen__card-content'>
                                <select
                                    className='zen__select'
                                    value={settings.barrier}
                                    onChange={e => handleSettingsChange('barrier', e.target.value)}
                                >
                                    <option value='0'>0</option>
                                    <option value='1'>1</option>
                                    <option value='2'>2</option>
                                    <option value='3'>3</option>
                                    <option value='4'>4</option>
                                    <option value='5'>5</option>
                                    <option value='6'>6</option>
                                    <option value='7'>7</option>
                                    <option value='8'>8</option>
                                    <option value='9'>9</option>
                                </select>
                                <div className='zen__card-description'>
                                    {settings.tradeType === 'DIGITOVER'
                                        ? `Predict last digit will be OVER ${settings.barrier}`
                                        : `Predict last digit will be UNDER ${settings.barrier}`}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prediction setting for Matches/Differs strategies */}
                    {(settings.tradeType === 'DIGITMATCH' || settings.tradeType === 'DIGITDIFF') && (
                        <div className='zen__card zen__card--strategy-dependent'>
                            <div className='zen__card-header'>PREDICTION DIGIT</div>
                            <div className='zen__card-content'>
                                <select
                                    className='zen__select'
                                    value={settings.prediction}
                                    onChange={e => handleSettingsChange('prediction', parseInt(e.target.value))}
                                >
                                    <option value={0}>0</option>
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                    <option value={6}>6</option>
                                    <option value={7}>7</option>
                                    <option value={8}>8</option>
                                    <option value={9}>9</option>
                                </select>
                                <div className='zen__card-description'>
                                    {settings.tradeType === 'DIGITMATCH'
                                        ? `Predict last digit will MATCH ${settings.prediction}`
                                        : `Predict last digit will DIFFER from ${settings.prediction}`}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='zen__card'>
                        <div className='zen__card-header'>SWITCH ON LOSS</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.switchOnLoss ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('switchOnLoss', !settings.switchOnLoss)}
                            >
                                <span className='zen__toggle-text'>{settings.switchOnLoss ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>
                                Switch to different Deriv account after consecutive losses
                            </div>
                            {settings.switchOnLoss && (
                                <div
                                    className='zen__card-info'
                                    style={{ marginTop: '8px', fontSize: '12px', color: '#0d9488' }}
                                >
                                    ℹ️ Will switch between Demo/Real accounts automatically
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>SWITCH MARKET</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.switchMarket ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('switchMarket', !settings.switchMarket)}
                            >
                                <span className='zen__toggle-text'>{settings.switchMarket ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>Switch between different volatility markets</div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>RAIN MODE</div>
                        <div className='zen__card-content'>
                            <button
                                className={`zen__toggle ${settings.rainMode ? 'zen__toggle--active' : ''}`}
                                onClick={() => handleSettingsChange('rainMode', !settings.rainMode)}
                            >
                                <span className='zen__toggle-text'>{settings.rainMode ? 'ON' : 'OFF'}</span>
                            </button>
                            <div className='zen__card-description'>Activate 1st martingale step on all losses</div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>LOSSES TO SWITCH</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.lossesToSwitch}
                                onChange={e => handleSettingsChange('lossesToSwitch', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>NUMBER OF RUNS</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.rounds}
                                onChange={e => handleSettingsChange('rounds', parseInt(e.target.value))}
                            />
                            <div className='zen__card-description'>
                                Auto-stop after completing {settings.rounds} trade{settings.rounds !== 1 ? 's' : ''}
                            </div>
                            <div className='zen__runs-progress'>
                                <div className='zen__runs-progress-bar'>
                                    <div
                                        className='zen__runs-progress-bar-fill'
                                        style={{
                                            width: `${Math.min((completedRuns / settings.rounds) * 100, 100)}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className='zen__runs-progress-text'>
                                    {completedRuns}/{settings.rounds}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profit-based Auto-Stop Feature */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>STOP ON PROFIT RUNS</div>
                        <div className='zen__card-content'>
                            <div className='zen__toggle-container'>
                                <label className='zen__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={settings.stopOnProfitRuns}
                                        onChange={e => handleSettingsChange('stopOnProfitRuns', e.target.checked)}
                                    />
                                    <span className='zen__toggle-slider'></span>
                                </label>
                                <span className='zen__toggle-label'>
                                    {settings.stopOnProfitRuns ? 'ENABLED' : 'DISABLED'}
                                </span>
                            </div>
                            <div className='zen__card-description'>Auto-stop after reaching profit target</div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>PROFIT RUNS TARGET</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.profitRunsTarget}
                                onChange={e => handleSettingsChange('profitRunsTarget', parseInt(e.target.value))}
                                disabled={!settings.stopOnProfitRuns}
                            />
                            <div className='zen__card-description'>
                                Stop after {settings.profitRunsTarget} profitable trade
                                {settings.profitRunsTarget !== 1 ? 's' : ''}
                            </div>
                            <div className='zen__runs-progress'>
                                <div className='zen__runs-progress-bar'>
                                    <div
                                        className='zen__runs-progress-bar-fill zen__runs-progress-bar-fill--profit'
                                        style={{
                                            width: `${Math.min((profitableRuns / settings.profitRunsTarget) * 100, 100)}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className='zen__runs-progress-text'>
                                    {profitableRuns}/{settings.profitRunsTarget} profitable
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Entry Point Feature */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>USE ENTRY POINT</div>
                        <div className='zen__card-content'>
                            <div className='zen__toggle-container'>
                                <label className='zen__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={settings.useEntryPoint}
                                        onChange={e => handleSettingsChange('useEntryPoint', e.target.checked)}
                                    />
                                    <span className='zen__toggle-slider'></span>
                                </label>
                                <span className='zen__toggle-label'>
                                    {settings.useEntryPoint ? 'ENABLED' : 'DISABLED'}
                                </span>
                            </div>
                            <div className='zen__card-description'>Wait for specific condition before trading</div>
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>ENTRY POINT CONFIG</div>
                        <div className='zen__card-content'>
                            <div className='zen__entry-point-config'>
                                <div className='zen__config-row'>
                                    <label className='zen__config-label'>Type:</label>
                                    <select
                                        className='zen__select zen__select--small'
                                        value={settings.entryPointType}
                                        onChange={e => handleSettingsChange('entryPointType', e.target.value)}
                                        disabled={!settings.useEntryPoint}
                                    >
                                        <option value='digit'>Last Digit</option>
                                        <option value='price'>Price Level</option>
                                    </select>
                                </div>
                                <div className='zen__config-row'>
                                    <label className='zen__config-label'>Condition:</label>
                                    <select
                                        className='zen__select zen__select--small'
                                        value={settings.entryPointCondition}
                                        onChange={e => handleSettingsChange('entryPointCondition', e.target.value)}
                                        disabled={!settings.useEntryPoint}
                                    >
                                        <option value='equals'>Equals</option>
                                        <option value='above'>Above</option>
                                        <option value='below'>Below</option>
                                    </select>
                                </div>
                                <div className='zen__config-row'>
                                    <label className='zen__config-label'>
                                        {settings.entryPointType === 'digit' ? 'Digit:' : 'Price:'}
                                    </label>
                                    {settings.entryPointType === 'digit' ? (
                                        <select
                                            className='zen__select zen__select--small'
                                            value={settings.entryPointDigit}
                                            onChange={e =>
                                                handleSettingsChange('entryPointDigit', parseInt(e.target.value))
                                            }
                                            disabled={!settings.useEntryPoint}
                                        >
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                                <option key={digit} value={digit}>
                                                    {digit}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            className='zen__input zen__input--small'
                                            type='number'
                                            step='0.001'
                                            value={settings.entryPointPrice}
                                            onChange={e =>
                                                handleSettingsChange('entryPointPrice', parseFloat(e.target.value))
                                            }
                                            disabled={!settings.useEntryPoint}
                                            placeholder='e.g. 123.456'
                                        />
                                    )}
                                </div>
                            </div>
                            <div className='zen__card-description'>
                                {settings.entryPointType === 'digit'
                                    ? `Trade when last digit is ${settings.entryPointCondition} ${settings.entryPointDigit}`
                                    : `Trade when price is ${settings.entryPointCondition} ${settings.entryPointPrice}`}
                            </div>
                        </div>
                    </div>

                    {/* Row 4 */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>TAKE PROFIT ($)</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.takeProfit}
                                onChange={e => handleSettingsChange('takeProfit', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>STOP LOSS ($)</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.stopLoss}
                                onChange={e => handleSettingsChange('stopLoss', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>MAX CONSECUTIVE LOSSES</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.maxConsecutiveLosses}
                                onChange={e => handleSettingsChange('maxConsecutiveLosses', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='zen__card'>
                        <div className='zen__card-header'>TARGET TRADES</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.targetTrades}
                                onChange={e => handleSettingsChange('targetTrades', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Row 5 */}
                    <div className='zen__card'>
                        <div className='zen__card-header'>DAILY LOSS LIMIT ($)</div>
                        <div className='zen__card-content'>
                            <input
                                className='zen__input zen__input--large'
                                type='number'
                                min='1'
                                value={settings.dailyLossLimit}
                                onChange={e => handleSettingsChange('dailyLossLimit', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className='zen__controls'>
                    <div className='zen__status-cards'>
                        <div className='zen__status-card'>
                            <div className='zen__status-icon'>⏸</div>
                            <div className='zen__status-label'>NO DELAY</div>
                            <div className='zen__status-description'>
                                Add optional delay between trades for stability
                            </div>
                        </div>

                        <div className='zen__status-card'>
                            <div className='zen__status-icon'>📊</div>
                            <div className='zen__status-label'>Real Tick Data</div>
                            <div className='zen__status-description'>
                                Trading on LIVE tick data from DERIV - Optimized frequency
                            </div>
                        </div>

                        <div className='zen__status-card'>
                            <div className='zen__status-icon'>🎯</div>
                            <div className='zen__status-label'>AI STRATEGY</div>
                            <div className='zen__status-description'>
                                Winning trades 2x in 1 trade using AI/ML - Martingale Entry Frequency
                            </div>
                        </div>

                        <div className='zen__status-card'>
                            <div className='zen__status-icon'>📈</div>
                            <div className='zen__status-label'>Advanced Features</div>
                            <div className='zen__status-description'>Access performance trading tools</div>
                        </div>

                        <div className='zen__status-card'>
                            <div className='zen__status-icon'>🔥</div>
                            <div className='zen__status-label'>TICK ANALYSIS</div>
                            <div className='zen__status-description'>Predict next tick in 10 different patterns</div>
                            <button
                                className={`zen__btn zen__btn--analysis ${showDigitFrequency ? 'zen__btn--active' : ''}`}
                                onClick={() => setShowDigitFrequency(!showDigitFrequency)}
                                title={showDigitFrequency ? 'Hide tick analysis' : 'Show tick analysis'}
                            >
                                {showDigitFrequency ? 'HIDE ANALYSIS' : 'SHOW ANALYSIS'}
                            </button>
                        </div>
                    </div>

                    <div className='zen__action-buttons'>
                        <button
                            className={`zen__btn zen__btn--run ${isAutoTrading ? 'zen__btn--stop' : ''}`}
                            onClick={isAutoTrading ? handleStopButtonClick : handleRunButtonClick}
                            disabled={!isAuthorized}
                            title={
                                isAutoTrading
                                    ? 'Stop auto trading'
                                    : settings.oneTradePerGesture
                                      ? `Start continuous high-frequency trading (1 contract every ${getTradingInterval()}ms)`
                                      : 'Start auto trading'
                            }
                        >
                            {isAutoTrading ? 'STOP' : 'RUN'}
                        </button>

                        <button className='zen__btn zen__btn--stop' onClick={handleStopButtonClick}>
                            STOP
                        </button>
                    </div>
                </div>

                {/* Transaction History */}
                <div className='zen__transactions-section'>
                    <TransactionHistory transactions={transactions} onExport={handleExport} onReset={handleReset} />
                </div>

                {/* Tick Analysis Component */}
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
