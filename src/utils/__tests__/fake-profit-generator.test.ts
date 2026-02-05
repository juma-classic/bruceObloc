/**
 * Tests for Fake Profit Generator
 */

import { fakeProfitGenerator, FakeProfitGenerator } from '../fake-profit-generator';
import { ProfitType } from '@/types/fake-profit.types';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] || null
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('FakeProfitGenerator', () => {
    beforeEach(() => {
        localStorageMock.clear();
        // Reset singleton instance for testing
        (FakeProfitGenerator as any).instance = undefined;
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = FakeProfitGenerator.getInstance();
            const instance2 = FakeProfitGenerator.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should return the same instance as the exported singleton', () => {
            const instance = FakeProfitGenerator.getInstance();
            expect(instance).toBe(fakeProfitGenerator);
        });
    });

    describe('Mode Status', () => {
        it('should return false when fake profit mode is not active', () => {
            expect(fakeProfitGenerator.isFakeProfitModeActive()).toBe(false);
        });

        it('should return true when fake profit mode is active', () => {
            fakeProfitGenerator.setFakeProfitMode(true);
            expect(fakeProfitGenerator.isFakeProfitModeActive()).toBe(true);
        });

        it('should generate new data when enabling mode', () => {
            const spy = jest.spyOn(fakeProfitGenerator, 'generateNewProfitData');
            fakeProfitGenerator.setFakeProfitMode(true);
            expect(spy).toHaveBeenCalled();
        });

        it('should clear data when disabling mode', () => {
            const spy = jest.spyOn(fakeProfitGenerator, 'clearStoredProfitData');
            fakeProfitGenerator.setFakeProfitMode(false);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Profit Generation', () => {
        it('should generate profit values within expected ranges', () => {
            fakeProfitGenerator.generateNewProfitData();
            
            const dailyProfit = fakeProfitGenerator.getProfitValue(ProfitType.DAILY);
            const weeklyProfit = fakeProfitGenerator.getProfitValue(ProfitType.WEEKLY);
            const monthlyProfit = fakeProfitGenerator.getProfitValue(ProfitType.MONTHLY);
            const totalProfit = fakeProfitGenerator.getProfitValue(ProfitType.TOTAL);
            
            expect(dailyProfit).toBeGreaterThanOrEqual(35); // 50 - 30% volatility
            expect(dailyProfit).toBeLessThanOrEqual(650); // 500 + 30% volatility
            
            expect(weeklyProfit).toBeGreaterThanOrEqual(150);
            expect(weeklyProfit).toBeLessThanOrEqual(2500);
            
            expect(monthlyProfit).toBeGreaterThanOrEqual(800);
            expect(monthlyProfit).toBeLessThanOrEqual(9600);
            
            expect(totalProfit).toBeGreaterThanOrEqual(4250);
            expect(totalProfit).toBeLessThanOrEqual(57500);
        });

        it('should generate trade-specific profits on demand', () => {
            const profit1 = fakeProfitGenerator.getProfitValue(ProfitType.TRADE_SPECIFIC);
            const profit2 = fakeProfitGenerator.getProfitValue(ProfitType.TRADE_SPECIFIC);
            
            expect(profit1).toBeGreaterThanOrEqual(0.07); // 0.1 - 30% volatility
            expect(profit1).toBeLessThanOrEqual(1.235); // 0.95 + 30% volatility
            
            // Trade-specific profits should be different each time
            expect(profit1).not.toBe(profit2);
        });

        it('should format profits with currency symbol', () => {
            const formatted = fakeProfitGenerator.getFormattedProfit(123.45);
            expect(formatted).toBe('$123.45');
        });

        it('should format profits by type', () => {
            fakeProfitGenerator.generateNewProfitData();
            const formatted = fakeProfitGenerator.getFormattedProfitByType(ProfitType.DAILY);
            expect(formatted).toMatch(/^\$\d+\.\d{2}$/);
        });
    });

    describe('Data Persistence', () => {
        it('should persist generated data', () => {
            fakeProfitGenerator.generateNewProfitData();
            
            // Check that data is stored in localStorage
            expect(localStorageMock.getItem('fake_profit_data_daily')).not.toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_weekly')).not.toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_monthly')).not.toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_total')).not.toBeNull();
        });

        it('should retrieve stored data', () => {
            fakeProfitGenerator.generateNewProfitData();
            
            const dailyProfit = fakeProfitGenerator.getProfitValue(ProfitType.DAILY);
            const storedDaily = parseFloat(localStorageMock.getItem('fake_profit_data_daily') || '0');
            
            expect(dailyProfit).toBe(storedDaily);
        });

        it('should clear all stored data', () => {
            fakeProfitGenerator.generateNewProfitData();
            fakeProfitGenerator.clearStoredProfitData();
            
            expect(localStorageMock.getItem('fake_profit_data_daily')).toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_weekly')).toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_monthly')).toBeNull();
            expect(localStorageMock.getItem('fake_profit_data_total')).toBeNull();
        });
    });

    describe('Data Integrity', () => {
        it('should validate stored data integrity', () => {
            fakeProfitGenerator.generateNewProfitData();
            expect(fakeProfitGenerator.validateStoredData()).toBe(true);
        });

        it('should detect corrupted data', () => {
            localStorageMock.setItem('fake_profit_data_daily', 'invalid');
            expect(fakeProfitGenerator.validateStoredData()).toBe(false);
        });

        it('should regenerate data when integrity check fails', () => {
            localStorageMock.setItem('fake_profit_data_daily', 'invalid');
            const spy = jest.spyOn(fakeProfitGenerator, 'generateNewProfitData');
            
            fakeProfitGenerator.ensureDataIntegrity();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Generation Info', () => {
        it('should provide generation information', () => {
            fakeProfitGenerator.generateNewProfitData();
            const info = fakeProfitGenerator.getGenerationInfo();
            
            expect(info.timestamp).toBeGreaterThan(0);
            expect(info.sessionId).toMatch(/^fps_\d+_[a-z0-9]+$/);
            expect(info.isActive).toBe(false);
            expect(info.profits).toHaveProperty('daily');
            expect(info.profits).toHaveProperty('weekly');
            expect(info.profits).toHaveProperty('monthly');
            expect(info.profits).toHaveProperty('total');
        });
    });
});