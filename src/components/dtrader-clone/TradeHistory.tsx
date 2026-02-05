import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TradingStore, Position } from '@/stores/trading-store';
import './TradeHistory.scss';

interface TradeHistoryProps {
    store: TradingStore;
}

const TradeHistory: React.FC<TradeHistoryProps> = observer(({ store }) => {
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

    const openPositions = store.positions.filter(p => p.status === 'open');
    const closedPositions = store.positions.filter(p => p.status !== 'open');

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'won': return '#10b981';
            case 'lost': return '#ef4444';
            case 'open': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const getContractTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            'CALL': 'Rise',
            'PUT': 'Fall',
            'ONETOUCH': 'Touch',
            'NOTOUCH': 'No Touch',
        };
        return labels[type] || type;
    };

    const handleSellPosition = (position: Position) => {
        if (position.status === 'open') {
            store.sellPosition(position.id);
        }
    };

    const renderPosition = (position: Position) => (
        <div key={position.id} className="position-item">
            <div className="position-header">
                <div className="position-info">
                    <span className="position-symbol">{position.symbol}</span>
                    <span className="position-type">{getContractTypeLabel(position.contract_type)}</span>
                </div>
                <div className="position-status">
                    <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(position.status) }}
                    >
                        {position.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="position-details">
                <div className="detail-row">
                    <span>Buy Price:</span>
                    <span>${position.buy_price.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                    <span>Payout:</span>
                    <span>${position.payout.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                    <span>Current Spot:</span>
                    <span>{position.current_spot.toFixed(5)}</span>
                </div>
                <div className="detail-row">
                    <span>P&L:</span>
                    <span className={position.profit_loss >= 0 ? 'profit' : 'loss'}>
                        {position.profit_loss >= 0 ? '+' : ''}${position.profit_loss.toFixed(2)}
                    </span>
                </div>
                <div className="detail-row">
                    <span>Entry Time:</span>
                    <span>{formatTime(position.entry_time)}</span>
                </div>
                {position.exit_time && (
                    <div className="detail-row">
                        <span>Exit Time:</span>
                        <span>{formatTime(position.exit_time)}</span>
                    </div>
                )}
            </div>

            {position.status === 'open' && (
                <div className="position-actions">
                    <button
                        className="sell-btn"
                        onClick={() => handleSellPosition(position)}
                    >
                        Sell
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="trade-history">
            <div className="history-header">
                <h3>Positions</h3>
                <div className="tab-selector">
                    <button
                        className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
                        onClick={() => setActiveTab('open')}
                    >
                        Open ({openPositions.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('closed')}
                    >
                        Closed ({closedPositions.length})
                    </button>
                </div>
            </div>

            <div className="positions-container">
                {activeTab === 'open' ? (
                    openPositions.length > 0 ? (
                        openPositions.map(renderPosition)
                    ) : (
                        <div className="no-positions">
                            <p>No open positions</p>
                        </div>
                    )
                ) : (
                    closedPositions.length > 0 ? (
                        closedPositions.map(renderPosition)
                    ) : (
                        <div className="no-positions">
                            <p>No closed positions</p>
                        </div>
                    )
                )}
            </div>

            {store.positions.length > 0 && (
                <div className="history-summary">
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-label">Total Trades:</span>
                            <span className="stat-value">{store.positions.length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Win Rate:</span>
                            <span className="stat-value">
                                {closedPositions.length > 0 
                                    ? ((closedPositions.filter(p => p.status === 'won').length / closedPositions.length) * 100).toFixed(1)
                                    : 0}%
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total P&L:</span>
                            <span className={`stat-value ${store.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                                {store.profitLoss >= 0 ? '+' : ''}${store.profitLoss.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default TradeHistory;