import React from 'react';
import { useLiveDigitAnalysis } from '@/hooks/useLiveDigitAnalysis';
import { ConnectionType } from '@/services/deriv-connection-pool.service';
import './ZenDigitFrequency.scss';

interface ZenDigitFrequencyProps {
    isVisible: boolean;
    onClose: () => void;
    symbol?: string;
}

export const ZenDigitFrequency: React.FC<ZenDigitFrequencyProps> = ({ 
    isVisible, 
    onClose, 
    symbol = 'R_50' 
}) => {
    const {
        digitData,
        currentTick,
        isConnected,
        isLoading,
        ticksPerSecond,
        totalTicks,
        hotDigitsCount,
        getDigitColor,
        isHotDigit,
        getDigitStreak,
        resetData,
        connectionQuality
    } = useLiveDigitAnalysis({
        symbol,
        enableDebug: false,
        connectionType: ConnectionType.ANALYSIS
    });

    const streak = getDigitStreak();

    const getDigitGlow = (digit: number) => {
        if (currentTick === digit) return '0 0 20px rgba(251, 191, 36, 0.6)';
        if (isHotDigit(digit)) return '0 0 15px rgba(16, 185, 129, 0.4)';
        return 'none';
    };

    const getDigitBorderColor = (digit: number) => {
        if (currentTick === digit) return '#fbbf24';
        return getDigitColor(digit);
    };

    if (!isVisible) return null;

    return (
        <div className="zen-digit-frequency-overlay">
            <div className="zen-digit-frequency">
                <div className="frequency-header">
                    <div className="header-left">
                        <h3>🎯 Digit Analysis</h3>
                        <div className="connection-status">
                            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
                            <span className="status-text">
                                {isLoading ? 'Loading...' : isConnected ? 'LIVE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                    <div className="frequency-controls">
                        <button onClick={resetData} className="reset-button" title="Reset data">
                            🔄
                        </button>
                        <button onClick={onClose} className="close-button">×</button>
                    </div>
                </div>

                {/* Market Info Bar */}
                <div className="market-info-bar">
                    <div className="market-info">
                        <span className="market-label">Market:</span>
                        <span className="market-value">{symbol}</span>
                    </div>
                    <div className="market-info">
                        <span className="market-label">Ticks:</span>
                        <span className="market-value">{totalTicks}/1000</span>
                    </div>
                    <div className="market-info">
                        <span className="market-label">Rate:</span>
                        <span className="market-value">{ticksPerSecond.toFixed(1)}/s</span>
                    </div>
                    <div className="market-info">
                        <span className="market-label">Hot Digits:</span>
                        <span className="market-value">{hotDigitsCount}</span>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <span>Loading live data...</span>
                    </div>
                )}

                {/* Main Digits Grid */}
                {!isLoading && (
                    <>
                        <div className="digits-grid">
                            {digitData.map((data, index) => (
                                <div
                                    key={index}
                                    className={`digit-circle ${isHotDigit(index) ? 'hot' : ''} ${currentTick === index ? 'current' : ''}`}
                                    style={{
                                        borderColor: getDigitBorderColor(index),
                                        boxShadow: getDigitGlow(index),
                                        backgroundColor: currentTick === index ? getDigitColor(index) + '20' : 'transparent'
                                    }}
                                >
                                    <div className="digit-number">{index}</div>
                                    <div 
                                        className="digit-percentage"
                                        style={{ color: getDigitColor(index) }}
                                    >
                                        {data.percentage.toFixed(1)}%
                                    </div>
                                    {currentTick === index && (
                                        <div className="current-indicator">▼</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Last Digit Display */}
                        <div className="last-digit-display">
                            <span className="last-digit-label">Last Digit:</span>
                            <span 
                                className="last-digit-value"
                                style={{ color: currentTick !== null ? getDigitColor(currentTick) : '#8b92a7' }}
                            >
                                {currentTick ?? '—'}
                            </span>
                            {streak.count > 1 && (
                                <span className="streak-info">
                                    (Streak: {streak.count})
                                </span>
                            )}
                        </div>

                        {/* Data Quality Indicator */}
                        <div className="data-quality">
                            <span className="quality-label">Data Quality:</span>
                            <span className={`quality-value ${connectionQuality === 100 ? 'perfect' : connectionQuality > 90 ? 'good' : 'poor'}`}>
                                {connectionQuality}%
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};