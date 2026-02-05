import React, { useState, useEffect, useCallback } from 'react';
import './dtrader-manual.scss';

interface Market {
    symbol: string;
    name: string;
    category: string;
    price: number;
    change: number;
    changePercent: number;
}

interface Position {
    id: string;
    symbol: string;
    direction: 'HIGHER' | 'LOWER';
    stake: number;
    payout: number;
    pnl: number;
    openTime: Date;
}

interface TradeType {
    id: string;
    name: string;
    description: string;
}

const DTraderManual: React.FC = () => {
    // State management
    const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
    const [selectedTradeType, setSelectedTradeType] = useState<string>('rise_fall');
    const [selectedDuration, setSelectedDuration] = useState<string>('5t');
    const [stakeAmount, setStakeAmount] = useState<number>(10);
    const [positions, setPositions] = useState<Position[]>([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1M');
    const [accountBalance, setAccountBalance] = useState<number>(10000);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    // Mock data
    const markets: Market[] = [
        { symbol: 'EUR/USD', name: 'Euro vs US Dollar', category: 'Forex', price: 1.0845, change: 0.0012, changePercent: 0.11 },
        { symbol: 'GBP/USD', name: 'British Pound vs US Dollar', category: 'Forex', price: 1.2634, change: -0.0023, changePercent: -0.18 },
        { symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen', category: 'Forex', price: 149.85, change: 0.45, changePercent: 0.30 },
        { symbol: 'BTC/USD', name: 'Bitcoin vs US Dollar', category: 'Cryptocurrencies', price: 42350.50, change: 1250.30, changePercent: 3.04 },
        { symbol: 'ETH/USD', name: 'Ethereum vs US Dollar', category: 'Cryptocurrencies', price: 2485.75, change: -85.25, changePercent: -3.32 },
        { symbol: 'US30', name: 'US Wall Street 30', category: 'Indices', price: 37845.25, change: 125.80, changePercent: 0.33 },
        { symbol: 'SPX500', name: 'US S&P 500', category: 'Indices', price: 4785.60, change: -15.40, changePercent: -0.32 },
    ];

    const tradeTypes: TradeType[] = [
        { id: 'rise_fall', name: 'Rise/Fall', description: 'Predict if the price will rise or fall' },
        { id: 'higher_lower', name: 'Higher/Lower', description: 'Predict if the price will be higher or lower than a barrier' },
        { id: 'touch_no_touch', name: 'Touch/No Touch', description: 'Predict if the price will touch a barrier' },
        { id: 'in_out', name: 'In/Out', description: 'Predict if the price will stay within or go outside barriers' },
    ];

    const durations = [
        { value: '5t', label: '5 Ticks' },
        { value: '10t', label: '10 Ticks' },
        { value: '1m', label: '1 Minute' },
        { value: '5m', label: '5 Minutes' },
        { value: '15m', label: '15 Minutes' },
        { value: '30m', label: '30 Minutes' },
        { value: '1h', label: '1 Hour' },
        { value: '2h', label: '2 Hours' },
        { value: '4h', label: '4 Hours' },
        { value: '1d', label: '1 Day' },
    ];

    const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D'];

    // Initialize with first market
    useEffect(() => {
        if (markets.length > 0 && !selectedMarket) {
            setSelectedMarket(markets[0]);
        }
    }, [markets, selectedMarket]);

    // Simulate real-time price updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (selectedMarket) {
                const volatility = 0.001; // 0.1% volatility
                const change = (Math.random() - 0.5) * 2 * volatility * selectedMarket.price;
                const newPrice = selectedMarket.price + change;
                
                setSelectedMarket(prev => prev ? {
                    ...prev,
                    price: newPrice,
                    change: change,
                    changePercent: (change / prev.price) * 100
                } : null);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedMarket]);

    // Calculate payout
    const calculatePayout = useCallback(() => {
        const baseMultiplier = 1.85;
        const durationMultiplier = selectedDuration.includes('t') ? 0.05 : 0.1;
        const multiplier = baseMultiplier + (Math.random() * 0.13) + durationMultiplier;
        return Math.round(stakeAmount * multiplier * 100) / 100;
    }, [stakeAmount, selectedDuration]);

    // Handle market selection
    const handleMarketSelect = (market: Market) => {
        setSelectedMarket(market);
    };

    // Handle trade purchase
    const handlePurchase = (direction: 'HIGHER' | 'LOWER') => {
        if (!selectedMarket) return;

        const newPosition: Position = {
            id: Date.now().toString(),
            symbol: selectedMarket.symbol,
            direction,
            stake: stakeAmount,
            payout: calculatePayout(),
            pnl: 0, // Will be updated with simulation
            openTime: new Date(),
        };

        setPositions(prev => [...prev, newPosition]);
        setAccountBalance(prev => prev - stakeAmount);

        // Simulate P&L after some time
        setTimeout(() => {
            const randomOutcome = Math.random() > 0.5;
            const pnl = randomOutcome ? newPosition.payout - newPosition.stake : -newPosition.stake;
            
            setPositions(prev => prev.map(pos => 
                pos.id === newPosition.id ? { ...pos, pnl } : pos
            ));

            if (randomOutcome) {
                setAccountBalance(prev => prev + newPosition.payout);
            }
        }, 5000 + Math.random() * 10000); // 5-15 seconds
    };

    // Group markets by category
    const marketsByCategory = markets.reduce((acc, market) => {
        if (!acc[market.category]) {
            acc[market.category] = [];
        }
        acc[market.category].push(market);
        return acc;
    }, {} as Record<string, Market[]>);

    return (
        <div className="dtrader-manual">
            {/* Header */}
            <header className="dtrader-header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-text">Trader Master</span>
                    </div>
                </div>
                <div className="header-right">
                    <div className="account-info">
                        <span className="balance">${accountBalance.toLocaleString()}</span>
                        <span className="demo-badge">DEMO</span>
                    </div>
                </div>
            </header>

            <div className="dtrader-content">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <button 
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        ☰
                    </button>
                    
                    <div className="markets-section">
                        <h3>Markets</h3>
                        {Object.entries(marketsByCategory).map(([category, categoryMarkets]) => (
                            <div key={category} className="market-category">
                                <h4>{category}</h4>
                                {categoryMarkets.map(market => (
                                    <div
                                        key={market.symbol}
                                        className={`market-item ${selectedMarket?.symbol === market.symbol ? 'active' : ''}`}
                                        onClick={() => handleMarketSelect(market)}
                                    >
                                        <div className="market-symbol">{market.symbol}</div>
                                        <div className="market-price">
                                            <span className="price">{market.price.toFixed(market.symbol.includes('JPY') ? 2 : 4)}</span>
                                            <span className={`change ${market.change >= 0 ? 'positive' : 'negative'}`}>
                                                {market.change >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="settings-section">
                        <h3>Settings</h3>
                        <label className="setting-item">
                            <input type="checkbox" />
                            <span>Price alerts</span>
                        </label>
                        <label className="setting-item">
                            <input type="checkbox" />
                            <span>Sound notifications</span>
                        </label>
                        <label className="setting-item">
                            <input type="checkbox" defaultChecked />
                            <span>Auto-refresh</span>
                        </label>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {/* Chart Area */}
                    <div className="chart-area">
                        <div className="chart-header">
                            <div className="symbol-info">
                                <h2>{selectedMarket?.symbol}</h2>
                                <div className="price-info">
                                    <span className="current-price">
                                        {selectedMarket?.price.toFixed(selectedMarket.symbol.includes('JPY') ? 2 : 4)}
                                    </span>
                                    <span className={`price-change ${(selectedMarket?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                                        {(selectedMarket?.change || 0) >= 0 ? '+' : ''}{selectedMarket?.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <div className="timeframe-buttons">
                                {timeframes.map(tf => (
                                    <button
                                        key={tf}
                                        className={`timeframe-btn ${selectedTimeframe === tf ? 'active' : ''}`}
                                        onClick={() => setSelectedTimeframe(tf)}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="chart-container">
                            <div className="chart-placeholder">
                                <div className="chart-grid"></div>
                                <div className="chart-message">
                                    Chart for {selectedMarket?.symbol} - {selectedTimeframe}
                                    <br />
                                    <small>Real-time price: {selectedMarket?.price.toFixed(selectedMarket.symbol.includes('JPY') ? 2 : 4)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Trade Panel */}
                <aside className="trade-panel">
                    <div className="trade-section">
                        <h3>Trade</h3>
                        
                        {/* Trade Type Selection */}
                        <div className="trade-types">
                            {tradeTypes.map(type => (
                                <button
                                    key={type.id}
                                    className={`trade-type-btn ${selectedTradeType === type.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTradeType(type.id)}
                                    title={type.description}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>

                        {/* Market Selection */}
                        <div className="form-group">
                            <label>Market</label>
                            <select 
                                value={selectedMarket?.symbol || ''}
                                onChange={(e) => {
                                    const market = markets.find(m => m.symbol === e.target.value);
                                    if (market) setSelectedMarket(market);
                                }}
                            >
                                {markets.map(market => (
                                    <option key={market.symbol} value={market.symbol}>
                                        {market.symbol} - {market.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Duration Selection */}
                        <div className="form-group">
                            <label>Duration</label>
                            <select 
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(e.target.value)}
                            >
                                {durations.map(duration => (
                                    <option key={duration.value} value={duration.value}>
                                        {duration.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Stake Amount */}
                        <div className="form-group">
                            <label>Stake</label>
                            <div className="stake-input">
                                <span className="currency">$</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Payout Display */}
                        <div className="payout-info">
                            <div className="payout-row">
                                <span>Payout:</span>
                                <span className="payout-amount">${calculatePayout()}</span>
                            </div>
                            <div className="payout-row">
                                <span>Profit:</span>
                                <span className="profit-amount">${(calculatePayout() - stakeAmount).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Purchase Buttons */}
                        <div className="purchase-buttons">
                            <button
                                className="purchase-btn higher"
                                onClick={() => handlePurchase('HIGHER')}
                                disabled={stakeAmount > accountBalance}
                            >
                                HIGHER
                            </button>
                            <button
                                className="purchase-btn lower"
                                onClick={() => handlePurchase('LOWER')}
                                disabled={stakeAmount > accountBalance}
                            >
                                LOWER
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Positions Panel */}
            <div className="positions-panel">
                <h3>Open Positions ({positions.length})</h3>
                <div className="positions-list">
                    {positions.length === 0 ? (
                        <div className="no-positions">No open positions</div>
                    ) : (
                        positions.map(position => (
                            <div key={position.id} className="position-item">
                                <div className="position-symbol">{position.symbol}</div>
                                <div className={`position-direction ${position.direction.toLowerCase()}`}>
                                    {position.direction}
                                </div>
                                <div className="position-stake">${position.stake}</div>
                                <div className="position-payout">${position.payout}</div>
                                <div className={`position-pnl ${position.pnl >= 0 ? 'profit' : 'loss'}`}>
                                    {position.pnl === 0 ? 'Pending' : `$${position.pnl.toFixed(2)}`}
                                </div>
                                <div className="position-time">
                                    {position.openTime.toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DTraderManual;