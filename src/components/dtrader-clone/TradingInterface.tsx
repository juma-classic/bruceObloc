import React from 'react';
import { observer } from 'mobx-react-lite';
import { TradingStore } from '@/stores/trading-store';
import './TradingInterface.scss';

interface TradingInterfaceProps {
    store: TradingStore;
}

const TradingInterface: React.FC<TradingInterfaceProps> = observer(({ store }) => {
    return (
        <div className="trading-interface">
            <div className="interface-footer">
                <div className="footer-stats">
                    <div className="stat-item">
                        <span className="stat-label">Total Positions:</span>
                        <span className="stat-value">{store.totalPositions}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">P&L:</span>
                        <span className={`stat-value ${store.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                            {store.profitLoss >= 0 ? '+' : ''}{store.profitLoss.toFixed(2)}
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Current Price:</span>
                        <span className="stat-value">{store.currentPrice.toFixed(5)}</span>
                    </div>
                </div>
                
                <div className="footer-actions">
                    <button 
                        className="action-btn refresh-btn"
                        onClick={() => store.setActiveSymbol(store.activeSymbol)}
                        title="Refresh Data"
                    >
                        🔄
                    </button>
                    <button 
                        className="action-btn settings-btn"
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>
        </div>
    );
});

export default TradingInterface;