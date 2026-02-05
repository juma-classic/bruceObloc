# Design Document: Fake Profit Mode

## Overview

The fake-profit-mode feature provides a demonstration system that displays simulated profit data for showcasing trading performance capabilities. This feature mirrors the architecture and functionality of the existing fake real mode system but focuses specifically on profit/loss transformations rather than account balance simulation.

The system consists of three main components: a profit data generator that creates realistic fake profit values, an activation system that restricts access to admin users through a 6-click sequence, and a transformation engine that modifies profit displays throughout the application. The feature operates independently from the existing fake real mode and uses separate localStorage keys to avoid conflicts.

## Architecture

The fake-profit-mode system follows a modular architecture similar to the existing fake real mode:

```mermaid
graph TB
    A[Currency Icon Component] -->|6-click activation| B[Fake Profit Mode Toggle]
    B --> C[Fake Profit Generator]
    B --> D[Storage Manager]
    C --> E[Profit Data Generation]
    D --> F[localStorage Persistence]
    G[Profit Display Components] --> H[Transform Engine]
    H -->|Check mode status| I[Mode Status Checker]
    I --> J[Apply Transformations]
    
    subgraph "Storage Layer"
        F
        K[fake_profit_mode_flag]
        L[fake_profit_data_*]
    end
    
    subgraph "Display Layer"
        M[TradeProfitLoss Component]
        N[Advanced Algo Stats]
        O[Accumulator Displays]
        P[Other Profit Components]
    end
    
    M --> H
    N --> H
    O --> H
    P --> H
```

## Components and Interfaces

### 1. Fake Profit Generator

**Purpose**: Generates and manages realistic fake profit data for demonstration purposes.

**Key Methods**:
```typescript
interface FakeProfitGenerator {
    generateNewProfitData(): void;
    getProfitValue(type: ProfitType): number;
    getFormattedProfit(value: number): string;
    clearStoredProfitData(): void;
    isFakeProfitModeActive(): boolean;
}

interface ProfitConfig {
    min: number;
    max: number;
    decimals: number;
    volatility: number;
}

enum ProfitType {
    DAILY = 'daily',
    WEEKLY = 'weekly', 
    MONTHLY = 'monthly',
    TOTAL = 'total',
    TRADE_SPECIFIC = 'trade_specific'
}
```

**Configuration**:
- Daily profits: $50 to $500 range
- Weekly profits: $200 to $2000 range  
- Monthly profits: $1000 to $8000 range
- Total profits: $5000 to $50000 range
- Trade-specific: 10% to 95% of stake as profit

### 2. Admin Activation System

**Purpose**: Provides secure activation mechanism restricted to admin users.

**Integration Point**: Extends existing currency icon component with fake profit mode toggle.

**Key Features**:
- 6-click activation sequence on currency icons
- Admin account ID validation
- Silent operation (no visible feedback during clicks)
- Page reload after mode toggle
- Independent from fake real mode activation

**Admin Account IDs** (same as fake real mode):
```typescript
const ADMIN_ACCOUNTS = [
    'CR7125309',
    'VRTC7528369', 
    'VRTC9119201',
    'CR6164902',
    'CR7391879',
    'VRTC11004488'
];
```

### 3. Transform Engine

**Purpose**: Modifies profit displays when fake profit mode is active.

**Key Methods**:
```typescript
interface TransformEngine {
    transformProfitValue(originalValue: number, context?: TransformContext): number;
    transformProfitDisplay(element: HTMLElement): void;
    getProfitClass(value: number): string;
    formatProfitCurrency(amount: number): string;
}

interface TransformContext {
    component: string;
    tradeId?: string;
    stake?: number;
    timeframe?: string;
}
```

**Transformation Rules**:
- Negative profits → Positive profits (10-50% of stake)
- Small profits → Enhanced profits (1.2x to 2.5x multiplier)
- Large profits → Realistic profits (maintain believability)
- Maintain consistency within same trading session

### 4. Storage Manager

**Purpose**: Handles persistence of fake profit data and mode state.

**Storage Keys**:
- `fake_profit_mode_flag`: Boolean flag for mode status
- `fake_profit_data_daily`: Generated daily profit value
- `fake_profit_data_weekly`: Generated weekly profit value  
- `fake_profit_data_monthly`: Generated monthly profit value
- `fake_profit_data_total`: Generated total profit value
- `fake_profit_generated_at`: Timestamp of data generation

## Data Models

### Profit Data Structure

```typescript
interface FakeProfitData {
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    generatedAt: number;
    sessionId: string;
}

interface ProfitTransformation {
    originalValue: number;
    transformedValue: number;
    context: TransformContext;
    timestamp: number;
}

interface ProfitDisplayConfig {
    showPositiveOnly: boolean;
    enhancementMultiplier: number;
    consistencyMode: boolean;
    formatWithCurrency: boolean;
}
```

### Component Integration Model

