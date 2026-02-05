/**
 * Zen Movable Tick Display Component
 * Enhanced version with strategy switching and digit percentages
 */

import React, { useEffect, useMemo,useRef, useState } from 'react';
import './ZenMovableTickDisplay.scss';

interface ZenMovableTickDisplayProps {
    currentTick: number;
    market: string;
    isVisible: boolean;
    activeStrategy: string;
    onStrategyChange: (strategy: string) => void;
    tickHistory: number[];
    onClose: () => void;
}

type StrategyType = 'Even' | 'Odd' | 'Matches' | 'Differs' | 'Over' | 'Under' | 'Rise' | 'Fall';

const STRATEGIES: StrategyType[] = ['Even', 'Odd', 'Matches', 'Differs', 'Over', 'Under', 'Rise', 'Fall'];

export const ZenMovableTickDisplay: React.FC<ZenMovableTickDisplayProps> = ({
    currentTick,
    market,
    isVisible,
    activeStrategy,
    onStrategyChange,
    tickHistory,
    onClose,
}) => {
    const [position, setPosition] = useState({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [previousTick, setPreviousTick] = useState(currentTick);
    const [tickDirection, setTickDirection] = useState<'up' | 'down' | 'same'>('same');

    const overlayRef = useRef<HTMLDivElement>(null);

    // Calculate digit statistics from tick history
    const digitStats = useMemo(() => {
        if (tickHistory.length === 0) return {};

        const digits = tickHistory.map(tick => Math.floor(tick * 100) % 10);
        const digitCounts = Array(10).fill(0);

        digits.forEach(digit => {
            digitCounts[digit]++;
        });

        const total = digits.length;
        const percentages = digitCounts.map(count => (count / total) * 100);

        // Calculate strategy-specific stats
        const evenCount = digits.filter(d => d % 2 === 0).length;
        const oddCount = digits.filter(d => d % 2 === 1).length;

        const lastDigit = digits[digits.length - 1] || 0;
        const matchesCount = digits.filter(d => d === lastDigit).length;
        const differsCount = digits.filter(d => d !== lastDigit).length;

        // Over/Under calculations (compared to 5)
        const overCount = digits.filter(d => d > 4).length;
        const underCount = digits.filter(d => d < 5).length;

        // Rise/Fall calculations
        const rises = [];
        const falls = [];
        for (let i = 1; i < tickHistory.length; i++) {
            if (tickHistory[i] > tickHistory[i - 1]) rises.push(i);
            else if (tickHistory[i] < tickHistory[i - 1]) falls.push(i);
        }

        return {
            digitPercentages: percentages,
            digitCounts,
            total,
            lastDigit,
            strategies: {
                Even: { count: evenCount, percentage: (evenCount / total) * 100 },
                Odd: { count: oddCount, percentage: (oddCount / total) * 100 },
                Matches: { count: matchesCount, percentage: (matchesCount / total) * 100 },
                Differs: { count: differsCount, percentage: (differsCount / total) * 100 },
                Over: { count: overCount, percentage: (overCount / total) * 100 },
                Under: { count: underCount, percentage: (underCount / total) * 100 },
                Rise: { count: rises.length, percentage: (rises.length / (total - 1)) * 100 },
                Fall: { count: falls.length, percentage: (falls.length / (total - 1)) * 100 },
            },
        };
    }, [tickHistory]);

    // Load saved position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem(`zenTickDisplay_${market}_position`);
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        }

        const savedMinimized = localStorage.getItem(`zenTickDisplay_${market}_minimized`);
        if (savedMinimized) {
            setIsMinimized(JSON.parse(savedMinimized));
        }
    }, [market]);

    // Save position to localStorage
    const savePosition = (newPosition: { x: number; y: number }) => {
        localStorage.setItem(`zenTickDisplay_${market}_position`, JSON.stringify(newPosition));
    };

    // Save minimized state
    const saveMinimizedState = (minimized: boolean) => {
        localStorage.setItem(`zenTickDisplay_${market}_minimized`, JSON.stringify(minimized));
    };

    // Track tick direction changes
    useEffect(() => {
        if (currentTick !== previousTick) {
            if (currentTick > previousTick) {
                setTickDirection('up');
            } else if (currentTick < previousTick) {
                setTickDirection('down');
            } else {
                setTickDirection('same');
            }
            setPreviousTick(currentTick);
        }
    }, [currentTick, previousTick]);

    // Mouse drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
            setIsDragging(true);
            const rect = overlayRef.current?.getBoundingClientRect();
            if (rect) {
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newPosition = {
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            };

            // Keep overlay within viewport bounds
            const maxX = window.innerWidth - 350; // Overlay width
            const maxY = window.innerHeight - 400; // Overlay height

            newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
            newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));

            setPosition(newPosition);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            savePosition(position);
        }
    };

    // Global mouse event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset, position]);

    const handleMinimizeToggle = () => {
        const newMinimized = !isMinimized;
        setIsMinimized(newMinimized);
        saveMinimizedState(newMinimized);
    };

    const lastDigit = Math.floor(currentTick * 100) % 10;
    const currentStrategy = digitStats.strategies?.[activeStrategy as StrategyType];

    if (!isVisible) return null;

    return (
        <div
            ref={overlayRef}
            className={`zen-movable-tick-display ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''} ${tickDirection}`}
            style={{
                left: position.x,
                top: position.y,
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header with drag handle and controls */}
            <div className='zen-tick-display-header drag-handle'>
                <div className='header-left'>
                    <span className='drag-icon'>⋮⋮</span>
                    <h4>🧘 Zen Tick Analysis</h4>
                </div>

                <div className='header-controls'>
                    <button
                        className='minimize-btn'
                        onClick={e => {
                            e.stopPropagation();
                            handleMinimizeToggle();
                        }}
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? '□' : '−'}
                    </button>
                    <button
                        className='close-btn'
                        onClick={e => {
                            e.stopPropagation();
                            onClose();
                        }}
                        title='Close'
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Content (hidden when minimized) */}
            {!isMinimized && (
                <div className='zen-tick-display-content'>
                    {/* Strategy Selection Buttons */}
                    <div className='strategy-buttons'>
                        {STRATEGIES.map(strategy => (
                            <button
                                key={strategy}
                                className={`strategy-btn ${activeStrategy === strategy ? 'active' : ''}`}
                                onClick={() => onStrategyChange(strategy)}
                            >
                                {strategy}
                            </button>
                        ))}
                    </div>

                    {/* Current Price Section */}
                    <div className='current-price-section'>
                        <div className='price-label'>
                            {market}
                            <span className={`direction-indicator ${tickDirection}`}>
                                {tickDirection === 'up' ? '↗️' : tickDirection === 'down' ? '↘️' : '➡️'}
                            </span>
                        </div>
                        <div className={`price-value ${tickDirection}`}>{currentTick.toFixed(2)}</div>
                    </div>

                    {/* Last Digit Section */}
                    <div className='last-digit-section'>
                        <div className='digit-label'>Last Digit:</div>
                        <div className={`digit-value ${lastDigit % 2 === 0 ? 'even' : 'odd'}`}>{lastDigit}</div>
                    </div>

                    {/* Strategy Statistics */}
                    {currentStrategy && (
                        <div className='strategy-stats'>
                            <div className='stats-header'>
                                <h5>{activeStrategy} Strategy Stats</h5>
                                <span className='sample-size'>({digitStats.total} ticks)</span>
                            </div>
                            <div className='stats-content'>
                                <div className='stat-item'>
                                    <span className='stat-label'>Occurrences:</span>
                                    <span className='stat-value'>{currentStrategy.count}</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Percentage:</span>
                                    <span
                                        className={`stat-percentage ${currentStrategy.percentage > 50 ? 'favorable' : 'unfavorable'}`}
                                    >
                                        {currentStrategy.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Digit Distribution */}
                    <div className='digit-distribution'>
                        <h5>Digit Distribution</h5>
                        <div className='digit-grid'>
                            {Array.from({ length: 10 }, (_, i) => (
                                <div key={i} className={`digit-item ${i === lastDigit ? 'current' : ''}`}>
                                    <div className='digit-number'>{i}</div>
                                    <div className='digit-bar'>
                                        <div
                                            className='digit-fill'
                                            style={{ width: `${digitStats.digitPercentages?.[i] || 0}%` }}
                                        ></div>
                                    </div>
                                    <div className='digit-percent'>
                                        {(digitStats.digitPercentages?.[i] || 0).toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Strategy Overview */}
                    <div className='quick-overview'>
                        <h5>Quick Overview</h5>
                        <div className='overview-grid'>
                            <div className='overview-item'>
                                <span className='overview-label'>Even:</span>
                                <span className='overview-value'>
                                    {digitStats.strategies?.Even?.percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className='overview-item'>
                                <span className='overview-label'>Odd:</span>
                                <span className='overview-value'>
                                    {digitStats.strategies?.Odd?.percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className='overview-item'>
                                <span className='overview-label'>Over:</span>
                                <span className='overview-value'>
                                    {digitStats.strategies?.Over?.percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className='overview-item'>
                                <span className='overview-label'>Under:</span>
                                <span className='overview-value'>
                                    {digitStats.strategies?.Under?.percentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Minimized view */}
            {isMinimized && (
                <div className='zen-tick-display-minimized'>
                    <span className={`mini-price ${tickDirection}`}>{currentTick.toFixed(2)}</span>
                    <span className={`mini-digit ${lastDigit % 2 === 0 ? 'even' : 'odd'}`}>{lastDigit}</span>
                    <span className='mini-strategy'>{activeStrategy}</span>
                    {currentStrategy && (
                        <span
                            className={`mini-percentage ${currentStrategy.percentage > 50 ? 'favorable' : 'unfavorable'}`}
                        >
                            {currentStrategy.percentage.toFixed(1)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
