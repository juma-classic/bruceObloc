/**
 * Zen Advanced Configuration Panel
 * Admin-only advanced trading controls and analytics
 */

import React, { useEffect,useState } from 'react';
import './ZenAdvancedConfig.scss';

interface ZenAdvancedConfigProps {
    isVisible: boolean;
    onClose: () => void;
    onConfigChange: (config: AdvancedZenConfig) => void;
    currentConfig: AdvancedZenConfig;
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
    customStrategies: CustomStrategy[];

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

interface CustomStrategy {
    id: string;
    name: string;
    description: string;
    conditions: StrategyCondition[];
    enabled: boolean;
}

interface StrategyCondition {
    type: 'tick_pattern' | 'volatility' | 'time' | 'streak' | 'correlation';
    operator: 'greater_than' | 'less_than' | 'equals' | 'between';
    value: number | string;
    weight: number;
}

export const ZenAdvancedConfig: React.FC<ZenAdvancedConfigProps> = ({
    isVisible,
    onClose,
    onConfigChange,
    currentConfig,
}) => {
    const [config, setConfig] = useState<AdvancedZenConfig>(currentConfig);
    const [activeTab, setActiveTab] = useState<
        'risk' | 'strategy' | 'analysis' | 'execution' | 'performance' | 'advanced'
    >('risk');

    useEffect(() => {
        setConfig(currentConfig);
    }, [currentConfig]);

    const handleConfigUpdate = (updates: Partial<AdvancedZenConfig>) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleToggle = (key: keyof AdvancedZenConfig) => {
        handleConfigUpdate({ [key]: !config[key] });
    };

    const handleNumberChange = (key: keyof AdvancedZenConfig, value: number) => {
        handleConfigUpdate({ [key]: value });
    };

    if (!isVisible) return null;

    return (
        <div className='zen-advanced-config'>
            <div className='zen-advanced-config__overlay' onClick={onClose} />
            <div className='zen-advanced-config__panel'>
                <div className='zen-advanced-config__header'>
                    <h2>🧘 Zen Advanced Configuration</h2>
                    <button className='zen-advanced-config__close' onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className='zen-advanced-config__tabs'>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'risk' ? 'active' : ''}`}
                        onClick={() => setActiveTab('risk')}
                    >
                        🛡️ Risk Management
                    </button>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'strategy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('strategy')}
                    >
                        🎯 Strategy Optimization
                    </button>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analysis')}
                    >
                        📊 Market Analysis
                    </button>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'execution' ? 'active' : ''}`}
                        onClick={() => setActiveTab('execution')}
                    >
                        ⚡ Execution Controls
                    </button>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'performance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('performance')}
                    >
                        📈 Performance Analytics
                    </button>
                    <button
                        className={`zen-advanced-config__tab ${activeTab === 'advanced' ? 'active' : ''}`}
                        onClick={() => setActiveTab('advanced')}
                    >
                        🔧 Advanced Features
                    </button>
                </div>

