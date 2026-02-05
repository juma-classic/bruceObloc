import { makeObservable, observable, action, computed } from 'mobx';

export interface TickData {
    epoch: number;
    quote: number;
    symbol: string;
}

export interface TradeProposal {
    id: string;
    ask_price: number;
    payout: number;
    spot: number;
    display_value: string;
}

export interface Position {
    id: string;
    contract_type: string;
    symbol: string;
    buy_price: number;
    payout: number;
    current_spot: number;
    profit_loss: number;
    status: 'open' | 'won' | 'lost';
    entry_time: number;
    exit_time?: number;
}

export interface ChartData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export class TradingStore {
    // Observable properties
    activeSymbol = 'R_100';
    chartData: ChartData[] = [];
    tickData: TickData[] = [];
    currentPrice = 0;
    tradeProposal: TradeProposal | null = null;
    positions: Position[] = [];
    isLoading = false;
    connectionStatus = 'Disconnected';
    
    // Trade parameters
    tradeType = 'CALL';
    stake = 10;
    duration = 5;
    durationType = 'ticks';
    
    // Chart settings
    timeframe = '1m';
    chartType = 'candlestick';
    
    private webSocket: WebSocket | null = null;

    constructor() {
        makeObservable(this, {
            activeSymbol: observable,
            chartData: observable,
            tickData: observable,
            currentPrice: observable,
            tradeProposal: observable,
            positions: observable,
            isLoading: observable,
            connectionStatus: observable,
            tradeType: observable,
            stake: observable,
            duration: observable,
            durationType: observable,
            timeframe: observable,
            chartType: observable,
            
            setActiveSymbol: action,
            updateChartData: action,
            updateTickData: action,
            setTradeProposal: action,
            addPosition: action,
            updatePosition: action,
            setTradeType: action,
            setStake: action,
            setDuration: action,
            setTimeframe: action,
            setConnectionStatus: action,
            
            profitLoss: computed,
            totalPositions: computed,
        });
    }

    // Actions
    setActiveSymbol = (symbol: string) => {
        this.activeSymbol = symbol;
        this.subscribeToTicks(symbol);
        this.loadChartData(symbol);
    };

    updateChartData = (data: ChartData) => {
        this.chartData.push(data);
        // Keep only last 1000 candles for performance
        if (this.chartData.length > 1000) {
            this.chartData = this.chartData.slice(-1000);
        }
    };

    updateTickData = (tick: TickData) => {
        this.tickData.push(tick);
        this.currentPrice = tick.quote;
        
        // Keep only last 100 ticks
        if (this.tickData.length > 100) {
            this.tickData = this.tickData.slice(-100);
        }
        
        // Update current candle
        this.updateCurrentCandle(tick);
    };

    setTradeProposal = (proposal: TradeProposal | null) => {
        this.tradeProposal = proposal;
    };

    addPosition = (position: Position) => {
        this.positions.push(position);
    };

    updatePosition = (id: string, updates: Partial<Position>) => {
        const position = this.positions.find(p => p.id === id);
        if (position) {
            Object.assign(position, updates);
        }
    };

    setTradeType = (type: string) => {
        this.tradeType = type;
        this.requestProposal();
    };

    setStake = (amount: number) => {
        this.stake = amount;
        this.requestProposal();
    };

    setDuration = (duration: number) => {
        this.duration = duration;
        this.requestProposal();
    };

    setTimeframe = (timeframe: string) => {
        this.timeframe = timeframe;
        this.loadChartData(this.activeSymbol);
    };

    setConnectionStatus = (status: string) => {
        this.connectionStatus = status;
    };

    // Computed values
    get profitLoss(): number {
        return this.positions.reduce((total, position) => {
            return total + position.profit_loss;
        }, 0);
    }

    get totalPositions(): number {
        return this.positions.length;
    }

    // WebSocket methods
    setWebSocket = (ws: WebSocket) => {
        this.webSocket = ws;
        this.setupWebSocketHandlers();
    };

    private setupWebSocketHandlers = () => {
        if (!this.webSocket) return;

        this.webSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    };

    private handleWebSocketMessage = (message: any) => {
        const { msg_type, ...data } = message;

        switch (msg_type) {
            case 'tick':
                this.updateTickData({
                    epoch: data.tick.epoch,
                    quote: data.tick.quote,
                    symbol: data.tick.symbol,
                });
                break;
            case 'proposal':
                this.setTradeProposal({
                    id: data.proposal.id,
                    ask_price: data.proposal.ask_price,
                    payout: data.proposal.payout,
                    spot: data.proposal.spot,
                    display_value: data.proposal.display_value,
                });
                break;
            case 'buy':
                this.handleTradeResponse(data);
                break;
            case 'portfolio':
                this.updatePortfolio(data.portfolio);
                break;
            default:
                console.log('Unhandled message type:', msg_type);
        }
    };

