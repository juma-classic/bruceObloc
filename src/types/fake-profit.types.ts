/**
 * TypeScript interfaces and types for fake profit mode system
 */

export interface ProfitConfig {
    min: number;
    max: number;
    decimals: number;
    volatility: number;
}

export enum ProfitType {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    TOTAL = 'total',
    TRADE_SPECIFIC = 'trade_specific'
}

export interface FakeProfitData {
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    generatedAt: number;
    sessionId: string;
}

export interface TransformContext {
    component: string;
    tradeId?: string;
    stake?: number;
    timeframe?: string;
    originalValue?: number;
}

export interface ProfitTransformation {
    originalValue: number;
    transformedValue: number;
    context: TransformContext;
    timestamp: number;
}

export interface ProfitDisplayConfig {
    showPositiveOnly: boolean;
    enhancementMultiplier: number;
    consistencyMode: boolean;
    formatWithCurrency: boolean;
}

export interface ProfitDisplayComponent {
    componentName: string;
    profitSelectors: string[];
    transformationRules: TransformationRule[];
    updateFrequency: number;
}

export interface TransformationRule {
    condition: (value: number) => boolean;
    transform: (value: number) => number;
    cssClass: string;
}

export interface FakeProfitGeneratorInterface {
    generateNewProfitData(): void;
    getProfitValue(type: ProfitType): number;
    getFormattedProfit(value: number, decimals?: number): string;
    getFormattedProfitByType(type: ProfitType): string;
    clearStoredProfitData(): void;
    isFakeProfitModeActive(): boolean;
    setFakeProfitMode(active: boolean): void;
    validateStoredData(): boolean;
    ensureDataIntegrity(): void;
}

export interface TransformEngineInterface {
    transformProfitValue(originalValue: number, context?: TransformContext): number;
    transformProfitDisplay(element: HTMLElement): void;
    getProfitClass(value: number): string;
    formatProfitCurrency(amount: number): string;
}

export interface StorageManagerInterface {
    storeProfit(type: ProfitType, value: number): void;
    retrieveProfit(type: ProfitType): number | null;
    clearAllProfitData(): void;
    validateDataIntegrity(): boolean;
    getStorageInfo(): StorageInfo;
}

export interface StorageInfo {
    totalKeys: number;
    usedSpace: number;
    lastGenerated: number | null;
    sessionId: string | null;
}

// Admin account configuration
export interface AdminConfig {
    accountIds: string[];
    clickSequenceLength: number;
    clickTimeout: number;
}

// Mode activation event types
export type ModeActivationEvent = 'activated' | 'deactivated' | 'toggle_attempted' | 'access_denied';

export interface ModeActivationEventData {
    event: ModeActivationEvent;
    accountId: string | null;
    timestamp: number;
    success: boolean;
    reason?: string;
}