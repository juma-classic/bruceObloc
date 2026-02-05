import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { TradingStore } from '@/stores/trading-store';
import './AssetSelector.scss';

interface Asset {
    symbol: string;
    display_name: string;
    market: string;
    submarket: string;
    pip: number;
    is_trading_suspended: boolean;
}

interface AssetSelectorProps {
    store: TradingStore;
}

const AssetSelector: React.FC<AssetSelectorProps> = observer(({ store }) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarket, setSelectedMarket] = useState('all');
    const [isLoading, setIsLoading] = useState(true);

    // Mock assets data - only volatility indices
    const mockAssets: Asset[] = [
        { symbol: 'R_100', display_name: 'Volatility 100 Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: 'R_75', display_name: 'Volatility 75 Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: 'R_50', display_name: 'Volatility 50 Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: 'R_25', display_name: 'Volatility 25 Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: 'R_10', display_name: 'Volatility 10 Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: '1HZ75V', display_name: 'Volatility 75 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: '1HZ25V', display_name: 'Volatility 25 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
        { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pip: 0.01, is_trading_suspended: false },
    ];

    const markets = [
        { value: 'all', label: 'All Volatility Indices', icon: '📊' },
        { value: 'synthetic_index', label: 'Volatility Indices', icon: '📊' },
    ];

    useEffect(() => {
        // Simulate loading assets
        setTimeout(() => {
            setAssets(mockAssets);
            setFilteredAssets(mockAssets);
            setIsLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        let filtered = assets;

        // Filter by market
        if (selectedMarket !== 'all') {
            filtered = filtered.filter(asset => asset.market === selectedMarket);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(asset =>
                asset.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredAssets(filtered);
    }, [assets, selectedMarket, searchTerm]);

    const handleAssetSelect = (asset: Asset) => {
        store.setActiveSymbol(asset.symbol);
    };

    const getMarketIcon = (market: string) => {
        const marketData = markets.find(m => m.value === market);
        return marketData?.icon || '📊';
    };

    if (isLoading) {
        return (
            <div className="asset-selector loading">
                <div className="loading-spinner"></div>
                <p>Loading assets...</p>
            </div>
        );
    }

    return (
        <div className="asset-selector">
            <div className="selector-header">
                <h3>Assets</h3>
            </div>

            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="market-filter">
                <select
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    className="market-select"
                >
                    {markets.map(market => (
                        <option key={market.value} value={market.value}>
                            {market.icon} {market.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="assets-list">
                {filteredAssets.map(asset => (
                    <div
                        key={asset.symbol}
                        className={`asset-item ${store.activeSymbol === asset.symbol ? 'active' : ''} ${asset.is_trading_suspended ? 'suspended' : ''}`}
                        onClick={() => !asset.is_trading_suspended && handleAssetSelect(asset)}
                    >
                        <div className="asset-info">
                            <div className="asset-header">
                                <span className="asset-icon">
                                    {getMarketIcon(asset.market)}
                                </span>
                                <span className="asset-symbol">{asset.symbol}</span>
                                {asset.is_trading_suspended && (
                                    <span className="suspended-badge">Suspended</span>
                                )}
                            </div>
                            <div className="asset-name">{asset.display_name}</div>
                            <div className="asset-details">
                                <span className="market-label">{asset.market.replace('_', ' ')}</span>
                                <span className="pip-info">Pip: {asset.pip}</span>
                            </div>
                        </div>
                        {store.activeSymbol === asset.symbol && (
                            <div className="active-indicator">✓</div>
                        )}
                    </div>
                ))}
            </div>

            {filteredAssets.length === 0 && (
                <div className="no-assets">
                    <p>No assets found matching your criteria.</p>
                </div>
            )}
        </div>
    );
});

export default AssetSelector;