    private subscribeToTicks = (symbol: string) => {
        if (!this.webSocket) return;

        // Validate symbol before subscribing
        if (!symbol || symbol === 'na' || symbol === 'undefined' || symbol === 'null') {
            console.error('❌ Invalid symbol for tick subscription:', symbol);
            return;
        }

        this.webSocket.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1,
        }));
    };

    private loadChartData = (symbol: string) => {
        if (!this.webSocket) return;

        // Validate symbol before making API call
        if (!symbol || symbol === 'na' || symbol === 'undefined' || symbol === 'null') {
            console.error('❌ Invalid symbol for chart data:', symbol);
            return;
        }

        const granularity = this.getGranularity(this.timeframe);
        
        this.webSocket.send(JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1000,
            end: 'latest',
            granularity: granularity,
            style: 'candles',
        }));
    };

    private getGranularity = (timeframe: string): number => {
        const granularityMap: { [key: string]: number } = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
        };
        return granularityMap[timeframe] || 60;
    };

    private updateCurrentCandle = (tick: TickData) => {
        if (this.chartData.length === 0) return;

        const lastCandle = this.chartData[this.chartData.length - 1];
        const tickTime = tick.epoch * 1000;
        const candleTime = lastCandle.time;
        const granularity = this.getGranularity(this.timeframe) * 1000;

        if (tickTime - candleTime < granularity) {
            // Update current candle
            lastCandle.close = tick.quote;
            lastCandle.high = Math.max(lastCandle.high, tick.quote);
            lastCandle.low = Math.min(lastCandle.low, tick.quote);
        } else {
            // Create new candle
            this.updateChartData({
                time: Math.floor(tickTime / granularity) * granularity,
                open: tick.quote,
                high: tick.quote,
                low: tick.quote,
                close: tick.quote,
            });
        }
    };

    private requestProposal = () => {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify({
            proposal: 1,
            amount: this.stake,
            basis: 'stake',
            contract_type: this.tradeType,
            currency: 'USD',
            duration: this.duration,
            duration_unit: this.durationType,
            symbol: this.activeSymbol,
        }));
    };

    private handleTradeResponse = (data: any) => {
        if (data.buy) {
            const position: Position = {
                id: data.buy.contract_id,
                contract_type: this.tradeType,
                symbol: this.activeSymbol,
                buy_price: data.buy.buy_price,
                payout: data.buy.payout,
                current_spot: this.currentPrice,
                profit_loss: 0,
                status: 'open',
                entry_time: Date.now(),
            };
            this.addPosition(position);
        }
    };

    private updatePortfolio = (portfolio: any) => {
        portfolio.contracts?.forEach((contract: any) => {
            this.updatePosition(contract.contract_id, {
                current_spot: contract.current_spot,
                profit_loss: contract.profit_loss,
                status: contract.is_sold ? (contract.profit_loss > 0 ? 'won' : 'lost') : 'open',
                exit_time: contract.is_sold ? contract.sell_time : undefined,
            });
        });
    };

    // Public methods for trading
    executeTrade = async () => {
        if (!this.webSocket || !this.tradeProposal) return;

        this.webSocket.send(JSON.stringify({
            buy: this.tradeProposal.id,
            price: this.stake,
        }));
    };

    sellPosition = (positionId: string) => {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify({
            sell: positionId,
        }));
    };

    // Demo mode initialization
    initializeDemoMode = () => {
        console.log('Initializing development mode...');
        this.setConnectionStatus('Under Development');
        
        // Set demo data
        this.currentPrice = 1234.567;
        this.setTradeProposal({
            id: 'demo_proposal',
            ask_price: 10,
            payout: 19.5,
            spot: this.currentPrice,
            display_value: '19.50',
        });

        // Add some demo chart data
        const now = Date.now();
        const demoChartData: ChartData[] = [];
        for (let i = 0; i < 100; i++) {
            const time = now - (100 - i) * 60000; // 1 minute intervals
            const basePrice = 1234 + Math.sin(i * 0.1) * 50;
            demoChartData.push({
                time,
                open: basePrice + Math.random() * 2 - 1,
                high: basePrice + Math.random() * 3,
                low: basePrice - Math.random() * 3,
                close: basePrice + Math.random() * 2 - 1,
            });
        }
        this.chartData = demoChartData;

        // Start demo tick simulation
        this.startDemoTicks();
    };

    private startDemoTicks = () => {
        setInterval(() => {
            const variation = (Math.random() - 0.5) * 2; // Random variation
            this.currentPrice += variation;
            
            const demoTick: TickData = {
                epoch: Math.floor(Date.now() / 1000),
                quote: this.currentPrice,
                symbol: this.activeSymbol,
            };
            
            this.updateTickData(demoTick);
        }, 1000); // Update every second
    };
}