/**
 * Symbol Validation Utility
 * Prevents invalid symbols from being used in API calls
 */

export interface SymbolValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates if a symbol is valid for API calls
 */
export function validateSymbol(symbol: string | undefined | null): SymbolValidationResult {
    // Check for null, undefined, or empty string
    if (!symbol) {
        return {
            isValid: false,
            error: 'Symbol is null, undefined, or empty'
        };
    }

    // Check for invalid placeholder values
    const invalidSymbols = ['na', 'undefined', 'null', 'none', ''];
    if (invalidSymbols.includes(symbol.toLowerCase())) {
        return {
            isValid: false,
            error: `Symbol '${symbol}' is not a valid trading symbol`
        };
    }

    // Check minimum length
    if (symbol.length < 2) {
        return {
            isValid: false,
            error: 'Symbol must be at least 2 characters long'
        };
    }

    // Check for valid symbol format (basic validation)
    const symbolPattern = /^[A-Z0-9_]+$/i;
    if (!symbolPattern.test(symbol)) {
        return {
            isValid: false,
            error: 'Symbol contains invalid characters'
        };
    }

    return { isValid: true };
}

/**
 * Validates symbol and throws error if invalid
 */
export function validateSymbolOrThrow(symbol: string | undefined | null, context: string = 'API call'): void {
    const validation = validateSymbol(symbol);
    if (!validation.isValid) {
        const error = `Invalid symbol for ${context}: ${validation.error}`;
        console.error('❌', error);
        throw new Error(error);
    }
}

/**
 * Validates symbol and logs warning if invalid
 */
export function validateSymbolOrWarn(symbol: string | undefined | null, context: string = 'API call'): boolean {
    const validation = validateSymbol(symbol);
    if (!validation.isValid) {
        console.warn(`⚠️ Invalid symbol for ${context}: ${validation.error}`);
        return false;
    }
    return true;
}

/**
 * Gets a safe default symbol if the provided symbol is invalid
 */
export function getSafeSymbol(symbol: string | undefined | null, defaultSymbol: string = 'R_100'): string {
    const validation = validateSymbol(symbol);
    if (!validation.isValid) {
        console.warn(`⚠️ Using default symbol '${defaultSymbol}' instead of invalid symbol '${symbol}'`);
        return defaultSymbol;
    }
    return symbol!;
}

/**
 * Common valid symbols for reference
 */
export const VALID_SYMBOLS = {
    VOLATILITY: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'],
    VOLATILITY_1S: ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'],
    STEP_INDICES: ['WLDAUD', 'WLDEUR', 'WLDGBP', 'WLDUSD', 'WLDXAU'],
    BOOM_CRASH: ['BOOM1000', 'BOOM500', 'CRASH1000', 'CRASH500'],
    JUMP_INDICES: ['JD10', 'JD25', 'JD50', 'JD75', 'JD100'],
} as const;

/**
 * Check if symbol is a known valid symbol
 */
export function isKnownValidSymbol(symbol: string): boolean {
    const allValidSymbols = Object.values(VALID_SYMBOLS).flat();
    return allValidSymbols.includes(symbol as any);
}