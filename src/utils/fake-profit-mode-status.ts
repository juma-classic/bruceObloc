/**
 * Fake Profit Mode Status Utilities
 * Provides consistent mode detection across all application components
 */

/**
 * Check if fake profit mode is currently active
 * This is the primary method for mode detection across the application
 */
export const isFakeProfitModeActive = (): boolean => {
    return localStorage.getItem('fake_profit_mode_flag') === 'true';
};

/**
 * Toggle fake profit mode status
 * Used by admin activation system
 */
export const toggleFakeProfitMode = (): boolean => {
    const currentMode = isFakeProfitModeActive();
    const newMode = !currentMode;
    
    localStorage.setItem('fake_profit_mode_flag', newMode.toString());
    
    return newMode;
};

/**
 * Enable fake profit mode
 */
export const enableFakeProfitMode = (): void => {
    localStorage.setItem('fake_profit_mode_flag', 'true');
};

/**
 * Disable fake profit mode
 */
export const disableFakeProfitMode = (): void => {
    localStorage.setItem('fake_profit_mode_flag', 'false');
};

/**
 * Get mode status as string for debugging
 */
export const getFakeProfitModeStatus = (): string => {
    return isFakeProfitModeActive() ? 'active' : 'inactive';
};

/**
 * Check if mode was acknowledged by user (for UI purposes)
 */
export const isFakeProfitModeAcknowledged = (): boolean => {
    return localStorage.getItem('fake_profit_mode_acknowledged') === 'true';
};

/**
 * Set mode acknowledgment status
 */
export const setFakeProfitModeAcknowledged = (acknowledged: boolean): void => {
    localStorage.setItem('fake_profit_mode_acknowledged', acknowledged.toString());
};

/**
 * Clear all fake profit mode related flags
 */
export const clearFakeProfitModeFlags = (): void => {
    localStorage.removeItem('fake_profit_mode_flag');
    localStorage.removeItem('fake_profit_mode_acknowledged');
};