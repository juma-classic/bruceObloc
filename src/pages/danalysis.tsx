import React, { useState, useEffect, useCallback } from 'react';
import './danalysis.scss';

interface DigitStats {
    digit: number;
    count: number;
    percentage: number;
    isHighest: boolean;
    is2ndHighest: boolean;
    isLowest: boolean;
    is2ndLowest: boolean;
}

interface TickData {
    digit: number;
    price: number;
    timestamp: number;
}

// Symbol mapping for Deriv API
const SYMBOL_MAP: Record<string, string> = {
    'Volatility 10 Index': 'R_10',
    'Volatility 25 Index': 'R_25',
    'Volatility 50 Index': 'R_50',
    'Volatility 75 Index': 'R_75',
    'Volatility 100 Index': 'R_100',
    'Volatility 10 (1s) Index': '1HZ10V',
    'Volatility 15 (1s) Index': '1HZ15V',
    'Volatility 25 (1s) Index': '1HZ25V',
    'Volatility 50 (1s) Index': '1HZ50V',
    'Volatility 75 (1s) Index': '1HZ75V',
    'Volatility 90 (1s) Index': '1HZ90V',
    'Volatility 100 (1s) Index': '1HZ100V',
    'Jump 10 Index': 'JD10',
    'Jump 25 Index': 'JD25',
    'Jump 50 Index': 'JD50',
    'Jump 75 Index': 'JD75',
    'Jump 100 Index': 'JD100',
};

// Direct WebSocket connection for DAnalysis
class DAnalysisAPI {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, (data: any) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            // Use the same app ID as the rest of the site
            const appId = '82255';
            const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
            
            console.log('🔌 DAnalysis connecting to Deriv API with App ID:', appId);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ DAnalysis WebSocket connected successfully');
                this.reconnectAttempts = 0;
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle tick data
                    if (data.tick) {
                        const callback = this.subscriptions.get(`tick_${data.tick.symbol}`);
                        if (callback) {
                            callback(data);
                        }
                    }
                    
                    // Handle history data
                    if (data.history) {
                        const callback = this.subscriptions.get(`history_${data.echo_req?.ticks_history}`);
                        if (callback) {
                            callback(data);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 DAnalysis WebSocket connection closed');
                this.reconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ DAnalysis WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to create DAnalysis WebSocket connection:', error);
            this.reconnect();
        }
    }

    private reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect DAnalysis WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached for DAnalysis WebSocket');
        }
    }

    public async getTicksHistory(symbol: string, count: number = 1000): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            // Validate symbol before making API call
            if (!symbol || symbol === 'na' || symbol === 'undefined' || symbol === 'null') {
                console.error('❌ Invalid symbol for tick history:', symbol);
                reject(new Error(`Invalid symbol for tick history: ${symbol}`));
                return;
            }

            const requestId = `history_${symbol}`;
            const request = {
                ticks_history: symbol,
                adjust_start_time: 1,
                count: count,
                end: 'latest',
                style: 'ticks',
                req_id: requestId
            };

            // Set up callback for this request
            this.subscriptions.set(requestId, (data) => {
                this.subscriptions.delete(requestId);
                resolve(data);
            });

            // Send request
            this.ws.send(JSON.stringify(request));

            // Set timeout
            setTimeout(() => {
                if (this.subscriptions.has(requestId)) {
                    this.subscriptions.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    public async subscribeToTicks(symbol: string, callback: (data: any) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const subscriptionId = `tick_${symbol}`;
            const request = {
                ticks: symbol,
                subscribe: 1,
                req_id: subscriptionId
            };

            // Set up callback for this subscription
            this.subscriptions.set(subscriptionId, callback);

            // Send request
            this.ws.send(JSON.stringify(request));
            resolve(subscriptionId);
        });
    }

    public async unsubscribe(subscriptionId: string) {
        if (this.subscriptions.has(subscriptionId)) {
            this.subscriptions.delete(subscriptionId);
        }
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                forget_all: 'ticks'
            }));
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

