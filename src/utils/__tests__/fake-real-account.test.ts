/**
 * Tests for Fake Real Account Utilities
 */

import { transformTransactionId, generateStaticTransactionId, isFakeRealMode } from '../fake-real-account';

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

describe('Fake Real Account Utilities', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('generateStaticTransactionId', () => {
        it('should generate consistent IDs for the same input', () => {
            const originalId = '6123456789';
            const id1 = generateStaticTransactionId(originalId);
            const id2 = generateStaticTransactionId(originalId);
            
            expect(id1).toBe(id2);
            expect(id1).toMatch(/^1457604\d{4}1$/);
        });

        it('should generate different IDs for different inputs', () => {
            const id1 = generateStaticTransactionId('6123456789');
            const id2 = generateStaticTransactionId('6987654321');
            
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^1457604\d{4}1$/);
            expect(id2).toMatch(/^1457604\d{4}1$/);
        });

        it('should generate IDs in the correct range', () => {
            const originalId = '6123456789';
            const transformedId = generateStaticTransactionId(originalId);
            
            // Extract the middle 4 digits (positions 7-10)
            const middleDigits = parseInt(transformedId.substring(7, 11));
            
            expect(middleDigits).toBeGreaterThanOrEqual(1796);
            expect(middleDigits).toBeLessThanOrEqual(2596);
        });
    });

    describe('transformTransactionId', () => {
        it('should return original ID when fake real mode is disabled', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'false');
            
            const realId = '144100312345';
            const demoId = '6123456789';
            
            expect(transformTransactionId(realId)).toBe(realId);
            expect(transformTransactionId(demoId)).toBe(demoId);
        });

        it('should transform demo IDs consistently in fake real mode', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'true');
            
            const demoId = '6123456789';
            const transformed1 = transformTransactionId(demoId);
            const transformed2 = transformTransactionId(demoId);
            
            expect(transformed1).toBe(transformed2);
            expect(transformed1).toMatch(/^1457604\d{4}1$/);
            expect(transformed1).not.toBe(demoId);
        });

        it('should not transform real account IDs in fake real mode', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'true');
            
            const realId = '144100312345';
            const transformed = transformTransactionId(realId);
            
            expect(transformed).toBe(realId);
        });

        it('should handle numeric inputs', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'true');
            
            const demoId = 6123456789;
            const transformed = transformTransactionId(demoId);
            
            expect(transformed).toMatch(/^1457604\d{4}1$/);
        });
    });

    describe('isFakeRealMode', () => {
        it('should return true when demo_icon_us_flag is true', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'true');
            expect(isFakeRealMode()).toBe(true);
        });

        it('should return false when demo_icon_us_flag is false', () => {
            localStorageMock.setItem('demo_icon_us_flag', 'false');
            expect(isFakeRealMode()).toBe(false);
        });

        it('should return false when demo_icon_us_flag is not set', () => {
            expect(isFakeRealMode()).toBe(false);
        });
    });
});