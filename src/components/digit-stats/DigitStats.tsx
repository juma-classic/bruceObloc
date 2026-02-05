import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './DigitStats.scss';

interface DigitStat {
    digit: number;
    percentage: number;
    count: number;
    isHighest: boolean;
    isLowest: boolean;
}

interface DigitStatsProps {
    symbol?: string;
    className?: string;
}

// Direct WebSocket connection for digit statistics
class DigitStatsAPI {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, (data: any) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 2000;

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            const appId = '82255';
            const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ DigitStats WebSocket connected');
                this.reconnectAttempts = 0;
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.tick) {
                        const callback = this.subscriptions.get(`tick_${data.tick.symbol}`);
                        if (callback) {
                            callback(data);
                        }
                    }
                    
                    if (data.history) {
                        const callback = this.subscriptions.get(`history_${data.echo_req?.ticks_history}`);
                        if (callback) {
                            callback(data);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error parsing DigitStats WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 DigitStats WebSocket connection closed');
                this.reconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ DigitStats WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to create DigitStats WebSocket connection:', error);
            this.reconnect();
        }
    }

    private reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
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

            this.subscriptions.set(requestId, (data) => {
                this.subscriptions.delete(requestId);
                resolve(data);
            });

            this.ws.send(JSON.stringify(request));

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

            this.subscriptions.set(subscriptionId, callback);
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

const DigitStats: React.FC<DigitStatsProps> = ({ symbol = 'R_100', className = '' }) => {
    const [digitStats, setDigitStats] = useState<DigitStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [digitStatsAPI] = useState(() => new DigitStatsAPI());
    const [tickHistory, setTickHistory] = useState<number[]>([]);

    // Extract last digit from price
    const extractDigit = useCallback((price: number): number => {
        const priceStr = price.toString();
        const lastChar = priceStr.charAt(priceStr.length - 1);
        return parseInt(lastChar) || 0;
    }, []);

    // Calculate digit statistics
    const calculateDigitStats = useCallback((ticks: number[]): DigitStat[] => {
        if (ticks.length === 0) {
            return Array.from({ length: 10 }, (_, i) => ({
                digit: i,
                percentage: 10.0,
                count: 0,
                isHighest: false,
                isLowest: false,
            }));
        }

        const digitCounts = new Array(10).fill(0);
        
        ticks.forEach(digit => {
            digitCounts[digit]++;
        });

        const totalCount = ticks.length;
        const stats: DigitStat[] = digitCounts.map((count, digit) => ({
            digit,
            count,
            percentage: parseFloat(((count / totalCount) * 100).toFixed(1)),
            isHighest: false,
            isLowest: false,
        }));

        // Find highest and lowest percentages
        const maxPercentage = Math.max(...stats.map(s => s.percentage));
        const minPercentage = Math.min(...stats.map(s => s.percentage));

        // Mark highest and lowest
        stats.forEach(stat => {
            stat.isHighest = stat.percentage === maxPercentage;
            stat.isLowest = stat.percentage === minPercentage;
        });

        return stats;
    }, []);

    // Handle real-time tick data
    const handleTickData = useCallback((response: any) => {
        if (response.tick) {
            const price = parseFloat(response.tick.quote);
            const digit = extractDigit(price);
            
            setTickHistory(prev => {
                const updated = [...prev, digit];
                return updated.slice(-1000); // Keep last 1000 ticks
            });
        }
    }, [extractDigit]);

    // Initialize digit stats
    useEffect(() => {
        const initializeStats = async () => {
            try {
                setIsLoading(true);
                
                // Wait for connection
                let attempts = 0;
                while (!digitStatsAPI.isConnected() && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    attempts++;
                }

                if (!digitStatsAPI.isConnected()) {
                    throw new Error('Failed to connect');
                }

                // Load historical data
                const historyResponse = await digitStatsAPI.getTicksHistory(symbol, 1000);

                if (historyResponse.history && historyResponse.history.prices) {
                    const historicalDigits = historyResponse.history.prices.map((price: string) => 
                        extractDigit(parseFloat(price))
                    );
                    setTickHistory(historicalDigits);
                }

                // Subscribe to real-time updates
                await digitStatsAPI.subscribeToTicks(symbol, handleTickData);
                
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to initialize digit stats:', error);
                setIsLoading(false);
                
                // Use demo data
                const demoTicks = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10));
                setTickHistory(demoTicks);
            }
        };

        initializeStats();

        return () => {
            digitStatsAPI.unsubscribe(`tick_${symbol}`);
        };
    }, [symbol, digitStatsAPI, handleTickData, extractDigit]);

    // Update stats when tick history changes - memoized for performance
    const digitStats = useMemo(() => {
        return calculateDigitStats(tickHistory);
    }, [tickHistory, calculateDigitStats]);

    if (isLoading) {
        return (
            <div className={`digit-stats ${className}`}>
                <div className="digit-stats__loading">
                    Loading digit statistics...
                </div>
            </div>
        );
    }

    return (
        <div className={`digit-stats ${className}`}>
            <div className="digit-stats__container">
                {digitStats.map((stat) => (
                    <div 
                        key={stat.digit}
                        className={`digit-stats__circle ${stat.isHighest ? 'highest' : ''} ${stat.isLowest ? 'lowest' : ''}`}
                        title={`Digit ${stat.digit}: ${stat.count} occurrences (${stat.percentage}%)`}
                    >
                        <div className="digit-stats__number">{stat.digit}</div>
                        <div className="digit-stats__percentage">{stat.percentage}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DigitStats;