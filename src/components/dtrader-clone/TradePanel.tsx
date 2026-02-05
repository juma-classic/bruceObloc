import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TradingStore } from '@/stores/trading-store';
import './TradePanel.scss';

interface TradePanelProps {
    store: TradingStore;
}

const TradePanel: React.FC<TradePanelProps> = observer(({ store }) => {
    const [isExecuting, setIsExecuting] = useState(false);

    const tradeTypes = [
        { value: 'CALL', label: 'Rise', color: '#10b981' },
        { value: 'PUT', label: 'Fall', color: '#ef4444' },
        { value: 'ONETOUCH', label: 'Touch', color: '#3b82f6' },
        { value: 'NOTOUCH', label: 'No Touch', color: '#8b5cf6' },
    ];

    const durationTypes = [
        { value: 'ticks', label: 'Ticks' },
        { value: 'm', label: 'Minutes' },
        { value: 'h', label: 'Hours' },
        { value: 'd', label: 'Days' },
    ];

    const handleTrade = async () => {
        if (!store.tradeProposal || isExecuting) return;

        setIsExecuting(true);
        try {
            await store.executeTrade();
        } catch (error) {
            console.error('Trade execution failed:', error);
        } finally {
            setIsExecuting(false);
        }
    };

    const getPayout = () => {
        if (!store.tradeProposal) return 0;
        return store.tradeProposal.payout - store.stake;
    };

    const getPayoutPercentage = () => {
        if (!store.tradeProposal || store.stake === 0) return 0;
        return ((store.tradeProposal.payout - store.stake) / store.stake) * 100;
    };

    return (
        <div className="trade-panel">
            <div className="panel-header">
                <h3>Trade Panel</h3>
            </div>

            <div className="trade-form">
                {/* Trade Type Selection */}
                <div className="form-group">
                    <label>Trade Type</label>
                    <div className="trade-type-grid">
                        {tradeTypes.map(type => (
                            <button
                                key={type.value}
                                className={`trade-type-btn ${store.tradeType === type.value ? 'active' : ''}`}
                                style={{ 
                                    borderColor: store.tradeType === type.value ? type.color : 'transparent',
                                    backgroundColor: store.tradeType === type.value ? `${type.color}20` : 'transparent'
                                }}
                                onClick={() => store.setTradeType(type.value)}
                            >
                                <span className="type-label">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stake Input */}
                <div className="form-group">
                    <label>Stake</label>
                    <div className="stake-input-container">
                        <input
                            type="number"
                            value={store.stake}
                            onChange={(e) => store.setStake(Number(e.target.value))}
                            min="1"
                            max="10000"
                            step="1"
                            className="stake-input"
                        />
                        <span className="currency-label">USD</span>
                    </div>
                    <div className="stake-presets">
                        {[10, 25, 50, 100].map(amount => (
                            <button
                                key={amount}
                                className="preset-btn"
                                onClick={() => store.setStake(amount)}
                            >
                                ${amount}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration Input */}
                <div className="form-group">
                    <label>Duration</label>
                    <div className="duration-container">
                        <input
                            type="number"
                            value={store.duration}
                            onChange={(e) => store.setDuration(Number(e.target.value))}
                            min="1"
                            max="365"
                            className="duration-input"
                        />
                        <select
                            value={store.durationType}
                            onChange={(e) => store.durationType = e.target.value}
                            className="duration-type-select"
                        >
                            {durationTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Trade Proposal */}
                {store.tradeProposal && (
                    <div className="trade-proposal">
                        <div className="proposal-row">
                            <span>Payout:</span>
                            <span className="payout-value">
                                ${store.tradeProposal.payout.toFixed(2)}
                            </span>
                        </div>
                        <div className="proposal-row">
                            <span>Profit:</span>
                            <span className="profit-value">
                                ${getPayout().toFixed(2)} ({getPayoutPercentage().toFixed(1)}%)
                            </span>
                        </div>
                        <div className="proposal-row">
                            <span>Current Spot:</span>
                            <span>{store.tradeProposal.spot.toFixed(5)}</span>
                        </div>
                    </div>
                )}

                {/* Purchase Button */}
                <button
                    className={`purchase-btn ${store.tradeType.toLowerCase()}`}
                    onClick={handleTrade}
                    disabled={!store.tradeProposal || isExecuting}
                >
                    {isExecuting ? (
                        <span className="loading-spinner">⏳</span>
                    ) : (
                        <>
                            <span>Purchase</span>
                            {store.tradeProposal && (
                                <span className="btn-price">
                                    ${store.tradeProposal.ask_price.toFixed(2)}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

export default TradePanel;