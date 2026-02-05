/**
 * Tests for Fake Profit Mode Status utilities
 */

import {
    isFakeProfitModeActive,
    toggleFakeProfitMode,
    enableFakeProfitMode,
    disableFakeProfitMode,
    getFakeProfitModeStatus,
    isFakeProfitModeAcknowledged,
    setFakeProfitModeAcknowledged,
    clearFakeProfitModeFlags
} from '../fake-profit-mode-status';

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
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('Fake Profit Mode Status', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('Mode Detection', () => {
        it('should return false when mode is not active', () => {
            expect(isFakeProfitModeActive()).toBe(false);
        });

        it('should return true when mode is active', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'true');
            expect(isFakeProfitModeActive()).toBe(true);
        });

        it('should return false for any value other than "true"', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'false');
            expect(isFakeProfitModeActive()).toBe(false);
            
            localStorageMock.setItem('fake_profit_mode_flag', '1');
            expect(isFakeProfitModeActive()).toBe(false);
            
            localStorageMock.setItem('fake_profit_mode_flag', 'yes');
            expect(isFakeProfitModeActive()).toBe(false);
        });
    });

    describe('Mode Toggle', () => {
        it('should toggle from false to true', () => {
            const result = toggleFakeProfitMode();
            expect(result).toBe(true);
            expect(isFakeProfitModeActive()).toBe(true);
        });

        it('should toggle from true to false', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'true');
            const result = toggleFakeProfitMode();
            expect(result).toBe(false);
            expect(isFakeProfitModeActive()).toBe(false);
        });
    });

    describe('Mode Enable/Disable', () => {
        it('should enable fake profit mode', () => {
            enableFakeProfitMode();
            expect(isFakeProfitModeActive()).toBe(true);
        });

        it('should disable fake profit mode', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'true');
            disableFakeProfitMode();
            expect(isFakeProfitModeActive()).toBe(false);
        });
    });

    describe('Mode Status String', () => {
        it('should return "active" when mode is active', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'true');
            expect(getFakeProfitModeStatus()).toBe('active');
        });

        it('should return "inactive" when mode is not active', () => {
            expect(getFakeProfitModeStatus()).toBe('inactive');
        });
    });

    describe('Mode Acknowledgment', () => {
        it('should return false when not acknowledged', () => {
            expect(isFakeProfitModeAcknowledged()).toBe(false);
        });

        it('should return true when acknowledged', () => {
            localStorageMock.setItem('fake_profit_mode_acknowledged', 'true');
            expect(isFakeProfitModeAcknowledged()).toBe(true);
        });

        it('should set acknowledgment status', () => {
            setFakeProfitModeAcknowledged(true);
            expect(isFakeProfitModeAcknowledged()).toBe(true);
            
            setFakeProfitModeAcknowledged(false);
            expect(isFakeProfitModeAcknowledged()).toBe(false);
        });
    });

    describe('Flag Cleanup', () => {
        it('should clear all fake profit mode flags', () => {
            localStorageMock.setItem('fake_profit_mode_flag', 'true');
            localStorageMock.setItem('fake_profit_mode_acknowledged', 'true');
            
            clearFakeProfitModeFlags();
            
            expect(isFakeProfitModeActive()).toBe(false);
            expect(isFakeProfitModeAcknowledged()).toBe(false);
        });
    });

    describe('Consistency', () => {
        it('should maintain consistent state across multiple calls', () => {
            enableFakeProfitMode();
            
            expect(isFakeProfitModeActive()).toBe(true);
            expect(isFakeProfitModeActive()).toBe(true);
            expect(getFakeProfitModeStatus()).toBe('active');
            
            disableFakeProfitMode();
            
            expect(isFakeProfitModeActive()).toBe(false);
            expect(isFakeProfitModeActive()).toBe(false);
            expect(getFakeProfitModeStatus()).toBe('inactive');
        });
    });
});