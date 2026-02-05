/**
 * Fake Profit Storage Manager
 * Handles persistence and retrieval of fake profit data in localStorage
 */

import { ProfitType, StorageManagerInterface, StorageInfo } from '@/types/fake-profit.types';

export class FakeProfitStorageManager implements StorageManagerInterface {
    private static instance: FakeProfitStorageManager;
    
    private readonly STORAGE_KEY_PREFIX = 'fake_profit_data_';
    private readonly MODE_FLAG_KEY = 'fake_profit_mode_flag';
    private readonly GENERATION_TIME_KEY = 'fake_profit_generated_at';
    private readonly SESSION_ID_KEY = 'fake_profit_session_id';

    public static getInstance(): FakeProfitStorageManager {
        if (!FakeProfitStorageManager.instance) {
            FakeProfitStorageManager.instance = new FakeProfitStorageManager();
        }
        return FakeProfitStorageManager.instance;
    }

    /**
     * Store a profit value for a specific type
     */
    public storeProfit(type: ProfitType, value: number): void {
        try {
            const key = `${this.STORAGE_KEY_PREFIX}${type}`;
            localStorage.setItem(key, value.toString());
        } catch (error) {
            console.error(`Failed to store profit data for ${type}:`, error);
            this.handleStorageError(error);
        }
    }

    /**
     * Retrieve a profit value for a specific type
     */
    public retrieveProfit(type: ProfitType): number | null {
        try {
            const key = `${this.STORAGE_KEY_PREFIX}${type}`;
            const stored = localStorage.getItem(key);
            
            if (stored === null) {
                return null;
            }
            
            const parsed = parseFloat(stored);
            return isNaN(parsed) ? null : parsed;
        } catch (error) {
            console.error(`Failed to retrieve profit data for ${type}:`, error);
            return null;
        }
    }

    /**
     * Clear all fake profit data from storage
     */
    public clearAllProfitData(): void {
        try {
            // Clear all profit data keys
            Object.values(ProfitType).forEach(type => {
                if (type !== ProfitType.TRADE_SPECIFIC) {
                    const key = `${this.STORAGE_KEY_PREFIX}${type}`;
                    localStorage.removeItem(key);
                }
            });
            
            // Clear metadata
            localStorage.removeItem(this.GENERATION_TIME_KEY);
            localStorage.removeItem(this.SESSION_ID_KEY);
            
            console.log('🧹 Cleared all fake profit data from storage');
        } catch (error) {
            console.error('Failed to clear profit data:', error);
        }
    }

    /**
     * Validate data integrity of stored profit values
     */
    public validateDataIntegrity(): boolean {
        try {
            const requiredTypes = [
                ProfitType.DAILY,
                ProfitType.WEEKLY,
                ProfitType.MONTHLY,
                ProfitType.TOTAL
            ];
            
            for (const type of requiredTypes) {
                const value = this.retrieveProfit(type);
                if (value === null || isNaN(value)) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Data integrity validation failed:', error);
            return false;
        }
    }

    /**
     * Get storage information for debugging
     */
    public getStorageInfo(): StorageInfo {
        try {
            let totalKeys = 0;
            let usedSpace = 0;
            
            // Count fake profit related keys and estimate space usage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fake_profit_')) {
                    totalKeys++;
                    const value = localStorage.getItem(key);
                    if (value) {
                        usedSpace += key.length + value.length;
                    }
                }
            }
            
            const lastGenerated = localStorage.getItem(this.GENERATION_TIME_KEY);
            const sessionId = localStorage.getItem(this.SESSION_ID_KEY);
            
            return {
                totalKeys,
                usedSpace,
                lastGenerated: lastGenerated ? parseInt(lastGenerated) : null,
                sessionId
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                totalKeys: 0,
                usedSpace: 0,
                lastGenerated: null,
                sessionId: null
            };
        }
    }

    /**
     * Store generation metadata
     */
    public storeGenerationMetadata(timestamp: number, sessionId: string): void {
        try {
            localStorage.setItem(this.GENERATION_TIME_KEY, timestamp.toString());
            localStorage.setItem(this.SESSION_ID_KEY, sessionId);
        } catch (error) {
            console.error('Failed to store generation metadata:', error);
            this.handleStorageError(error);
        }
    }

    /**
     * Get generation timestamp
     */
    public getGenerationTimestamp(): number | null {
        try {
            const stored = localStorage.getItem(this.GENERATION_TIME_KEY);
            return stored ? parseInt(stored) : null;
        } catch (error) {
            console.error('Failed to get generation timestamp:', error);
            return null;
        }
    }

    /**
     * Get session ID
     */
    public getSessionId(): string | null {
        try {
            return localStorage.getItem(this.SESSION_ID_KEY);
        } catch (error) {
            console.error('Failed to get session ID:', error);
            return null;
        }
    }

    /**
     * Check if localStorage is available
     */
    public isStorageAvailable(): boolean {
        try {
            const testKey = 'fake_profit_storage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Handle storage errors with fallback strategies
     */
    private handleStorageError(error: any): void {
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, attempting cleanup...');
            this.performEmergencyCleanup();
        } else {
            console.error('Storage operation failed:', error);
        }
    }

    /**
     * Emergency cleanup when storage quota is exceeded
     */
    private performEmergencyCleanup(): void {
        try {
            // Clear old fake profit data to free up space
            this.clearAllProfitData();
            console.log('Emergency cleanup completed');
        } catch (error) {
            console.error('Emergency cleanup failed:', error);
        }
    }

    /**
     * Export all fake profit data for backup/debugging
     */
    public exportProfitData(): Record<string, any> {
        const data: Record<string, any> = {};
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fake_profit_')) {
                    data[key] = localStorage.getItem(key);
                }
            }
        } catch (error) {
            console.error('Failed to export profit data:', error);
        }
        
        return data;
    }

    /**
     * Import fake profit data from backup
     */
    public importProfitData(data: Record<string, any>): boolean {
        try {
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith('fake_profit_') && typeof value === 'string') {
                    localStorage.setItem(key, value);
                }
            });
            
            console.log('Profit data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import profit data:', error);
            return false;
        }
    }
}

// Export singleton instance
export const fakeProfitStorageManager = FakeProfitStorageManager.getInstance();