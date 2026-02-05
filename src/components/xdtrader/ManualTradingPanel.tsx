import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { manualTradingService, type TradeRequest } from '@/services/manual-trading.service';
import { validateSymbolOrWarn } from '@/utils/symbol-validator';
import './ManualTradingPanel.scss';

interface TradeType {
    id: string;
    name: string;
    icon: string;
    contracts: {
        primary: string;
        secondary: string;
    };
}

interface ManualTradingPanelProps {
    symbol: string;
    onTradeExecuted?: (trade: any) => void;
}

const TRADE_TYPES: TradeType[] = [
    {
        id: 'rise_fall',
        name: 'Rise/Fall',
        icon: '↗',
        contracts: { primary: 'CALL', secondary: 'PUT' }
    },
    {
        id: 'higher_lower',
        name: 'Higher/Lower',
        icon: '↕',
        contracts: { primary: 'CALLE', secondary: 'PUTE' }
    },
    {
        id: 'over_under',
        name: 'Over/Under',
        icon: '🔺🔻',
        contracts: { primary: 'DIGITOVER', secondary: 'DIGITUNDER' }
    },
    {
        id: 'even_odd',
        name: 'Even/Odd',
        icon: '#',
        contracts: { primary: 'DIGITEVEN', secondary: 'DIGITODD' }
    },
    {
        id: 'matches_differs',
        name: 'Matches/Differs',
        icon: '=',
        contracts: { primary: 'DIGITMATCHES', secondary: 'DIGITDIFFERS' }
    }
];

