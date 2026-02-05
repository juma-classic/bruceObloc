import React, { useEffect, useState } from 'react';
import type { ContractSwitchingStats, ContractTypePerformance } from '@/services/zen-trading.service';
import { zenTradingService } from '@/services/zen-trading.service';
import './ContractSwitchingPanel.scss';

interface ContractSwitchingPanelProps {
    isVisible: boolean;
    onClose: () => void;
}

export const ContractSwitchingPanel: React.FC<ContractSwitchingPanelProps> = ({ isVisible, onClose }) => {
    const [stats, setStats] = useState<ContractSwitchingStats | null>(null);
    const [selectedStrategy, setSelectedStrategy] = useState<string>('');
    const [config, setConfig] = useState({
        enabled: true,
        mode: 'rotation' as 'rotation' | 'performance' | 'adaptive' | 'custom',
        lossesToSwitch: 3,
        resetOnWin: true,
        maxSwitches: 10,
        cooldownPeriod: 5,
        performanceWindow: 10,
        customSequence: [] as string[],
        excludeStrategies: [] as string[],
    });

    const strategies = ['Even', 'Odd', 'Matches', 'Differs', 'Over', 'Under', 'Rise', 'Fall', 'Straddle6'];

    useEffect(() => {
        if (isVisible) {
            updateStats();
            const interval = setInterval(updateStats, 2000);
            return () => clearInterval(interval);
        }
    }, [isVisible]);

    const updateStats = () => {
        const currentStats = zenTradingService.getContractSwitchingStats();
        setStats(currentStats);
    };

    const handleConfigUpdate = (key: string, value: any) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        zenTradingService.updateContractSwitchingConfig(newConfig);
    };

    const handleManualSwitch = () => {
        const success = zenTradingService.manualContractSwitch(selectedStrategy || undefined);
        if (success) {
            updateStats();
        }
    };

    const handleResetPerformance = () => {
        zenTradingService.resetContractPerformance();
        updateStats();
    };

    const formatPerformance = (performance: ContractTypePerformance) => {
        const recentWins = performance.recentPerformance.filter(win => win).length;
        const recentWinRate =
            performance.recentPerformance.length > 0 ? (recentWins / performance.recentPerformance.length) * 100 : 0;

        return {
            ...performance,
            recentWinRate,
        };
    };

    if (!isVisible) return null;

    return (
        <div className='contract-switching-panel-overlay' onClick={onClose}>
            <div className='contract-switching-panel' onClick={e => e.stopPropagation()}>
                <div className='panel-header'>
                    <h2>Contract Type Switching</h2>
                    <button className='close-btn' onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className='panel-content'>
                    {/* Configuration Section */}
                    <div className='config-section'>
                        <h3>Configuration</h3>

                        <div className='config-row'>
                            <label>
                                <input
                                    type='checkbox'
                                    checked={config.enabled}
                                    onChange={e => handleConfigUpdate('enabled', e.target.checked)}
                                />
                                Enable Contract Switching
                            </label>
                        </div>

                        <div className='config-row'>
                            <label>Switching Mode:</label>
                            <select value={config.mode} onChange={e => handleConfigUpdate('mode', e.target.value)}>
                                <option value='rotation'>Sequential Rotation</option>
                                <option value='performance'>Performance-Based</option>
                                <option value='adaptive'>Market-Adaptive</option>
                                <option value='custom'>Custom Sequence</option>
                            </select>
                        </div>

                        <div className='config-row'>
                            <label>Losses to Switch:</label>
                            <input
                                type='number'
                                min='1'
                                max='10'
                                value={config.lossesToSwitch}
                                onChange={e => handleConfigUpdate('lossesToSwitch', parseInt(e.target.value))}
                            />
                        </div>

                        <div className='config-row'>
                            <label>Max Switches per Session:</label>
                            <input
                                type='number'
                                min='1'
                                max='50'
                                value={config.maxSwitches}
                                onChange={e => handleConfigUpdate('maxSwitches', parseInt(e.target.value))}
                            />
                        </div>

                        <div className='config-row'>
                            <label>Cooldown Period (minutes):</label>
                            <input
                                type='number'
                                min='0'
                                max='60'
                                value={config.cooldownPeriod}
                                onChange={e => handleConfigUpdate('cooldownPeriod', parseInt(e.target.value))}
                            />
                        </div>

                        <div className='config-row'>
                            <label>
                                <input
                                    type='checkbox'
                                    checked={config.resetOnWin}
                                    onChange={e => handleConfigUpdate('resetOnWin', e.target.checked)}
                                />
                                Reset to Original on Win
                            </label>
                        </div>
                    </div>

                    {/* Statistics Section */}
                    {stats && (
                        <div className='stats-section'>
                            <h3>Statistics</h3>

                            <div className='stats-grid'>
                                <div className='stat-item'>
                                    <span className='stat-label'>Total Switches:</span>
                                    <span className='stat-value'>{stats.totalSwitches}</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>This Session:</span>
                                    <span className='stat-value'>{stats.switchesThisSession}</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Best Performer:</span>
                                    <span className='stat-value'>{stats.bestPerformingContract}</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Cooldown:</span>
                                    <span className='stat-value'>
                                        {stats.currentSwitchCooldown > 0 ? `${stats.currentSwitchCooldown}m` : 'Ready'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Performance Table */}
                    {stats && stats.performanceByContract.length > 0 && (
                        <div className='performance-section'>
                            <h3>Contract Performance</h3>

                            <div className='performance-table'>
                                <div className='table-header'>
                                    <span>Strategy</span>
                                    <span>Trades</span>
                                    <span>Win Rate</span>
                                    <span>Recent</span>
                                    <span>Avg Profit</span>
                                    <span>Total P&L</span>
                                </div>

                                {stats.performanceByContract.map(performance => {
                                    const formatted = formatPerformance(performance);
                                    return (
                                        <div key={performance.strategy} className='table-row'>
                                            <span className='strategy-name'>{performance.strategy}</span>
                                            <span>{performance.totalTrades}</span>
                                            <span className={performance.winRate >= 0.5 ? 'positive' : 'negative'}>
                                                {(performance.winRate * 100).toFixed(1)}%
                                            </span>
                                            <span className={formatted.recentWinRate >= 50 ? 'positive' : 'negative'}>
                                                {formatted.recentWinRate.toFixed(0)}%
                                            </span>
                                            <span className={performance.avgProfit >= 0 ? 'positive' : 'negative'}>
                                                ${performance.avgProfit.toFixed(2)}
                                            </span>
                                            <span className={performance.totalProfit >= 0 ? 'positive' : 'negative'}>
                                                ${performance.totalProfit.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Switch History */}
                    {stats && stats.switchHistory.length > 0 && (
                        <div className='history-section'>
                            <h3>Recent Switches</h3>

                            <div className='history-list'>
                                {stats.switchHistory
                                    .slice(-5)
                                    .reverse()
                                    .map((switchEvent, index) => (
                                        <div key={index} className='history-item'>
                                            <div className='switch-info'>
                                                <span className='switch-direction'>
                                                    {switchEvent.from} → {switchEvent.to}
                                                </span>
                                                <span className='switch-reason'>{switchEvent.reason}</span>
                                            </div>
                                            <div className='switch-meta'>
                                                <span className='switch-time'>
                                                    {new Date(switchEvent.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span className='switch-losses'>
                                                    {switchEvent.consecutiveLosses} losses
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Controls */}
                    <div className='controls-section'>
                        <h3>Manual Controls</h3>

                        <div className='control-row'>
                            <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                                <option value=''>Auto-select next</option>
                                {strategies.map(strategy => (
                                    <option key={strategy} value={strategy}>
                                        {strategy}
                                    </option>
                                ))}
                            </select>

                            <button
                                className='switch-btn'
                                onClick={handleManualSwitch}
                                disabled={stats?.currentSwitchCooldown > 0}
                            >
                                Manual Switch
                            </button>
                        </div>

                        <div className='control-row'>
                            <button className='reset-btn' onClick={handleResetPerformance}>
                                Reset Performance Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
