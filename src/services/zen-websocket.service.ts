/**
 * Zen Production WebSocket Service
 * Production-ready WebSocket client for Deriv API with automatic reconnection,
 * re-authorization, and real-time trading data streams
 */

export interface ZenWebSocketConfig {
    appId: string;
    apiToken?: string;
    endpoint?: string;
}

export interface TickData {
    quote: number;
    epoch: number;
    symbol: string;
}

export interface ProposalData {
    id: string;
    payout: number;
    ask_price: number;
    symbol: string;
    contract_type: string;
}

export interface BalanceData {
    balance: number;
    currency: string;
}

export interface ContractData {
    contract_id: string;
    profit: number;
    profit_percentage: number;
    is_sold: boolean;
    status: string;
}

export interface SubscriptionRegistry {
    type: 'ticks' | 'balance' | 'proposal' | 'contract';
    payload: Record<string, unknown>;
    subscriptionId?: string;
}

export interface ZenWebSocketCallbacks {
    onTick?: (tick: TickData) => void;
    onProposal?: (proposal: ProposalData) => void;
    onBalance?: (balance: BalanceData) => void;
    onContract?: (contract: ContractData) => void;
    onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
    onAuthChange?: (isAuthorized: boolean) => void;
    onError?: (error: string) => void;
}

class ZenWebSocketService {
    private ws: WebSocket | null = null;
    private config: ZenWebSocketConfig | null = null;
    private callbacks: ZenWebSocketCallbacks = {};
    
    // Connection state
    private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
    private isAuthorized = false;
    
    // Subscription management
    private subscriptionsRegistry: SubscriptionRegistry[] = [];
    private requestId = 1;
    private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
    
    // Reconnection logic
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectTimeouts = [1000, 2000, 5000, 10000]; // Exponential backoff
    private reconnectTimer: NodeJS.Timeout | null = null;
    
    // Keep-alive logic
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private lastMessageTime = Date.now();
    private healthCheckTimer: NodeJS.Timeout | null = null;
    
    // Data state
    private tickData: TickData | null = null;
    private proposalData: ProposalData | null = null;
    private balanceData: BalanceData | null = null;
    private activeContracts = new Map<string, ContractData>();

    /**
     * Initialize the WebSocket service
     */
    initialize(config: ZenWebSocketConfig, callbacks: ZenWebSocketCallbacks = {}): void {
        this.config = config;
        this.callbacks = callbacks;
        
        console.log('🚀 ZenWebSocket: Initializing with config:', {
            appId: config.appId,
            hasToken: !!config.apiToken,
            endpoint: config.endpoint || 'wss://ws.derivws.com/websockets/v3'
        });
    }