```typescript
interface ProfitDisplayComponent {
    componentName: string;
    profitSelectors: string[];
    transformationRules: TransformationRule[];
    updateFrequency: number;
}

interface TransformationRule {
    condition: (value: number) => boolean;
    transform: (value: number) => number;
    cssClass: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before writing the correctness properties, I need to analyze the acceptance criteria to determine which ones are testable as properties, examples, or edge cases.

Based on the prework analysis, I'll now convert the testable acceptance criteria into correctness properties:

### Property 1: Comprehensive Profit Data Generation
*For any* fake profit mode activation, the Profit_Generator should generate profit values for all required time periods (daily, weekly, monthly, total) within their respective realistic ranges, and all generated values should be properly formatted with appropriate decimal places and currency symbols.
**Validates: Requirements 1.1, 1.2, 1.4, 6.1**

### Property 2: Storage Consistency and Persistence  
*For any* fake profit data generation, the Storage_Manager should store all values in localStorage with the "fake_profit_" prefix, include a generation timestamp, and maintain data persistence until explicitly cleared.
**Validates: Requirements 1.3, 4.1, 4.4**

### Property 3: Complete Data Cleanup
*For any* fake profit mode deactivation, the Storage_Manager should remove all stored fake profit data from localStorage, leaving no residual fake profit keys.
**Validates: Requirements 1.5, 4.3**

### Property 4: Admin Access Control
*For any* user interaction with currency icons, the system should only allow mode toggling for users whose account IDs are in the authorized admin list, and silently ignore clicks from non-admin users.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 5: Mode State Persistence
*For any* fake profit mode toggle, the system should store the mode state in localStorage using the "fake_profit_mode_flag" key and maintain this state across all system components.
**Validates: Requirements 2.5, 5.2**

### Property 6: Transformation Behavior Based on Mode Status
*For any* profit value request, when fake profit mode is active, the Transform_Engine should replace actual values with fake generated values, and when inactive, should return actual values unchanged.
**Validates: Requirements 3.1, 3.3, 3.5**

### Property 7: Transformation Consistency
*For any* profit value within a session, the Transform_Engine should maintain consistent transformations across different UI components and ensure all related profit displays show coherent fake values.
**Validates: Requirements 3.2, 3.4, 6.3**

### Property 8: Realistic Profit Transformation
*For any* profit value transformation, the Transform_Engine should handle both positive and negative scenarios realistically, maintaining proper formatting with currency symbols and decimal places.
**Validates: Requirements 6.2, 6.4**

### Property 9: Data Validation and Auto-Generation
*For any* stored data retrieval request, the system should validate data existence and automatically generate new fake profit data if missing or invalid.
**Validates: Requirements 4.5**

### Property 10: Consistent Mode Detection
*For any* mode status check across different application components, the system should return consistent boolean values indicating the current fake profit mode state.
**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

### Property 11: System Independence
*For any* simultaneous activation of fake profit mode and fake real mode, both systems should operate independently without interfering with each other's functionality or storage.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 12: Backward Compatibility
*For any* existing profit display logic, when fake profit mode is inactive, the system should maintain full backward compatibility and unchanged behavior.
**Validates: Requirements 7.5**

### Property 13: Testing Utility Reliability
*For any* testing scenario, the system should provide reliable utilities for programmatic mode toggling, data validation, state reset, and consistent transformation behavior across multiple test invocations.
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

The fake profit mode system implements comprehensive error handling to ensure graceful degradation:

### Storage Errors
- **localStorage unavailable**: Fall back to in-memory storage with session-only persistence
- **Storage quota exceeded**: Clear old fake profit data and retry with minimal dataset
- **Corrupted data**: Clear invalid data and regenerate fresh fake profit values

### Generation Errors
- **Invalid profit ranges**: Use default safe ranges and log configuration errors
- **Formatting failures**: Fall back to basic number formatting without currency symbols
- **Timestamp errors**: Use current timestamp as fallback for generation time

### Transformation Errors
- **Component integration failures**: Return original values unchanged to prevent display issues
- **Mode detection errors**: Default to inactive mode to prevent unintended transformations
- **Consistency failures**: Log warnings but continue with individual transformations

### Admin Access Errors
- **Account ID validation failures**: Default to non-admin access for security
- **Click sequence detection errors**: Reset click counter and require fresh sequence
- **Mode toggle failures**: Log error and maintain current mode state

## Testing Strategy

The fake profit mode system employs a dual testing approach combining unit tests for specific scenarios and property-based tests for comprehensive validation:

### Unit Testing Focus
- **Specific admin account validation**: Test each admin account ID individually
- **Edge cases**: Empty profit values, boundary conditions, storage limits
- **Error conditions**: localStorage unavailable, corrupted data, invalid configurations
- **Integration points**: Component mounting/unmounting, mode transitions

### Property-Based Testing Configuration
- **Testing Library**: Use `fast-check` for TypeScript property-based testing
- **Test Iterations**: Minimum 100 iterations per property test for thorough coverage
- **Test Tagging**: Each property test tagged with format: **Feature: fake-profit-mode, Property {number}: {property_text}**

### Property Test Implementation Requirements
- Each correctness property must be implemented as a single property-based test
- Tests must generate random inputs within realistic ranges
- Profit values: -$10,000 to +$50,000 range for comprehensive testing
- Time periods: Random selection from daily/weekly/monthly/total categories
- Admin accounts: Random selection from authorized and unauthorized account lists
- Mode states: Random toggling between active/inactive states

### Test Data Generation
- **Profit Values**: Generate realistic profit/loss amounts with proper decimal precision
- **Account IDs**: Mix of valid admin accounts and invalid non-admin accounts
- **Storage States**: Various localStorage conditions including empty, partial, and corrupted data
- **Component States**: Different UI component mounting and interaction scenarios

### Validation Criteria
- All generated fake profits must fall within specified realistic ranges
- Storage operations must maintain data integrity and proper key prefixes
- Mode detection must be consistent across all system components
- Transformations must maintain mathematical relationships (e.g., totals = sum of parts)
- Admin access control must never allow unauthorized mode activation

The testing strategy ensures that the fake profit mode system maintains reliability and consistency across all possible usage scenarios while providing comprehensive coverage of both normal operations and edge cases.