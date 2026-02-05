/**
 * Fake Profit Generator
 * Generates and manages realistic fake profit data for demonstration purposes
 */

import { 
    ProfitConfig, 
    ProfitType, 
    FakeProfitData, 
    FakeProfitGeneratorInterface 
} from '@/types/fake-profit.types';
import { fakeProfitStorageManager } from './fake-profit-storage-manager';

export class FakeProfitGenerator implements FakeProfitGeneratorInterface {
    private static instance: FakeProfitGenerator;
    
    // Profit configurations for different time periods
    private readonly PROFIT_CONFIGS: Record<ProfitType, ProfitConfig> = {
        [ProfitType.DAILY]: { min: 50, max: 500, decimals: 2, volatility: 0.3 },
        [ProfitType.WEEKLY]: { min: 200, max: 2000, decimals: 2, volatility: 0.25 },
        [ProfitType.MONTHLY]: { min: 1000, max: 8000, decimals: 2, volatility: 0.2 },
        [ProfitType.TOTAL]: { min: 5000, max: 50000, decimals: 2, volatility: 0.15 },
        [ProfitType.TRADE_SPECIFIC]: { min: 0.1, max: 0.95, decimals: 4, volatility: 0.4 }
    };

    // Storage keys for persisting profit data
    private readonly STORAGE_KEY_PREFIX = 'fake_profit_data_';
    private readonly MODE_FLAG_KEY = 'fake_profit_mode_flag';
    private readonly GENERATION_TIME_KEY = 'fake_profit_generated_at';
    private readonly SESSION_ID_KEY = 'fake_profit_session_id';

    public static getInstance(): FakeProfitGenerator {
        if (!FakeProfitGenerator.instance) {
            FakeProfitGenerator.instance = new FakeProfitGenerator();
        }
        return FakeProfitGenerator.instance;
    }

    /**
     * Generate a random profit value within the specified range
     */
    private generateRandomProfit(config: ProfitConfig): number {
        const range = config.max - config.min;
        const baseValue = Math.random() * range + config.min;
        
        // Add volatility for more realistic values
        const volatilityFactor = 1 + (Math.random() - 0.5) * config.volatility;
        const finalValue = baseValue * volatilityFactor;
        
        return Math.round(finalValue * Math.pow(10, config.decimals)) / Math.pow(10, config.decimals);
    }

    /**
     * Format profit value with appropriate decimal places and currency symbol
     */
    private formatProfit(profit: number, decimals: number = 2): string {
        const formatted = profit.toFixed(decimals);
        return `$${formatted}`;
    }

    /**
     * Generate a unique session ID for consistency tracking
     */
    private generateSessionId(): string {
        return `fps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate new fake profit data for all time periods
     */
    public generateNewProfitData(): void {
        const timestamp = Date.now();
        const sessionId = this.generateSessionId();
        
        // Store generation metadata
        fakeProfitStorageManager.storeGenerationMetadata(timestamp, sessionId);
        
        // Generate profit for each time period
        Object.entries(this.PROFIT_CONFIGS).forEach(([type, config]) => {
            if (type !== ProfitType.TRADE_SPECIFIC) {
                const profit = this.generateRandomProfit(config);
                
                // Store using storage manager
                fakeProfitStorageManager.storeProfit(type as ProfitType, profit);
                
                console.log(`💰 Generated fake profit for ${type}: ${this.formatProfit(profit)}`);
            }
        });
        
        console.log('🎭 New fake profit data generated at:', new Date(timestamp).toLocaleString());
        console.log('📊 Session ID:', sessionId);
    }

    /**
     * Get stored profit value for a specific type, or generate new data if none exists
     */
    public getProfitValue(type: ProfitType): number {
        if (type === ProfitType.TRADE_SPECIFIC) {
            // Trade-specific profits are generated on-demand
            return this.generateRandomProfit(this.PROFIT_CONFIGS[type]);
        }

        const storedValue = fakeProfitStorageManager.retrieveProfit(type);
        
        if (storedValue === null) {
            // No stored value, generate new data
            this.generateNewProfitData();
            return fakeProfitStorageManager.retrieveProfit(type) || 0;
        }
        
        return storedValue;
    }

    /**
     * Get formatted profit value with currency symbol
     */
    public getFormattedProfit(value: number, decimals: number = 2): string {
        return this.formatProfit(value, decimals);
    }

    /**
     * Get formatted profit for a specific type
     */
    public getFormattedProfitByType(type: ProfitType): string {
        const value = this.getProfitValue(type);
        const config = this.PROFIT_CONFIGS[type];
        return this.formatProfit(value, config.decimals);
    }

    /**
     * Clear all stored fake profit data
     */
    public clearStoredProfitData(): void {
        fakeProfitStorageManager.clearAllProfitData();
        console.log('🧹 Cleared all fake profit data');
    }

    /**
     * Check if fake profit mode is active
     */
    public isFakeProfitModeActive(): boolean {
        return localStorage.getItem(this.MODE_FLAG_KEY) === 'true';
    }

    /**
     * Set fake profit mode status
     */
    public setFakeProfitMode(active: boolean): void {
        localStorage.setItem(this.MODE_FLAG_KEY, active.toString());
        
        if (active) {
            // Generate new profit data when enabling mode
            this.generateNewProfitData();
        } else {
            // Clear profit data when disabling mode
            this.clearStoredProfitData();
        }
        
        console.log(`🎭 Fake profit mode ${active ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get generation info for debugging
     */
    public getGenerationInfo(): { 
        timestamp: number | null; 
        sessionId: string | null;
        profits: Record<string, number>;
        isActive: boolean;
        storageInfo: any;
    } {
        const storageInfo = fakeProfitStorageManager.getStorageInfo();
        const profits: Record<string, number> = {};
        
        Object.keys(this.PROFIT_CONFIGS).forEach(type => {
            if (type !== ProfitType.TRADE_SPECIFIC) {
                profits[type] = this.getProfitValue(type as ProfitType);
            }
        });
        
        return {
            timestamp: storageInfo.lastGenerated,
            sessionId: storageInfo.sessionId,
            profits,
            isActive: this.isFakeProfitModeActive(),
            storageInfo
        };
    }

    /**
     * Validate stored data integrity
     */
    public validateStoredData(): boolean {
        return fakeProfitStorageManager.validateDataIntegrity();
    }

    /**
     * Auto-generate data if missing or corrupted
     */
    public ensureDataIntegrity(): void {
        if (!this.validateStoredData()) {
            console.log('⚠️ Fake profit data integrity check failed, regenerating...');
            this.generateNewProfitData();
        }
    }
}

// Export singleton instance
export const fakeProfitGenerator = FakeProfitGenerator.getInstance();