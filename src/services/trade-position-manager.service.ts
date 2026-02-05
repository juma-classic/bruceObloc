/**
 * Trade Position Manager Service
 * Manages active trade positions and their visual indicators
 */

import { makeObservable, observable, action, computed } from 'mobx';
import { api_base } from '@/external/bot-skeleton';
import type { TradePosition } from '@/components/xdtrader/TradeIndicators';

export interface ContractUpdate {
    contract_id: string;
    current_spot: number;
    current_spot_time: number;
    profit: number;
    is_expired: boolean;
    is_sold: boolean;
    status: 'open' | 'won' | 'lost';
}

class TradePositionManagerService {
    // Observable state
    activePositions: Map<string, TradePosition> = new Map();
    contractSubscriptions: Map<string, any> = new Map();

    constructor() {
        makeObservable(this, {
            activePositions: observable,
            addPosition: action,
            updatePosition: action,
            removePosition: action,
            clearPositions: action,
            positions: computed,
        });
    }

    /**
     * Get all active positions as array
     */
    get positions(): TradePosition[] {
        return Array.from(this.activePositions.values());
    }

    /**
     * Add a new trade position
     */
    addPosition(trade: {
        contractId: string;
        transactionId: string;
        contractType: string;
        symbol: string;
        stake: number;
        payout: number;
        buyPrice: number;
        entryPrice: number;
        duration: number;
        durationType: 'ticks' | 'minutes';
        barrier?: number;
    }): void {
        const prediction = this.mapContractTypeToPrediction(trade.contractType);
        
        const position: TradePosition = {
            id: trade.transactionId,
            contractId: trade.contractId,
            contractType: trade.contractType,
            symbol: trade.symbol,
            entryPrice: trade.entryPrice,
            entryTime: Date.now(),
            stake: trade.stake,
            payout: trade.payout,
            prediction,
            barrier: trade.barrier,
            duration: trade.duration,
            durationType: trade.durationType,
            status: 'OPEN',
            currentPrice: trade.entryPrice,
            isWinning: false,
        };

        this.activePositions.set(trade.contractId, position);
        this.subscribeToContract(trade.contractId);
        
        console.log('📍 Added trade position:', position);
    }

    /**
     * Update position with current price and status
     */
    updatePosition(contractId: string, updates: Partial<TradePosition>): void {
        const position = this.activePositions.get(contractId);
        if (position) {
            const updatedPosition = { ...position, ...updates };
            this.activePositions.set(contractId, updatedPosition);
            
            // Trigger observable update
            this.activePositions = new Map(this.activePositions);
        }
    }

    /**
     * Remove a position (when contract expires or is sold)
     */
    removePosition(contractId: string): void {
        this.activePositions.delete(contractId);
        this.unsubscribeFromContract(contractId);
        console.log('🗑️ Removed trade position:', contractId);
    }

    /**
     * Clear all positions
     */
    clearPositions(): void {
        // Unsubscribe from all contracts
        this.contractSubscriptions.forEach((subscription, contractId) => {
            this.unsubscribeFromContract(contractId);
        });
        
        this.activePositions.clear();
        console.log('🧹 Cleared all trade positions');
    }

    /**
     * Subscribe to contract updates
     */
    private subscribeToContract(contractId: string): void {
        try {
            if (api_base.api) {
                const subscription = api_base.api.subscribe({
                    proposal_open_contract: 1,
                    contract_id: contractId,
                });

                const subscriptionId = subscription.subscribe(
                    (response: any) => {
                        if (response.proposal_open_contract) {
                            this.handleContractUpdate(contractId, response.proposal_open_contract);
                        }
                    },
                    (error: any) => {
                        console.error(`❌ Contract subscription error for ${contractId}:`, error);
                    }
                );

                this.contractSubscriptions.set(contractId, subscription);
                console.log(`📡 Subscribed to contract updates: ${contractId}`);
            }
        } catch (error) {
            console.error('Failed to subscribe to contract:', error);
        }
    }

    /**
     * Unsubscribe from contract updates
     */
    private unsubscribeFromContract(contractId: string): void {
        const subscription = this.contractSubscriptions.get(contractId);
        if (subscription) {
            subscription.unsubscribe();
            this.contractSubscriptions.delete(contractId);
            console.log(`🔇 Unsubscribed from contract: ${contractId}`);
        }
    }