    /**
     * Connect to Deriv WebSocket API
     */
    async connect(): Promise<void> {
        if (!this.config) {
            throw new Error('ZenWebSocket not initialized. Call initialize() first.');
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🔌 ZenWebSocket: Already connected');
            return;
        }

        // Validate token before connecting if provided
        if (this.config.apiToken && this.config.apiToken.length < 10) {
            throw new Error('Invalid API token format. Token appears to be too short.');
        }

        this.setConnectionStatus('connecting');
        
        const endpoint = this.config.endpoint || 'wss://ws.derivws.com/websockets/v3';
        const wsUrl = `${endpoint}?app_id=${this.config.appId}`;
        
        console.log(`🔌 ZenWebSocket: Connecting to ${wsUrl}`);

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = async () => {
                    console.log('✅ ZenWebSocket: Connected successfully');
                    this.setConnectionStatus('connected');
                    this.reconnectAttempts = 0;
                    this.lastMessageTime = Date.now();
                    
                    // Start keep-alive mechanisms
                    this.startHeartbeat();
                    this.startHealthCheck();
                    
                    // Authorize immediately if token is available
                    if (this.config?.apiToken) {
                        try {
                            await this.authorize();
                            console.log('✅ ZenWebSocket: Auto-authorization successful');
                        } catch (error) {
                            console.error('❌ ZenWebSocket: Auto-authorization failed:', error);
                            this.callbacks.onError?.(`Authorization failed: ${error}`);
                        }
                    }
                    
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ ZenWebSocket: Connection error:', error);
                    this.setConnectionStatus('error');
                    this.callbacks.onError?.('WebSocket connection error');
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 ZenWebSocket: Connection closed:', event.code, event.reason);
                    this.handleDisconnection();
                };

            } catch (error) {
                console.error('❌ ZenWebSocket: Failed to create connection:', error);
                this.setConnectionStatus('error');
                reject(error);
            }
        });
    }

    /**
     * Authorize with Deriv API
     */
    private async authorize(): Promise<void> {
        if (!this.config?.apiToken) {
            throw new Error('API token not provided');
        }

        const authRequest = {
            authorize: this.config.apiToken,
            req_id: this.requestId++
        };

        console.log('🔐 ZenWebSocket: Sending authorization request');
        
        try {
            const response = await this.sendRequest(authRequest);
            
            if (response.error) {
                const errorCode = response.error.code;
                const errorMessage = response.error.message;
                
                if (errorCode === 'InvalidToken') {
                    throw new Error('Invalid API token. Please check your Deriv API token and try again.');
                } else if (errorCode === 'AuthorizationRequired') {
                    throw new Error('Authorization required. Please provide a valid Deriv API token.');
                } else {
                    throw new Error(errorMessage || 'Authorization failed');
                }
            }

            this.isAuthorized = true;
            this.callbacks.onAuthChange?.(true);
            console.log('✅ ZenWebSocket: Authorization successful');
            
            // Re-subscribe to all previous subscriptions
            await this.resubscribeAll();
            
        } catch (error) {
            this.isAuthorized = false;
            this.callbacks.onAuthChange?.(false);
            throw error;
        }
    }

    /**
     * Subscribe to live ticks
     */
    async subscribeTicks(symbol: string): Promise<string> {
        const tickRequest = {
            ticks: symbol,
            subscribe: 1,
            req_id: this.requestId++
        };

        console.log(`📊 ZenWebSocket: Subscribing to ticks for ${symbol}`);
        
        const response = await this.sendRequest(tickRequest);
        
        if (response.error) {
            throw new Error(`Tick subscription failed: ${response.error.message}`);
        }

        const subscriptionId = response.subscription?.id;
        
        // Add to registry
        this.addToRegistry('ticks', tickRequest, subscriptionId);
        
        console.log(`✅ ZenWebSocket: Tick subscription successful for ${symbol}, ID: ${subscriptionId}`);
        return subscriptionId;
    }

    /**
     * Subscribe to live proposals (payout streaming)
     */
    async subscribeProposal(params: {
        symbol: string;
        contract_type: string;
        amount: number;
        basis: string;
        duration: number;
        duration_unit: string;
    }): Promise<string> {
        const proposalRequest = {
            proposal: 1,
            subscribe: 1,
            symbol: params.symbol,
            contract_type: params.contract_type,
            amount: params.amount,
            basis: params.basis,
            duration: params.duration,
            duration_unit: params.duration_unit,
            req_id: this.requestId++
        };

        console.log(`💰 ZenWebSocket: Subscribing to proposals for ${params.symbol} ${params.contract_type}`);
        
        const response = await this.sendRequest(proposalRequest);
        
        if (response.error) {
            throw new Error(`Proposal subscription failed: ${response.error.message}`);
        }

        const subscriptionId = response.subscription?.id;
        
        // Add to registry
        this.addToRegistry('proposal', proposalRequest, subscriptionId);
        
        console.log(`✅ ZenWebSocket: Proposal subscription successful, ID: ${subscriptionId}`);
        return subscriptionId;
    }

    /**
     * Subscribe to account balance
     */
    async subscribeBalance(): Promise<string> {
        const balanceRequest = {
            balance: 1,
            subscribe: 1,
            req_id: this.requestId++
        };

        console.log('💰 ZenWebSocket: Subscribing to balance updates');
        
        const response = await this.sendRequest(balanceRequest);
        
        if (response.error) {
            throw new Error(`Balance subscription failed: ${response.error.message}`);
        }

        const subscriptionId = response.subscription?.id;
        
        // Add to registry
        this.addToRegistry('balance', balanceRequest, subscriptionId);
        
        console.log(`✅ ZenWebSocket: Balance subscription successful, ID: ${subscriptionId}`);
        return subscriptionId;
    }

    /**
     * Subscribe to contract P&L updates
     */
    async subscribeContract(contractId: string): Promise<string> {
        const contractRequest = {
            proposal_open_contract: 1,
            contract_id: contractId,
            subscribe: 1,
            req_id: this.requestId++
        };

        console.log(`📈 ZenWebSocket: Subscribing to contract updates for ${contractId}`);
        
        const response = await this.sendRequest(contractRequest);
        
        if (response.error) {
            throw new Error(`Contract subscription failed: ${response.error.message}`);
        }

        const subscriptionId = response.subscription?.id;
        
        // Add to registry
        this.addToRegistry('contract', contractRequest, subscriptionId);
        
        console.log(`✅ ZenWebSocket: Contract subscription successful for ${contractId}, ID: ${subscriptionId}`);
        return subscriptionId;
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(data: string): void {
        this.lastMessageTime = Date.now();
        
        try {
            const message = JSON.parse(data);
            
            // Always check for errors first
            if (message.error) {
                console.error('❌ ZenWebSocket: API Error:', message.error);
                this.callbacks.onError?.(message.error.message || 'API Error');
                
                // Handle pending request rejection
                if (message.req_id && this.pendingRequests.has(message.req_id)) {
                    const { reject } = this.pendingRequests.get(message.req_id)!;
                    this.pendingRequests.delete(message.req_id);
                    reject(new Error(message.error.message || 'API Error'));
                }
                return;
            }

            // Handle pending request resolution
            if (message.req_id && this.pendingRequests.has(message.req_id)) {
                const { resolve } = this.pendingRequests.get(message.req_id)!;
                this.pendingRequests.delete(message.req_id);
                resolve(message);
            }

            // Route messages by type
            this.routeMessage(message);
            
        } catch (error) {
            console.error('❌ ZenWebSocket: Failed to parse message:', error, data);
            this.callbacks.onError?.('Failed to parse WebSocket message');
        }
    }

    /**
     * Route messages by msg_type (Critical)
     */
    private routeMessage(message: any): void {
        const msgType = message.msg_type;
        
        switch (msgType) {
            case 'tick':
                this.handleTick(message);
                break;
                
            case 'proposal':
                this.handleProposal(message);
                break;
                
            case 'balance':
                this.handleBalance(message);
                break;
                
            case 'proposal_open_contract':
                this.handleContract(message);
                break;
                
            case 'authorize':
                this.handleAuthorize(message);
                break;
                
            case 'ping':
                this.handlePing(message);
                break;
                
            default:
                console.log(`📡 ZenWebSocket: Unhandled message type: ${msgType}`, message);
        }
    }

    /**
     * Handle tick messages
     */
    private handleTick(message: any): void {
        if (message.tick) {
            const tickData: TickData = {
                quote: message.tick.quote,
                epoch: message.tick.epoch,
                symbol: message.tick.symbol
            };
            
            this.tickData = tickData;
            this.callbacks.onTick?.(tickData);
            
            console.log(`📊 ZenWebSocket: Tick received: ${tickData.symbol} = ${tickData.quote}`);
        }
    }

    /**
     * Handle proposal messages
     */
    private handleProposal(message: any): void {
        if (message.proposal) {
            const proposalData: ProposalData = {
                id: message.proposal.id,
                payout: message.proposal.payout,
                ask_price: message.proposal.ask_price,
                symbol: message.proposal.symbol,
                contract_type: message.proposal.contract_type
            };
            
            this.proposalData = proposalData;
            this.callbacks.onProposal?.(proposalData);
            
            console.log(`💰 ZenWebSocket: Proposal received: ${proposalData.symbol} payout=${proposalData.payout}`);
        }
    }

    /**
     * Handle balance messages
     */
    private handleBalance(message: any): void {
        if (message.balance) {
            const balanceData: BalanceData = {
                balance: message.balance.balance,
                currency: message.balance.currency
            };
            
            this.balanceData = balanceData;
            this.callbacks.onBalance?.(balanceData);
            
            console.log(`💰 ZenWebSocket: Balance updated: ${balanceData.balance} ${balanceData.currency}`);
        }
    }

    /**
     * Handle contract P&L messages
     */
    private handleContract(message: any): void {
        if (message.proposal_open_contract) {
            const contract = message.proposal_open_contract;
            const contractData: ContractData = {
                contract_id: contract.contract_id,
                profit: contract.profit,
                profit_percentage: contract.profit_percentage,
                is_sold: contract.is_sold,
                status: contract.status
            };
            
            this.activeContracts.set(contract.contract_id, contractData);
            this.callbacks.onContract?.(contractData);
            
            console.log(`📈 ZenWebSocket: Contract update: ${contractData.contract_id} profit=${contractData.profit}`);
        }
    }

    /**
     * Handle authorization messages
     */
    private handleAuthorize(): void {
        console.log('✅ ZenWebSocket: Authorization confirmed');
    }

    /**
     * Handle ping messages (Keep-alive)
     */
    private handlePing(message: any): void {
        // Respond to server pings automatically with correct format
        const pongResponse = {
            pong: 1
        };
        
        this.send(pongResponse);
        console.log('🏓 ZenWebSocket: Pong sent in response to ping');
    }

    /**
     * Send request and wait for response
     */
    private sendRequest(payload: Record<string, unknown>): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const reqId = payload.req_id as number;
            this.pendingRequests.set(reqId, { resolve, reject });
            
            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(reqId)) {
                    this.pendingRequests.delete(reqId);
                    reject(new Error('Request timeout'));
                }
            }, 30000); // 30 second timeout
            
            this.send(payload);
        });
    }

    /**
     * Send message to WebSocket
     */
    private send(payload: Record<string, unknown>): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ ZenWebSocket: Cannot send message - not connected');
            return;
        }

        const message = JSON.stringify(payload);
        this.ws.send(message);
        console.log('📤 ZenWebSocket: Message sent:', payload);
    }

    /**
     * Start heartbeat mechanism
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const pingMessage = {
                    ping: 1,
                    req_id: this.requestId++
                };
                
                this.send(pingMessage);
                console.log('💓 ZenWebSocket: Heartbeat ping sent');
            }
        }, 30000); // Send ping every 30 seconds
    }

    /**
     * Stop heartbeat mechanism
     */
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Start health check mechanism
     */
    private startHealthCheck(): void {
        this.stopHealthCheck();
        
        this.healthCheckTimer = setInterval(() => {
            const timeSinceLastMessage = Date.now() - this.lastMessageTime;
            
            // If no message received for > 10 seconds, consider unhealthy
            if (timeSinceLastMessage > 10000) {
                console.warn('⚠️ ZenWebSocket: No messages received for 10+ seconds, triggering reconnect');
                this.handleDisconnection();
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Stop health check mechanism
     */
    private stopHealthCheck(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    /**
     * Handle disconnection and trigger reconnect
     */
    private handleDisconnection(): void {
        this.setConnectionStatus('disconnected');
        this.isAuthorized = false;
        this.callbacks.onAuthChange?.(false);
        
        this.stopHeartbeat();
        this.stopHealthCheck();
        
        // Clear pending requests
        this.pendingRequests.forEach(({ reject }) => {
            reject(new Error('Connection lost'));
        });
        this.pendingRequests.clear();
        
        // Trigger automatic reconnection
        this.scheduleReconnect();
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ ZenWebSocket: Max reconnection attempts reached');
            this.setConnectionStatus('error');
            this.callbacks.onError?.('Max reconnection attempts reached');
            return;
        }

        const timeoutIndex = Math.min(this.reconnectAttempts, this.reconnectTimeouts.length - 1);
        const delay = this.reconnectTimeouts[timeoutIndex];
        
        console.log(`🔄 ZenWebSocket: Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectAttempts++;
            
            try {
                await this.connect();
                console.log('✅ ZenWebSocket: Reconnection successful');
            } catch (error) {
                console.error('❌ ZenWebSocket: Reconnection failed:', error);
                this.scheduleReconnect();
            }
        }, delay);
    }

    /**
     * Re-subscribe to all previous subscriptions
     */
    private async resubscribeAll(): Promise<void> {
        console.log(`🔄 ZenWebSocket: Re-subscribing to ${this.subscriptionsRegistry.length} subscriptions`);
        
        for (const subscription of this.subscriptionsRegistry) {
            try {
                // Update request ID for re-subscription
                const payload = { ...subscription.payload, req_id: this.requestId++ };
                
                const response = await this.sendRequest(payload);
                
                if (response.subscription?.id) {
                    subscription.subscriptionId = response.subscription.id;
                    console.log(`✅ ZenWebSocket: Re-subscribed to ${subscription.type}, new ID: ${subscription.subscriptionId}`);
                }
                
            } catch (error) {
                console.error(`❌ ZenWebSocket: Failed to re-subscribe to ${subscription.type}:`, error);
            }
        }
    }

    /**
     * Add subscription to registry
     */
    private addToRegistry(type: SubscriptionRegistry['type'], payload: Record<string, unknown>, subscriptionId?: string): void {
        // Remove existing subscription of same type
        this.subscriptionsRegistry = this.subscriptionsRegistry.filter(sub => sub.type !== type);
        
        // Add new subscription
        this.subscriptionsRegistry.push({
            type,
            payload,
            subscriptionId
        });
    }

    /**
     * Set connection status and notify callbacks
     */
    private setConnectionStatus(status: typeof this.connectionStatus): void {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.callbacks.onConnectionChange?.(status);
            console.log(`🔌 ZenWebSocket: Connection status changed to: ${status}`);
        }
    }

    /**
     * Unsubscribe from a specific subscription
     */
    async unsubscribe(subscriptionId: string): Promise<void> {
        const unsubscribeRequest = {
            forget: subscriptionId,
            req_id: this.requestId++
        };

        try {
            await this.sendRequest(unsubscribeRequest);
            
            // Remove from registry
            this.subscriptionsRegistry = this.subscriptionsRegistry.filter(
                sub => sub.subscriptionId !== subscriptionId
            );
            
            console.log(`✅ ZenWebSocket: Unsubscribed from ${subscriptionId}`);
        } catch (error) {
            console.error(`❌ ZenWebSocket: Failed to unsubscribe from ${subscriptionId}:`, error);
            throw error;
        }
    }

    /**
     * Clean shutdown - unsubscribe from all streams and close socket
     */
    async disconnect(): Promise<void> {
        console.log('🔌 ZenWebSocket: Starting clean shutdown');
        
        // Stop timers
        this.stopHeartbeat();
        this.stopHealthCheck();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Unsubscribe from all active subscriptions
        const unsubscribePromises = this.subscriptionsRegistry
            .filter(sub => sub.subscriptionId)
            .map(sub => this.unsubscribe(sub.subscriptionId!));
        
        try {
            await Promise.all(unsubscribePromises);
            console.log('✅ ZenWebSocket: All subscriptions unsubscribed');
        } catch (error) {
            console.error('❌ ZenWebSocket: Error during unsubscription:', error);
        }
        
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close(1000, 'Clean shutdown');
            this.ws = null;
        }
        
        // Reset state
        this.isAuthorized = false;
        this.subscriptionsRegistry = [];
        this.pendingRequests.clear();
        this.activeContracts.clear();
        this.setConnectionStatus('disconnected');
        
        console.log('✅ ZenWebSocket: Clean shutdown completed');
    }

    /**
     * Get current state
     */
    getState() {
        return {
            connectionStatus: this.connectionStatus,
            isAuthorized: this.isAuthorized,
            tickData: this.tickData,
            proposalData: this.proposalData,
            balanceData: this.balanceData,
            activeContracts: Array.from(this.activeContracts.values()),
            subscriptions: this.subscriptionsRegistry.length
        };
    }

    /**
     * Update API token
     */
    updateToken(apiToken: string): void {
        if (this.config) {
            this.config.apiToken = apiToken;
            console.log('🔐 ZenWebSocket: API token updated');
        }
    }

    /**
     * Check if service is ready for trading
     */
    isReady(): boolean {
        return this.connectionStatus === 'connected' && this.isAuthorized;
    }
}

// Export singleton instance
export const zenWebSocketService = new ZenWebSocketService();