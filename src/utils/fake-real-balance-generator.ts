/**
 * Fake Real Balance Generator
 * Generates and manages random balances for fake real mode
 */

export interface RandomBalanceConfig {
    min: number;
    max: number;
    decimals: number;
}

export class FakeRealBalanceGenerator {
    private static instance: FakeRealBalanceGenerator;
    
    // Default balance configurations for different currencies
    private readonly BALANCE_CONFIGS: Record<string, RandomBalanceConfig> = {
        USD: { min: 10000, max: 100000, decimals: 2 },
        USDT: { min: 0, max: 5000, decimals: 2 },
        LTC: { min: 0, max: 10, decimals: 8 },
        BTC: { min: 0, max: 1, decimals: 8 },
    };

    // Storage keys for persisting balances
    private readonly STORAGE_KEY_PREFIX = 'fake_real_balance_';
    private readonly GENERATION_TIME_KEY = 'fake_real_balance_generated_at';

    public static getInstance(): FakeRealBalanceGenerator {
        if (!FakeRealBalanceGenerator.instance) {
            FakeRealBalanceGenerator.instance = new FakeRealBalanceGenerator();
        }
        return FakeRealBalanceGenerator.instance;
    }

    /**
     * Generate a random balance within the specified range
     */
    private generateRandomBalance(config: RandomBalanceConfig): number {
        const range = config.max - config.min;
        const random = Math.random() * range + config.min;
        return Math.round(random * Math.pow(10, config.decimals)) / Math.pow(10, config.decimals);
    }

    /**
     * Format balance with appropriate decimal places
     */
    private formatBalance(balance: number, decimals: number): string {
        return balance.toFixed(decimals);
    }

    /**
     * Generate new random balances for all fake accounts
     */
    public generateNewBalances(): void {
        const timestamp = Date.now();
        
        // Generate balance for each currency
        Object.entries(this.BALANCE_CONFIGS).forEach(([currency, config]) => {
            const balance = this.generateRandomBalance(config);
            const formattedBalance = this.formatBalance(balance, config.decimals);
            
            // Store in localStorage
            localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${currency}`, formattedBalance);
            
            console.log(`🎲 Generated random balance for ${currency}: ${formattedBalance}`);
        });

        // Store generation timestamp
        localStorage.setItem(this.GENERATION_TIME_KEY, timestamp.toString());
        
        console.log('🎭 New fake real mode balances generated at:', new Date(timestamp).toLocaleString());
    }

    /**
     * Get stored balance for a currency, or generate new ones if none exist
     */
    public getBalance(currency: string): string {
        const storedBalance = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${currency}`);
        
        if (storedBalance === null) {
            // No stored balance, generate new ones
            this.generateNewBalances();
            return localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${currency}`) || '0.00';
        }
        
        return storedBalance;
    }

    /**
     * Get balance for the fake demo account (random balance over $10,000)
     */
    public getFakeDemoAccountBalance(): string {
        return this.getBalance('USD');
    }

    /**
     * Get balance for fake crypto accounts
     */
    public getFakeAccountBalance(currency: string): string {
        return this.getBalance(currency);
    }

    /**
     * Check if balances were generated (for debugging)
     */
    public getGenerationInfo(): { timestamp: number | null; balances: Record<string, string> } {
        const timestamp = localStorage.getItem(this.GENERATION_TIME_KEY);
        const balances: Record<string, string> = {};
        
        Object.keys(this.BALANCE_CONFIGS).forEach(currency => {
            balances[currency] = this.getBalance(currency);
        });
        
        return {
            timestamp: timestamp ? parseInt(timestamp) : null,
            balances
        };
    }

    /**
     * Clear all stored balances (useful for testing)
     */
    public clearStoredBalances(): void {
        Object.keys(this.BALANCE_CONFIGS).forEach(currency => {
            localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${currency}`);
        });
        localStorage.removeItem(this.GENERATION_TIME_KEY);
        
        console.log('🧹 Cleared all fake real mode balances');
    }

    /**
     * Check if fake real mode is active
     */
    public isFakeRealModeActive(): boolean {
        return localStorage.getItem('demo_icon_us_flag') === 'true';
    }
}

// Export singleton instance
export const fakeRealBalanceGenerator = FakeRealBalanceGenerator.getInstance();