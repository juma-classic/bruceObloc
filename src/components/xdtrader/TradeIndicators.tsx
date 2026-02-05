import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import './TradeIndicators.scss';

export interface TradePosition {
    id: string;
    contractId: string;
    contractType: string;
    symbol: string;
    entryPrice: number;
    entryTime: number;
    stake: number;
    payout: number;
    prediction: 'RISE' | 'FALL' | 'HIGHER' | 'LOWER' | 'OVER' | 'UNDER' | 'EVEN' | 'ODD' | 'MATCHES' | 'DIFFERS';
    barrier?: number;
    duration: number;
    durationType: 'ticks' | 'minutes';
    status: 'OPEN' | 'WON' | 'LOST';
    currentPrice?: number;
    isWinning?: boolean;
}

interface TradeIndicatorsProps {
    trades: TradePosition[];
    currentPrice: number;
    onTradeUpdate?: (trade: TradePosition) => void;
}

const TradeIndicators: React.FC<TradeIndicatorsProps> = observer(({ trades, currentPrice, onTradeUpdate }) => {
    const [activeTrades, setActiveTrades] = useState<TradePosition[]>([]);
    const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0, priceRange: { min: 0, max: 0 } });
    const containerRef = useRef<HTMLDivElement>(null);

    // Get chart dimensions and price range
    useEffect(() => {
        const updateChartDimensions = () => {
            const chartContainer = document.querySelector('.ciq-chart-area');
            const priceAxis = document.querySelector('.ciq-chart .yAxis');
            
            if (chartContainer && priceAxis) {
                const containerRect = chartContainer.getBoundingClientRect();
                
                // Try to get price range from chart
                const priceLabels = priceAxis.querySelectorAll('.yAxis-label');
                let minPrice = Infinity;
                let maxPrice = -Infinity;
                
                priceLabels.forEach(label => {
                    const price = parseFloat(label.textContent || '0');
                    if (!isNaN(price)) {
                        minPrice = Math.min(minPrice, price);
                        maxPrice = Math.max(maxPrice, price);
                    }
                });
                
                // Fallback if we can't get prices from labels
                if (minPrice === Infinity || maxPrice === -Infinity) {
                    minPrice = currentPrice * 0.999;
                    maxPrice = currentPrice * 1.001;
                }
                
                setChartDimensions({
                    width: containerRect.width,
                    height: containerRect.height,
                    priceRange: { min: minPrice, max: maxPrice }
                });
            }
        };

        updateChartDimensions();
        
        // Update dimensions when window resizes or chart changes
        const resizeObserver = new ResizeObserver(updateChartDimensions);
        const chartContainer = document.querySelector('.ciq-chart-area');
        if (chartContainer) {
            resizeObserver.observe(chartContainer);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [currentPrice]);

    useEffect(() => {
        // Update active trades with current price and winning status
        const updatedTrades = trades.map(trade => {
            if (trade.status === 'OPEN') {
                const isWinning = calculateIsWinning(trade, currentPrice);
                const updatedTrade = {
                    ...trade,
                    currentPrice,
                    isWinning,
                };
                
                // Notify parent of trade update
                if (onTradeUpdate && (trade.isWinning !== isWinning || trade.currentPrice !== currentPrice)) {
                    onTradeUpdate(updatedTrade);
                }
                
                return updatedTrade;
            }
            return trade;
        });

        setActiveTrades(updatedTrades);
    }, [trades, currentPrice, onTradeUpdate]);

    // Calculate Y position based on price level
    const calculateYPosition = (price: number): number => {
        const { height, priceRange } = chartDimensions;
        if (height === 0 || priceRange.max === priceRange.min) return 50; // Default middle position
        
        // Calculate relative position (0 = top, 1 = bottom)
        const relativePosition = (priceRange.max - price) / (priceRange.max - priceRange.min);
        
        // Convert to pixel position with some padding
        const padding = height * 0.1; // 10% padding from top/bottom
        return padding + (relativePosition * (height - 2 * padding));
    };

    const calculateIsWinning = (trade: TradePosition, price: number): boolean => {
        switch (trade.prediction) {
            case 'RISE':
            case 'HIGHER':
                return price > trade.entryPrice;
            case 'FALL':
            case 'LOWER':
                return price < trade.entryPrice;
            case 'OVER':
                if (trade.barrier !== undefined) {
                    const lastDigit = Math.floor((price * 10000) % 10);
                    return lastDigit > trade.barrier;
                }
                return false;
            case 'UNDER':
                if (trade.barrier !== undefined) {
                    const lastDigit = Math.floor((price * 10000) % 10);
                    return lastDigit < trade.barrier;
                }
                return false;
            case 'EVEN':
                const evenDigit = Math.floor((price * 10000) % 10);
                return evenDigit % 2 === 0;
            case 'ODD':
                const oddDigit = Math.floor((price * 10000) % 10);
                return oddDigit % 2 === 1;
            case 'MATCHES':
                if (trade.barrier !== undefined) {
                    const matchDigit = Math.floor((price * 10000) % 10);
                    return matchDigit === trade.barrier;
                }
                return false;
            case 'DIFFERS':
                if (trade.barrier !== undefined) {
                    const differDigit = Math.floor((price * 10000) % 10);
                    return differDigit !== trade.barrier;
                }
                return false;
            default:
                return false;
        }
    };

    const getTradeIcon = (prediction: string): string => {
        switch (prediction) {
            case 'RISE':
            case 'HIGHER':
                return '↗';
            case 'FALL':
            case 'LOWER':
                return '↘';
            case 'OVER':
                return '🔺';
            case 'UNDER':
                return '🔻';
            case 'EVEN':
                return 'E';
            case 'ODD':
                return 'O';
            case 'MATCHES':
                return '=';
            case 'DIFFERS':
                return '≠';
            default:
                return '•';
        }
    };

    const getTradeLabel = (trade: TradePosition): string => {
        switch (trade.prediction) {
            case 'OVER':
            case 'UNDER':
                return `${trade.prediction} ${trade.barrier}`;
            case 'MATCHES':
            case 'DIFFERS':
                return `${trade.prediction} ${trade.barrier}`;
            default:
                return trade.prediction;
        }
    };

    const formatPrice = (price: number): string => {
        return price.toFixed(5);
    };

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="trade-indicators" ref={containerRef}>
            {activeTrades.map(trade => {
                const yPosition = calculateYPosition(trade.currentPrice || trade.entryPrice);
                
                return (
                    <div
                        key={trade.id}
                        className={`trade-flag ${trade.status.toLowerCase()} ${
                            trade.status === 'OPEN' 
                                ? (trade.isWinning ? 'winning' : 'losing')
                                : trade.status.toLowerCase()
                        }`}
                        style={{
                            position: 'absolute',
                            top: `${yPosition}px`,
                            right: '20px',
                            transform: 'translateY(-50%)',
                            zIndex: 1000,
                        }}
                    >
                        <div className="flag-pole"></div>
                        <div className="flag-content">
                            <div className="flag-header">
                                <span className="trade-icon">{getTradeIcon(trade.prediction)}</span>
                                <span className="trade-type">{getTradeLabel(trade)}</span>
                                <span className="trade-status-indicator">
                                    {trade.status === 'OPEN' && (
                                        trade.isWinning ? '✓' : '✗'
                                    )}
                                    {trade.status === 'WON' && '✓'}
                                    {trade.status === 'LOST' && '✗'}
                                </span>
                            </div>
                            
                            <div className="flag-details">
                                <div className="price-info">
                                    <span className="label">Entry:</span>
                                    <span className="value">{formatPrice(trade.entryPrice)}</span>
                                </div>
                                {trade.currentPrice && (
                                    <div className="price-info">
                                        <span className="label">Current:</span>
                                        <span className="value">{formatPrice(trade.currentPrice)}</span>
                                    </div>
                                )}
                                <div className="stake-info">
                                    <span className="label">Stake:</span>
                                    <span className="value">${trade.stake}</span>
                                </div>
                                <div className="payout-info">
                                    <span className="label">Payout:</span>
                                    <span className="value">${trade.payout.toFixed(2)}</span>
                                </div>
                                <div className="time-info">
                                    <span className="label">Time:</span>
                                    <span className="value">{formatTime(trade.entryTime)}</span>
                                </div>
                            </div>

                            {/* Progress indicator for time-based contracts */}
                            {trade.durationType === 'minutes' && trade.status === 'OPEN' && (
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{
                                        width: `${Math.min(100, ((Date.now() - trade.entryTime) / (trade.duration * 60000)) * 100)}%`
                                    }}></div>
                                </div>
                            )}
                        </div>
                        
                        {/* Price level line */}
                        <div className="price-level-line"></div>
                    </div>
                );
            })}
        </div>
    );
});

export default TradeIndicators;