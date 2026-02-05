import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import TradingInterface from '@/components/dtrader-clone/TradingInterface';
import TradingChart from '@/components/dtrader-clone/TradingChart';
import TradePanel from '@/components/dtrader-clone/TradePanel';
import AssetSelector from '@/components/dtrader-clone/AssetSelector';
import TradeHistory from '@/components/dtrader-clone/TradeHistory';
import { TradingStore } from '@/stores/trading-store';
import { useWebSocket } from '@/hooks/useWebSocket';
import './dtrader-clone.scss';

const DTraderClone: React.FC = observer(() => {
    const { client } = useStore();
    const [tradingStore] = useState(() => new TradingStore());
    const [isLoading, setIsLoading] = useState(true);
    const [demoMode, setDemoMode] = useState(false);

    // WebSocket connection for real-time data
    const { socket, connectionStatus } = useWebSocket(
        'wss://ws.derivws.com/websockets/v3',
        client.loginid
    );

    useEffect(() => {
        // Initialize trading store with WebSocket
        if (socket && connectionStatus === 'Connected') {
            tradingStore.setWebSocket(socket);
            setDemoMode(false);
        }
        
        // Don't block UI loading on WebSocket connection
        // Allow the interface to load even if WebSocket fails
        const loadingTimer = setTimeout(() => {
            setIsLoading(false);
            if (connectionStatus !== 'Connected') {
                setDemoMode(true);
                // Initialize with demo data
                tradingStore.initializeDemoMode();
            }
        }, 2000); // Show interface after 2 seconds regardless of connection status
        
        return () => clearTimeout(loadingTimer);
    }, [socket, connectionStatus, tradingStore]);

    useEffect(() => {
        // Load saved preferences if needed
        // Currently no tab switching functionality
    }, []);

    if (isLoading) {
        return (
            <div className="dtrader-loading">
                <div className="loading-spinner"></div>
                <p>Loading dTrader interface...</p>
                <div className="connection-info">
                    <span className={`status-indicator ${connectionStatus.toLowerCase()}`}></span>
                    <span className="status-text">{connectionStatus}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dtrader-clone">
            <div className="dtrader-header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-text">dTrader</span>
                        {demoMode && <span className="demo-badge">UNDER DEVELOPMENT</span>}
                    </div>
                    <div className="connection-status">
                        <span className={`status-indicator ${connectionStatus.toLowerCase()}`}></span>
                        <span className="status-text">
                            {demoMode ? 'Under Development - No Live Data' : connectionStatus}
                        </span>
                    </div>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="balance">
                            Balance: {client.balance} {client.currency}
                        </span>
                        <span className="account-type">
                            {client.is_virtual ? 'Demo' : 'Real'} Account
                        </span>
                    </div>
                </div>
            </div>

            <div className="dtrader-content">
                <div className="left-panel">
                    <AssetSelector store={tradingStore} />
                </div>

                <div className="center-panel">
                    <TradingChart store={tradingStore} />
                </div>

                <div className="right-panel">
                    <TradePanel store={tradingStore} />
                    <TradeHistory store={tradingStore} />
                </div>
            </div>

            <TradingInterface store={tradingStore} />
        </div>
    );
});

export default DTraderClone;