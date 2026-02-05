/**
 * Manual Trading Service
 * Handles manual trade execution for the xDtrader manual trading panel
 */

import { api_base } from '@/external/bot-skeleton';
import { validateSymbolOrThrow } from '@/utils/symbol-validator';

export interface TradeRequest {
    symbol: string;
    contractType: string;
    stake: number;
    duration: number;
    durationType: 'ticks' | 'minutes';
    barrier?: number;
    allowEquals?: boolean;
}

export interface TradeResult {
    success: boolean;
    contractId?: string;
    transactionId?: string;
    buyPrice?: number;
    payout?: number;
    error?: string;
}

export interface ProposalRequest {
    symbol: string;
    contractType: string;
    stake: number;
    duration: number;
    durationType: 'ticks' | 'minutes';
    barrier?: number;
}

export interface ProposalResult {
    id: string;
    payout: number;
    askPrice: number;
    spot: number;
    displayValue: string;
}

class ManualTradingService {
    private proposalCache: Map<string, ProposalResult> = new Map();
    private cacheTimeout = 5000; // 5 seconds

    /**
     * Get proposal for a trade
     */
    async getProposal(request: ProposalRequest): Promise<ProposalResult | null> {
        try {
            validateSymbolOrThrow(request.symbol, 'proposal request');

            const cacheKey = this.generateCacheKey(request);
            const cached = this.proposalCache.get(cacheKey);
            
            if (cached) {
                return cached;
            }

            const proposalRequest: any = {
                proposal: 1,
                amount: request.stake,
                basis: 'stake',
                contract_type: request.contractType,
                currency: 'USD',
                symbol: request.symbol,
                duration: request.duration,
                duration_unit: request.durationType === 'ticks' ? 't' : 'm',
            };

            // Add barrier for digit contracts
            if (request.barrier !== undefined) {
                proposalRequest.barrier = request.barrier;
            }

            const response = await api_base.api?.send(proposalRequest);

            if (response?.proposal) {
                const proposal: ProposalResult = {
                    id: response.proposal.id,
                    payout: response.proposal.payout,
                    askPrice: response.proposal.ask_price,
                    spot: response.proposal.spot,
                    displayValue: response.proposal.display_value,
                };

                // Cache the proposal
                this.proposalCache.set(cacheKey, proposal);
                setTimeout(() => {
                    this.proposalCache.delete(cacheKey);
                }, this.cacheTimeout);

                return proposal;
            }

            return null;
        } catch (error) {
            console.error('Failed to get proposal:', error);
            return null;
        }
    }

    /**
     * Execute a manual trade
     */
    async executeTrade(request: TradeRequest): Promise<TradeResult> {
        try {
            validateSymbolOrThrow(request.symbol, 'trade execution');

            // First get the proposal
            const proposal = await this.getProposal({
                symbol: request.symbol,
                contractType: request.contractType,
                stake: request.stake,
                duration: request.duration,
                durationType: request.durationType,
                barrier: request.barrier,
            });

            if (!proposal) {
                return {
                    success: false,
                    error: 'Failed to get proposal for trade',
                };
            }

            // Execute the buy
            const buyRequest = {
                buy: proposal.id,
                price: request.stake,
            };

            const response = await api_base.api?.send(buyRequest);

            if (response?.buy) {
                console.log('✅ Manual trade executed successfully:', {
                    contractId: response.buy.contract_id,
                    transactionId: response.buy.transaction_id,
                    buyPrice: response.buy.buy_price,
                    payout: proposal.payout,
                });

                return {
                    success: true,
                    contractId: response.buy.contract_id,
                    transactionId: response.buy.transaction_id,
                    buyPrice: response.buy.buy_price,
                    payout: proposal.payout,
                };
            } else {
                return {
                    success: false,
                    error: response?.error?.message || 'Trade execution failed',
                };
            }
        } catch (error) {
            console.error('Manual trade execution failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get multiple proposals at once
     */
    async getMultipleProposals(requests: ProposalRequest[]): Promise<(ProposalResult | null)[]> {
        const promises = requests.map(request => this.getProposal(request));
        return Promise.all(promises);
    }

    /**
     * Subscribe to live price updates
     */
    async subscribeToPrice(symbol: string, callback: (price: number) => void): Promise<() => void> {
        validateSymbolOrThrow(symbol, 'price subscription');

        try {
            const subscription = api_base.api?.subscribe({
                ticks: symbol,
            });

            const subscriptionId = subscription?.subscribe((response: any) => {
                if (response.tick) {
                    callback(response.tick.quote);
                }
            });

            // Return unsubscribe function
            return () => {
                if (subscription) {
                    subscription.unsubscribe();
                }
            };
        } catch (error) {
            console.error('Failed to subscribe to price:', error);
            return () => {}; // Return empty unsubscribe function
        }
    }

    /**
     * Generate cache key for proposals
     */
    private generateCacheKey(request: ProposalRequest): string {
        return `${request.symbol}_${request.contractType}_${request.stake}_${request.duration}_${request.durationType}_${request.barrier || ''}`;
    }

    /**
     * Clear proposal cache
     */
    clearCache(): void {
        this.proposalCache.clear();
    }

    /**
     * Get available contract types for a symbol
     */
    getAvailableContractTypes(symbol: string): string[] {
        // This would typically come from the contracts_for API
        // For now, return common contract types
        return [
            'CALL', 'PUT', // Rise/Fall
            'CALLE', 'PUTE', // Higher/Lower
            'DIGITOVER', 'DIGITUNDER', // Over/Under
            'DIGITEVEN', 'DIGITODD', // Even/Odd
            'DIGITMATCHES', 'DIGITDIFFERS', // Matches/Differs
        ];
    }

    /**
     * Validate trade parameters
     */
    validateTradeRequest(request: TradeRequest): { isValid: boolean; error?: string } {
        if (!request.symbol) {
            return { isValid: false, error: 'Symbol is required' };
        }

        if (!request.contractType) {
            return { isValid: false, error: 'Contract type is required' };
        }

        if (request.stake < 0.35) {
            return { isValid: false, error: 'Minimum stake is $0.35' };
        }

        if (request.duration < 1) {
            return { isValid: false, error: 'Duration must be at least 1' };
        }

        if (request.durationType === 'ticks' && request.duration > 10) {
            return { isValid: false, error: 'Maximum duration for ticks is 10' };
        }

        if (request.durationType === 'minutes' && request.duration > 1440) {
            return { isValid: false, error: 'Maximum duration for minutes is 1440' };
        }

        return { isValid: true };
    }
}

// Export singleton instance
export const manualTradingService = new ManualTradingService();