/**
 * Tests for Fake Real Balance Generator
 */

import { fakeRealBalanceGenerator } from '../fake-real-balance-generator';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('FakeRealBalanceGenerator', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('generateNewBalances', () => {
        it('should generate balances for all currencies', () => {
            fakeRealBalanceGenerator.generateNewBalances();

            const info = fakeRealBalanceGenerator.getGenerationInfo();
            
            expect(info.timestamp).toBeTruthy();
            expect(info.balances.USD).toBeTruthy();
            expect(info.balances.USDT).toBeTruthy();
            expect(info.balances.LTC).toBeTruthy();
            expect(info.balances.BTC).toBeTruthy();
        });

        it('should generate USD balance above 10000', () => {
            fakeRealBalanceGenerator.generateNewBalances();
            
            const usdBalance = parseFloat(fakeRealBalanceGenerator.getBalance('USD'));
            expect(usdBalance).toBeGreaterThanOrEqual(10000);
            expect(usdBalance).toBeLessThanOrEqual(100000);
        });

        it('should format balances with correct decimal places', () => {
            fakeRealBalanceGenerator.generateNewBalances();
            
            const usdBalance = fakeRealBalanceGenerator.getBalance('USD');
            const ltcBalance = fakeRealBalanceGenerator.getBalance('LTC');
            
            // USD should have 2 decimal places
            expect(usdBalance).toMatch(/^\d+\.\d{2}$/);
            
            // LTC should have 8 decimal places
            expect(ltcBalance).toMatch(/^\d+\.\d{8}$/);
        });
    });

    describe('getBalance', () => {
        it('should return stored balance if exists', () => {
            localStorageMock.setItem('fake_real_balance_USD', '25000.50');
            
            const balance = fakeRealBalanceGenerator.getBalance('USD');
            expect(balance).toBe('25000.50');
        });

        it('should generate new balances if none exist', () => {
            const balance = fakeRealBalanceGenerator.getBalance('USD');
            
            expect(balance).toBeTruthy();
            expect(parseFloat(balance)).toBeGreaterThanOrEqual(10000);
        });
    });

    describe('clearStoredBalances', () => {
        it('should clear all stored balances', () => {
            fakeRealBalanceGenerator.generateNewBalances();
            
            // Verify balances exist
            expect(localStorageMock.getItem('fake_real_balance_USD')).toBeTruthy();
            
            fakeRealBalanceGenerator.clearStoredBalances();
            
            // Verify balances are cleared
            expect(localStorageMock.getItem('fake_real_balance_USD')).toBeNull();
            expect(localStorageMock.getItem('fake_real_balance_USDT')).toBeNull();
            expect(localStorageMock.getItem('fake_real_balance_LTC')).toBeNull();
            expect(localStorageMock.getItem('fake_real_balance_BTC')).toBeNull();
        });
    });

    describe('isFakeRealModeActive', () => {
        it('should return true when demo_icon_us_flag is true', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'true');
            
            expect(fakeRealBalanceGenerator.isFakeRealModeActive()).toBe(true);
        });

        it('should return false when demo_icon_us_flag is false', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'false');
            
            expect(fakeRealBalanceGenerator.isFakeRealModeActive()).toBe(false);
        });

        it('should return false when demo_icon_us_flag is not set', () => {
            expect(fakeRealBalanceGenerator.isFakeRealModeActive()).toBe(false);
        });
    });
});