const ManualTradingPanel: React.FC<ManualTradingPanelProps> = observer(({ symbol, onTradeExecuted }) => {
    const [selectedTradeType, setSelectedTradeType] = useState<TradeType>(TRADE_TYPES[0]);
    const [durationType, setDurationType] = useState<'ticks' | 'minutes'>('ticks');
    const [duration, setDuration] = useState(5);
    const [stake, setStake] = useState(10);
    const [allowEquals, setAllowEquals] = useState(false);
    const [proposals, setProposals] = useState<{
        primary?: any;
        secondary?: any;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [barrier, setBarrier] = useState(5);

    // Debug log to ensure component is rendering
    useEffect(() => {
        console.log('🎯 ManualTradingPanel mounted with symbol:', symbol);
    }, [symbol]);

    // Subscribe to live prices
    useEffect(() => {
        if (!symbol || !validateSymbolOrWarn(symbol, 'manual trading')) return;

        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            unsubscribe = await manualTradingService.subscribeToPrice(symbol, (price) => {
                setCurrentPrice(price);
            });
        };

        setupSubscription();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [symbol]);

    // Get proposals when parameters change
    useEffect(() => {
        if (!symbol || !validateSymbolOrWarn(symbol, 'proposals')) return;

        const getProposals = async () => {
            setIsLoading(true);
            try {
                const proposalRequests = [
                    {
                        symbol,
                        contractType: selectedTradeType.contracts.primary,
                        stake,
                        duration,
                        durationType,
                        barrier: (selectedTradeType.id === 'over_under' || selectedTradeType.id === 'matches_differs') ? barrier : undefined,
                    },
                    {
                        symbol,
                        contractType: selectedTradeType.contracts.secondary,
                        stake,
                        duration,
                        durationType,
                        barrier: (selectedTradeType.id === 'over_under' || selectedTradeType.id === 'matches_differs') ? barrier : undefined,
                    }
                ];

                const [primaryProposal, secondaryProposal] = await manualTradingService.getMultipleProposals(proposalRequests);

                setProposals({
                    primary: primaryProposal,
                    secondary: secondaryProposal,
                });
            } catch (error) {
                console.error('Failed to get proposals:', error);
                setProposals({});
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(getProposals, 500);
        return () => clearTimeout(debounceTimer);
    }, [symbol, selectedTradeType, durationType, duration, stake, barrier]);

    const executeTrade = useCallback(async (contractType: 'primary' | 'secondary') => {
        if (!symbol || !validateSymbolOrWarn(symbol, 'trade execution')) return;

        const proposal = proposals[contractType];
        if (!proposal) {
            console.error('No proposal available for trade');
            return;
        }

        setIsLoading(true);
        try {
            const tradeRequest: TradeRequest = {
                symbol,
                contractType: contractType === 'primary' ? selectedTradeType.contracts.primary : selectedTradeType.contracts.secondary,
                stake,
                duration,
                durationType,
                barrier: (selectedTradeType.id === 'over_under' || selectedTradeType.id === 'matches_differs') ? barrier : undefined,
                allowEquals,
            };

            const result = await manualTradingService.executeTrade(tradeRequest);

            if (result.success) {
                console.log('✅ Trade executed successfully:', result);
                
                const tradeData = {
                    contract_id: result.contractId,
                    transaction_id: result.transactionId,
                    contract_type: tradeRequest.contractType,
                    symbol: symbol,
                    stake: stake,
                    payout: result.payout,
                    buy_price: result.buyPrice,
                    duration: duration,
                    duration_type: durationType,
                    barrier: barrier,
                    timestamp: Date.now(),
                };

                onTradeExecuted?.(tradeData);
            } else {
                console.error('Trade execution failed:', result.error);
                // You could show a toast notification here
            }
        } catch (error) {
            console.error('Failed to execute trade:', error);
        } finally {
            setIsLoading(false);
        }
    }, [symbol, proposals, stake, selectedTradeType, duration, durationType, barrier, allowEquals, onTradeExecuted]);

    const getPrimaryButtonText = () => {
        switch (selectedTradeType.id) {
            case 'rise_fall': return 'Rise';
            case 'higher_lower': return 'Higher';
            case 'over_under': return 'Over';
            case 'even_odd': return 'Even';
            case 'matches_differs': return `Matches ${barrier}`;
            default: return 'Buy';
        }
    };

    const getSecondaryButtonText = () => {
        switch (selectedTradeType.id) {
            case 'rise_fall': return 'Fall';
            case 'higher_lower': return 'Lower';
            case 'over_under': return 'Under';
            case 'even_odd': return 'Odd';
            case 'matches_differs': return `Differs ${barrier}`;
            default: return 'Sell';
        }
    };

    const formatPayout = (payout: number) => {
        return payout ? `${payout.toFixed(2)} USD` : '0.00 USD';
    };

    const calculateProbability = (payout: number, stake: number) => {
        if (!payout || !stake) return '0.00%';
        const probability = (stake / payout) * 100;
        return `${probability.toFixed(2)}%`;
    };

    return (
        <div className="manual-trading-panel">
            <div className="panel-header">
                <span className="info-icon">i</span>
                <span className="header-text">Learn about this trade type</span>
            </div>

            {/* Trade Type Selector */}
            <div className="trade-type-selector">
                <button className="nav-button prev" onClick={() => {
                    const currentIndex = TRADE_TYPES.findIndex(t => t.id === selectedTradeType.id);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : TRADE_TYPES.length - 1;
                    setSelectedTradeType(TRADE_TYPES[prevIndex]);
                }}>
                    ‹
                </button>
                
                <div className="trade-type-display">
                    <span className="trade-icon">{selectedTradeType.icon}</span>
                    <span className="trade-name">{selectedTradeType.name}</span>
                </div>

                <button className="nav-button next" onClick={() => {
                    const currentIndex = TRADE_TYPES.findIndex(t => t.id === selectedTradeType.id);
                    const nextIndex = currentIndex < TRADE_TYPES.length - 1 ? currentIndex + 1 : 0;
                    setSelectedTradeType(TRADE_TYPES[nextIndex]);
                }}>
                    ›
                </button>
            </div>

            {/* Duration Type Selector */}
            <div className="duration-type-selector">
                <button 
                    className={`duration-btn ${durationType === 'ticks' ? 'active' : ''}`}
                    onClick={() => setDurationType('ticks')}
                >
                    Ticks
                </button>
                <button 
                    className={`duration-btn ${durationType === 'minutes' ? 'active' : ''}`}
                    onClick={() => setDurationType('minutes')}
                >
                    Minutes
                </button>
            </div>

            {/* Duration Slider */}
            <div className="duration-slider">
                <input
                    type="range"
                    min={durationType === 'ticks' ? 1 : 1}
                    max={durationType === 'ticks' ? 10 : 60}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="slider"
                />
                <div className="duration-display">
                    {duration} {durationType === 'ticks' ? 'Ticks' : 'Minutes'}
                </div>
                <button className="dropdown-btn">⌄</button>
            </div>

            {/* Barrier Input (for Over/Under and Matches/Differs) */}
            {(selectedTradeType.id === 'over_under' || selectedTradeType.id === 'matches_differs') && (
                <div className="digit-prediction-section">
                    <div className="section-title">Last Digit Prediction</div>
                    <div className="digit-grid">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                            <button
                                key={digit}
                                className={`digit-button ${barrier === digit ? 'selected' : ''}`}
                                onClick={() => setBarrier(digit)}
                            >
                                {digit}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stake and Payout */}
            <div className="stake-payout-selector">
                <button className="stake-btn active">Stake</button>
                <button className="payout-btn">Payout</button>
            </div>

            <div className="stake-input">
                <button onClick={() => setStake(Math.max(0.35, stake - 1))}>-</button>
                <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(parseFloat(e.target.value) || 0.35)}
                    min="0.35"
                    step="0.01"
                />
                <span className="currency">USD</span>
                <button onClick={() => setStake(stake + 1)}>+</button>
            </div>

            {/* Allow Equals */}
            <div className="allow-equals">
                <input
                    type="checkbox"
                    id="allow-equals"
                    checked={allowEquals}
                    onChange={(e) => setAllowEquals(e.target.checked)}
                />
                <label htmlFor="allow-equals">Allow equals</label>
                <span className="info-icon">i</span>
            </div>

            {/* Current Price Display */}
            {currentPrice && (
                <div className="current-price">
                    Current Price: {currentPrice.toFixed(5)}
                </div>
            )}

            {/* Trade Buttons */}
            <div className="trade-buttons">
                <div className="trade-option primary">
                    <div className="payout-info">
                        Payout {formatPayout(proposals.primary?.payout || 0)}
                        <span className="info-icon">i</span>
                    </div>
                    <button
                        className="trade-btn primary-btn"
                        onClick={() => executeTrade('primary')}
                        disabled={isLoading || !proposals.primary}
                    >
                        <span className="btn-icon">🔺</span>
                        <span className="btn-text">{getPrimaryButtonText()}</span>
                        <span className="probability">
                            {calculateProbability(proposals.primary?.payout || 0, stake)}
                        </span>
                    </button>
                </div>

                <div className="trade-option secondary">
                    <div className="payout-info">
                        Payout {formatPayout(proposals.secondary?.payout || 0)}
                        <span className="info-icon">i</span>
                    </div>
                    <button
                        className="trade-btn secondary-btn"
                        onClick={() => executeTrade('secondary')}
                        disabled={isLoading || !proposals.secondary}
                    >
                        <span className="btn-icon">🔻</span>
                        <span className="btn-text">{getSecondaryButtonText()}</span>
                        <span className="probability">
                            {calculateProbability(proposals.secondary?.payout || 0, stake)}
                        </span>
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                </div>
            )}
        </div>
    );
});

export default ManualTradingPanel;