    /**
     * Handle contract update from API
     */
    private handleContractUpdate(contractId: string, contractData: any): void {
        const position = this.activePositions.get(contractId);
        if (!position) return;

        const currentPrice = contractData.current_spot || position.currentPrice;
        const isWinning = this.calculateIsWinning(position, currentPrice);
        
        let status: 'OPEN' | 'WON' | 'LOST' = 'OPEN';
        
        if (contractData.is_expired) {
            status = contractData.profit > 0 ? 'WON' : 'LOST';
        } else if (contractData.is_sold) {
            status = contractData.profit > 0 ? 'WON' : 'LOST';
        }

        this.updatePosition(contractId, {
            currentPrice,
            isWinning,
            status,
        });

        // Remove position if contract is finished
        if (status !== 'OPEN') {
            setTimeout(() => {
                this.removePosition(contractId);
            }, 5000); // Keep flag visible for 5 seconds after completion
        }
    }

    /**
     * Calculate if position is currently winning
     */
    private calculateIsWinning(position: TradePosition, currentPrice: number): boolean {
        switch (position.prediction) {
            case 'RISE':
            case 'HIGHER':
                return currentPrice > position.entryPrice;
            case 'FALL':
            case 'LOWER':
                return currentPrice < position.entryPrice;
            case 'OVER':
                if (position.barrier !== undefined) {
                    const lastDigit = Math.floor((currentPrice * 10000) % 10);
                    return lastDigit > position.barrier;
                }
                return false;
            case 'UNDER':
                if (position.barrier !== undefined) {
                    const lastDigit = Math.floor((currentPrice * 10000) % 10);
                    return lastDigit < position.barrier;
                }
                return false;
            case 'EVEN':
                const evenDigit = Math.floor((currentPrice * 10000) % 10);
                return evenDigit % 2 === 0;
            case 'ODD':
                const oddDigit = Math.floor((currentPrice * 10000) % 10);
                return oddDigit % 2 === 1;
            case 'MATCHES':
                if (position.barrier !== undefined) {
                    const matchDigit = Math.floor((currentPrice * 10000) % 10);
                    return matchDigit === position.barrier;
                }
                return false;
            case 'DIFFERS':
                if (position.barrier !== undefined) {
                    const differDigit = Math.floor((currentPrice * 10000) % 10);
                    return differDigit !== position.barrier;
                }
                return false;
            default:
                return false;
        }
    }

    /**
     * Map contract type to prediction enum
     */
    private mapContractTypeToPrediction(contractType: string): TradePosition['prediction'] {
        switch (contractType) {
            case 'CALL':
                return 'RISE';
            case 'PUT':
                return 'FALL';
            case 'CALLE':
                return 'HIGHER';
            case 'PUTE':
                return 'LOWER';
            case 'DIGITOVER':
                return 'OVER';
            case 'DIGITUNDER':
                return 'UNDER';
            case 'DIGITEVEN':
                return 'EVEN';
            case 'DIGITODD':
                return 'ODD';
            case 'DIGITMATCHES':
                return 'MATCHES';
            case 'DIGITDIFFERS':
                return 'DIFFERS';
            default:
                return 'RISE';
        }
    }

    /**
     * Update all positions with current price (for real-time updates)
     */
    updateAllPositionsPrice(currentPrice: number): void {
        let hasUpdates = false;
        this.activePositions.forEach((position, contractId) => {
            if (position.status === 'OPEN') {
                const isWinning = this.calculateIsWinning(position, currentPrice);
                if (position.currentPrice !== currentPrice || position.isWinning !== isWinning) {
                    this.updatePosition(contractId, {
                        currentPrice,
                        isWinning,
                    });
                    hasUpdates = true;
                }
            }
        });
        
        // Trigger observable update if there were changes
        if (hasUpdates) {
            this.activePositions = new Map(this.activePositions);
        }
    }

    /**
     * Get position by contract ID
     */
    getPosition(contractId: string): TradePosition | undefined {
        return this.activePositions.get(contractId);
    }

    /**
     * Get positions by symbol
     */
    getPositionsBySymbol(symbol: string): TradePosition[] {
        return this.positions.filter(position => position.symbol === symbol);
    }

    /**
     * Cleanup service
     */
    destroy(): void {
        this.clearPositions();
        console.log('🧹 Trade Position Manager destroyed');
    }
}

// Export singleton instance
export const tradePositionManager = new TradePositionManagerService();