                <div className='zen-advanced-config__content'>
                    {activeTab === 'risk' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Risk Management Controls</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.dynamicPositionSizing}
                                        onChange={() => handleToggle('dynamicPositionSizing')}
                                    />
                                    <span>Dynamic Position Sizing</span>
                                    <small>Automatically adjust stake based on market volatility</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Maximum Position Size</label>
                                <input
                                    type='number'
                                    value={config.maxPositionSize}
                                    onChange={e => handleNumberChange('maxPositionSize', parseFloat(e.target.value))}
                                    min='1'
                                    max='1000'
                                />
                                <small>Maximum stake per trade (USD)</small>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.volatilityAdjustment}
                                        onChange={() => handleToggle('volatilityAdjustment')}
                                    />
                                    <span>Volatility-Based Adjustment</span>
                                    <small>Reduce stakes during high volatility periods</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Correlation Limit (%)</label>
                                <input
                                    type='number'
                                    value={config.correlationLimit}
                                    onChange={e => handleNumberChange('correlationLimit', parseFloat(e.target.value))}
                                    min='0'
                                    max='100'
                                />
                                <small>Maximum correlation exposure between strategies</small>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.drawdownProtection}
                                        onChange={() => handleToggle('drawdownProtection')}
                                    />
                                    <span>Drawdown Protection</span>
                                    <small>Auto-reduce stakes during losing streaks</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Max Drawdown (%)</label>
                                <input
                                    type='number'
                                    value={config.maxDrawdownPercent}
                                    onChange={e => handleNumberChange('maxDrawdownPercent', parseFloat(e.target.value))}
                                    min='1'
                                    max='50'
                                />
                                <small>Stop trading if drawdown exceeds this percentage</small>
                            </div>
                        </div>
                    )}

                    {activeTab === 'strategy' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Strategy Optimization</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.multiStrategyMode}
                                        onChange={() => handleToggle('multiStrategyMode')}
                                    />
                                    <span>Multi-Strategy Portfolio</span>
                                    <small>Run multiple strategies simultaneously with allocation</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.autoStrategySwitch}
                                        onChange={() => handleToggle('autoStrategySwitch')}
                                    />
                                    <span>Auto Strategy Switching</span>
                                    <small>Automatically switch to best-performing strategy</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Performance Window (trades)</label>
                                <input
                                    type='number'
                                    value={config.strategyPerformanceWindow}
                                    onChange={e =>
                                        handleNumberChange('strategyPerformanceWindow', parseInt(e.target.value))
                                    }
                                    min='10'
                                    max='1000'
                                />
                                <small>Number of trades to evaluate strategy performance</small>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <h4>Custom Strategies</h4>
                                <div className='zen-advanced-config__custom-strategies'>
                                    <p>Custom strategy builder coming soon...</p>
                                    <button className='zen-advanced-config__btn'>+ Add Custom Strategy</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Market Analysis Tools</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.volatilityDetection}
                                        onChange={() => handleToggle('volatilityDetection')}
                                    />
                                    <span>Volatility Detection</span>
                                    <small>Monitor and react to market volatility changes</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.patternRecognition}
                                        onChange={() => handleToggle('patternRecognition')}
                                    />
                                    <span>Pattern Recognition</span>
                                    <small>Identify recurring tick patterns for better entries</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.sentimentAnalysis}
                                        onChange={() => handleToggle('sentimentAnalysis')}
                                    />
                                    <span>Market Sentiment Analysis</span>
                                    <small>Analyze market direction and momentum</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.marketCorrelationTracking}
                                        onChange={() => handleToggle('marketCorrelationTracking')}
                                    />
                                    <span>Market Correlation Tracking</span>
                                    <small>Monitor correlations between different markets</small>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'execution' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Execution Controls</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.smartOrderRouting}
                                        onChange={() => handleToggle('smartOrderRouting')}
                                    />
                                    <span>Smart Order Routing</span>
                                    <small>Optimize trade execution timing and routing</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.slippageProtection}
                                        onChange={() => handleToggle('slippageProtection')}
                                    />
                                    <span>Slippage Protection</span>
                                    <small>Prevent execution at unfavorable prices</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Max Slippage (%)</label>
                                <input
                                    type='number'
                                    value={config.maxSlippagePercent}
                                    onChange={e => handleNumberChange('maxSlippagePercent', parseFloat(e.target.value))}
                                    min='0'
                                    max='5'
                                    step='0.1'
                                />
                                <small>Maximum acceptable slippage percentage</small>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label>Execution Delay (ms)</label>
                                <input
                                    type='number'
                                    value={config.executionDelayMs}
                                    onChange={e => handleNumberChange('executionDelayMs', parseInt(e.target.value))}
                                    min='0'
                                    max='5000'
                                    step='100'
                                />
                                <small>Artificial delay before trade execution (for testing)</small>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Performance Analytics</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.realTimePnL}
                                        onChange={() => handleToggle('realTimePnL')}
                                    />
                                    <span>Real-time P&L Attribution</span>
                                    <small>Track profit sources by strategy and market</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.sharpeRatioTracking}
                                        onChange={() => handleToggle('sharpeRatioTracking')}
                                    />
                                    <span>Sharpe Ratio Tracking</span>
                                    <small>Monitor risk-adjusted returns continuously</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.drawdownMonitoring}
                                        onChange={() => handleToggle('drawdownMonitoring')}
                                    />
                                    <span>Advanced Drawdown Monitoring</span>
                                    <small>Track maximum drawdown and recovery periods</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.timeBasedAnalytics}
                                        onChange={() => handleToggle('timeBasedAnalytics')}
                                    />
                                    <span>Time-Based Analytics</span>
                                    <small>Analyze performance by time of day, day of week</small>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div className='zen-advanced-config__section'>
                            <h3>Advanced Features</h3>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.debugMode}
                                        onChange={() => handleToggle('debugMode')}
                                    />
                                    <span>Debug Mode</span>
                                    <small>Enable detailed debugging information</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.verboseLogging}
                                        onChange={() => handleToggle('verboseLogging')}
                                    />
                                    <span>Verbose Logging</span>
                                    <small>Log all trading decisions and market data</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.performanceOptimization}
                                        onChange={() => handleToggle('performanceOptimization')}
                                    />
                                    <span>Performance Optimization</span>
                                    <small>Enable advanced performance optimizations</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <label className='zen-advanced-config__toggle'>
                                    <input
                                        type='checkbox'
                                        checked={config.experimentalFeatures}
                                        onChange={() => handleToggle('experimentalFeatures')}
                                    />
                                    <span>Experimental Features</span>
                                    <small>Enable cutting-edge experimental trading features</small>
                                </label>
                            </div>

                            <div className='zen-advanced-config__group'>
                                <h4>System Information</h4>
                                <div className='zen-advanced-config__system-info'>
                                    <p>
                                        Connection Latency: <span className='value'>~150ms</span>
                                    </p>
                                    <p>
                                        API Rate Limit: <span className='value'>95/100 req/min</span>
                                    </p>
                                    <p>
                                        Memory Usage: <span className='value'>45.2 MB</span>
                                    </p>
                                    <p>
                                        Active Strategies: <span className='value'>1</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='zen-advanced-config__footer'>
                    <button className='zen-advanced-config__btn zen-advanced-config__btn--secondary' onClick={onClose}>
                        Cancel
                    </button>
                    <button className='zen-advanced-config__btn zen-advanced-config__btn--primary'>
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ZenAdvancedConfig;
