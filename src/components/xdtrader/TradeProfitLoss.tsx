import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { tradePositionManager } from '@/services/trade-position-manager.service';
import type { TradePosition } from './TradeIndicators';
import './TradeProfitLoss.scss';

interface TradeProfitLossProps {
    currentPrice: number;
}

const TradeProfitLoss: React.FC<TradeProfitLossProps> = observer(({ currentPrice }) => {
    const [totalProfitLoss, setTotalProfitLoss] = useState(0);
    const [activeTrades, setActiveTrades] = useState<TradePosition[]>([]);

    useEffect(() => {
        const positions = tradePositionManager.positions;
        setActiveTrades(positions);

        // Calculate total profit/loss
        let total = 0;
        positions.forEach(trade => {
            if (trade.status === 'OPEN') {
                // For open trades, calculate potential profit/loss based on current winning status
                if (trade.isWinning) {
                    total += (trade.payout - trade.stake); // Potential profit
                } else {
                    total -= trade.stake; // Potential loss (stake amount)
                }
            } else if (trade.status === 'WON') {
                total += (trade.payout - trade.stake); // Actual profit
            } else if (trade.status === 'LOST') {
                total -= trade.stake; // Actual loss
            }
        });

        setTotalProfitLoss(total);
    }, [tradePositionManager.positions, currentPrice]);

    const formatCurrency = (amount: number): string => {
        return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)} USD`;
    };

    const getProfitLossClass = (amount: number): string => {
        if (amount > 0) return 'profit';
        if (amount < 0) return 'loss';
        return 'neutral';
    };

    const getTradeStatusText = (trade: TradePosition): string => {
        if (trade.status === 'OPEN') {
            return trade.isWinning ? 'Winning' : 'Losing';
        }
        return trade.status === 'WON' ? 'Won' : 'Lost';
    };

    const getTradeProfit = (trade: TradePosition): number => {
        if (trade.status === 'OPEN') {
            return trade.isWinning ? (trade.payout - trade.stake) : -trade.stake;
        } else if (trade.status === 'WON') {
            return trade.payout - trade.stake;
        } else {
            return -trade.stake;
        }
    };

    if (activeTrades.length === 0) {
        return (
            <div className="trade-profit-loss">
                <div className="profit-loss-header">
                    <h3>Trade P&L</h3>
                </div>
                <div className="no-trades">
                    <p>No active trades</p>
                </div>
            </div>
        );
    }

    return (
        <div className="trade-profit-loss">
            <div className="profit-loss-header">
                <h3>Trade P&L</h3>
                <div className={`total-pnl ${getProfitLossClass(totalProfitLoss)}`}>
                    {formatCurrency(totalProfitLoss)}
                </div>
            </div>

            <div className="trades-list">
                {activeTrades.map(trade => {
                    const tradePnL = getTradeProfit(trade);
                    return (
                        <div key={trade.id} className="trade-item">
                            <div className="trade-info">
                                <div className="trade-type">
                                    {trade.prediction} {trade.barrier !== undefined ? trade.barrier : ''}
                                </div>
                                <div className="trade-details">
                                    <span className="stake">${trade.stake}</span>
                                    <span className="separator">→</span>
                                    <span className="payout">${trade.payout.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="trade-status">
                                <div className={`status-badge ${trade.status.toLowerCase()} ${trade.status === 'OPEN' ? (trade.isWinning ? 'winning' : 'losing') : ''}`}>
                                    {getTradeStatusText(trade)}
                                </div>
                                <div className={`trade-pnl ${getProfitLossClass(tradePnL)}`}>
                                    {formatCurrency(tradePnL)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="label">Active:</span>
                    <span className="value">{activeTrades.filter(t => t.status === 'OPEN').length}</span>
                </div>
                <div className="stat-item">
                    <span className="label">Won:</span>
                    <span className="value">{activeTrades.filter(t => t.status === 'WON').length}</span>
                </div>
                <div className="stat-item">
                    <span className="label">Lost:</span>
                    <span className="value">{activeTrades.filter(t => t.status === 'LOST').length}</span>
                </div>
            </div>
        </div>
    );
});

export default TradeProfitLoss;