const DAnalysis: React.FC = () => {
    const [selectedMarket, setSelectedMarket] = useState('Circles');
    const [selectedIndex, setSelectedIndex] = useState('Volatility 10 Index');
    const [tickCount, setTickCount] = useState(1000);
    const [currentPrice, setCurrentPrice] = useState('0.000');
    const [recentTicks, setRecentTicks] = useState<number[]>([]);
    const [digitStats, setDigitStats] = useState<DigitStats[]>([]);
    const [tickHistory, setTickHistory] = useState<TickData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
    const [danalysisAPI] = useState(() => new DAnalysisAPI());

    // Extract last digit from price
    const extractDigit = useCallback((price: number): number => {
        const priceStr = price.toString();
        const lastChar = priceStr.charAt(priceStr.length - 1);
        return parseInt(lastChar) || 0;
    }, []);

    // Calculate digit statistics from tick history
    const calculateDigitStats = useCallback((ticks: TickData[]): DigitStats[] => {
        if (ticks.length === 0) {
            return Array.from({ length: 10 }, (_, i) => ({
                digit: i,
                count: 0,
                percentage: 0,
                isHighest: false,
                is2ndHighest: false,
                isLowest: false,
                is2ndLowest: false,
            }));
        }

        const digitCounts = new Array(10).fill(0);
        
        // Apply market-specific filtering
        let filteredTicks = ticks;
        if (selectedMarket === 'Matches') {
            // For matches, look for consecutive same digits
            filteredTicks = ticks.filter((tick, index) => {
                if (index === 0) return false;
                return tick.digit === ticks[index - 1].digit;
            });
        } else if (selectedMarket === 'Differs') {
            // For differs, look for consecutive different digits
            filteredTicks = ticks.filter((tick, index) => {
                if (index === 0) return false;
                return tick.digit !== ticks[index - 1].digit;
            });
        }

        // Count digits
        filteredTicks.forEach(tick => {
            digitCounts[tick.digit]++;
        });

        const totalCount = filteredTicks.length || 1;
        const stats: DigitStats[] = digitCounts.map((count, digit) => ({
            digit,
            count,
            percentage: parseFloat(((count / totalCount) * 100).toFixed(1)),
            isHighest: false,
            is2ndHighest: false,
            isLowest: false,
            is2ndLowest: false,
        }));

        // Sort to find highest and lowest
        const sortedByPercentage = [...stats].sort((a, b) => b.percentage - a.percentage);
        
        // Mark highest and 2nd highest
        if (sortedByPercentage[0]) sortedByPercentage[0].isHighest = true;
        if (sortedByPercentage[1]) sortedByPercentage[1].is2ndHighest = true;
        
        // Mark lowest and 2nd lowest
        const sortedAsc = [...stats].sort((a, b) => a.percentage - b.percentage);
        if (sortedAsc[0]) sortedAsc[0].isLowest = true;
        if (sortedAsc[1]) sortedAsc[1].is2ndLowest = true;

        return stats;
    }, [selectedMarket]);

    // Handle real-time tick data
    const handleTickData = useCallback((response: any) => {
        if (response.tick) {
            const price = parseFloat(response.tick.quote);
            const digit = extractDigit(price);
            const timestamp = response.tick.epoch * 1000;

            setCurrentPrice(price.toFixed(3));
            setConnectionStatus('Connected - Live Data');
            setIsConnected(true);
            
            // Update recent ticks
            setRecentTicks(prev => {
                const updated = [digit, ...prev];
                return updated.slice(0, 20);
            });

            // Update tick history
            const newTick: TickData = { digit, price, timestamp };
            setTickHistory(prev => {
                const updated = [newTick, ...prev];
                return updated.slice(0, tickCount);
            });
        }
    }, [extractDigit, tickCount]);

    // Subscribe to real-time ticks
    useEffect(() => {
        const symbol = SYMBOL_MAP[selectedIndex];
        if (!symbol) {
            setConnectionStatus('Invalid symbol selected');
            return;
        }

        const subscribeToTicks = async () => {
            try {
                setConnectionStatus('Connecting to Deriv API...');
                
                // Unsubscribe from previous subscription
                if (subscriptionId) {
                    await danalysisAPI.unsubscribe(subscriptionId);
                }

                // Wait for connection if not connected
                let attempts = 0;
                while (!danalysisAPI.isConnected() && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }

                if (!danalysisAPI.isConnected()) {
                    throw new Error('Failed to connect to Deriv API');
                }

                // Load historical data first
                setConnectionStatus('Loading historical data...');
                const historyResponse = await danalysisAPI.getTicksHistory(symbol, tickCount);

                if (historyResponse.history && historyResponse.history.prices) {
                    const historicalTicks: TickData[] = historyResponse.history.prices.map((price: string, index: number) => ({
                        digit: extractDigit(parseFloat(price)),
                        price: parseFloat(price),
                        timestamp: (historyResponse.history!.times![index] || 0) * 1000
                    }));

                    setTickHistory(historicalTicks.reverse());
                    setRecentTicks(historicalTicks.slice(-20).map(tick => tick.digit));
                    
                    if (historicalTicks.length > 0) {
                        setCurrentPrice(historicalTicks[historicalTicks.length - 1].price.toFixed(3));
                    }
                }

                // Subscribe to real-time updates
                setConnectionStatus('Subscribing to live data...');
                const newSubscriptionId = await danalysisAPI.subscribeToTicks(symbol, handleTickData);
                setSubscriptionId(newSubscriptionId);
                setIsConnected(true);
                setConnectionStatus('Connected - Live Data');

            } catch (error) {
                console.error('Failed to subscribe to ticks:', error);
                setIsConnected(false);
                setConnectionStatus('Connection failed - Using demo data');
                
                // Fallback to demo data
                const demoTicks = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10));
                setRecentTicks(demoTicks);
                setCurrentPrice((Math.random() * 1000 + 5000).toFixed(3));
            }
        };

        subscribeToTicks();

        return () => {
            if (subscriptionId) {
                danalysisAPI.unsubscribe(subscriptionId);
            }
        };
    }, [selectedIndex, tickCount, handleTickData, subscriptionId, extractDigit, danalysisAPI]);

    // Update digit statistics when tick history changes
    useEffect(() => {
        const stats = calculateDigitStats(tickHistory);
        setDigitStats(stats);
    }, [tickHistory, calculateDigitStats]);

    const getDigitClass = (stat: DigitStats) => {
        if (stat.isHighest) return 'highest';
        if (stat.is2ndHighest) return 'second-highest';
        if (stat.isLowest) return 'lowest';
        if (stat.is2ndLowest) return 'second-lowest';
        return '';
    };

    const marketOptions = ['Circles', 'Matches', 'Differs'];
    const indexOptions = [
        'Volatility 10 Index',
        'Volatility 25 Index', 
        'Volatility 50 Index',
        'Volatility 75 Index',
        'Volatility 100 Index',
        'Volatility 10 (1s) Index',
        'Volatility 15 (1s) Index',
        'Volatility 25 (1s) Index',
        'Volatility 50 (1s) Index',
        'Volatility 75 (1s) Index',
        'Volatility 90 (1s) Index',
        'Volatility 100 (1s) Index',
        'Jump 10 Index',
        'Jump 25 Index',
        'Jump 50 Index',
        'Jump 75 Index',
        'Jump 100 Index',
    ];

    return (
        <div className="danalysis">
            <div className="danalysis__header">
                <h1>DAnalysis - Digit Statistics</h1>
                <div className="connection-status" style={{
                    color: isConnected ? '#27ae60' : '#e74c3c',
                    fontSize: '14px',
                    marginTop: '10px'
                }}>
                    {connectionStatus}
                </div>
            </div>

            <div className="danalysis__controls">
                <div className="control-group">
                    <select 
                        value={selectedMarket} 
                        onChange={(e) => setSelectedMarket(e.target.value)}
                        className="control-select"
                    >
                        {marketOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <select 
                        value={selectedIndex} 
                        onChange={(e) => setSelectedIndex(e.target.value)}
                        className="control-select"
                    >
                        {indexOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <button 
                        onClick={() => {
                            setTickCount(1000);
                            setRecentTicks([]);
                            setTickHistory([]);
                        }}
                        className="reset-button"
                    >
                        Reset Data
                    </button>
                </div>
            </div>

            <div className="danalysis__stats">
                <div className="stats-header">
                    <div className="ticks-section">
                        <label>TICKS</label>
                        <input 
                            type="number" 
                            value={tickCount} 
                            onChange={(e) => setTickCount(parseInt(e.target.value) || 1000)}
                            className="ticks-input"
                            min="100"
                            max="5000"
                        />
                    </div>
                    <div className="price-section">
                        <span className="price-label">PRICE</span>
                        <span className="price-value">{currentPrice}</span>
                    </div>
                </div>

                <div className="recent-ticks">
                    <h3>LAST 20 TICKS</h3>
                    <div className="ticks-grid">
                        {recentTicks.map((tick, index) => (
                            <div key={index} className="tick-item">
                                {tick}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="digit-analysis">
                    <div className="digit-circles">
                        {digitStats.map((stat) => (
                            <div 
                                key={stat.digit} 
                                className={`digit-circle ${getDigitClass(stat)}`}
                                title={`Digit ${stat.digit}: ${stat.count} occurrences (${stat.percentage}%)`}
                            >
                                <div className="digit-number">{stat.digit}</div>
                                <div className="digit-percentage">{stat.percentage}%</div>
                            </div>
                        ))}
                    </div>

                    <div className="legend">
                        <div className="legend-item">
                            <span className="legend-dot highest"></span>
                            <span>Highest</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot second-highest"></span>
                            <span>2nd Highest</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot lowest"></span>
                            <span>Lowest</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot second-lowest"></span>
                            <span>2nd Lowest</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DAnalysis;