# Manual Trading Panel Implementation

## Overview
A comprehensive manual trading panel has been integrated into the xDtrader page, positioned on the right side of the screen. This feature allows users to manually execute trades with various contract types including Rise/Fall, Over/Under, Even/Odd, and more.

## Features Implemented

### 1. Manual Trading Panel (`src/components/xdtrader/ManualTradingPanel.tsx`)
- **Trade Type Selection**: Switch between different contract types:
  - Rise/Fall (CALL/PUT)
  - Higher/Lower (CALLE/PUTE)
  - Over/Under (DIGITOVER/DIGITUNDER)
  - Even/Odd (DIGITEVEN/DIGITODD)
  - Matches/Differs (DIGITMATCHES/DIGITDIFFERS)

- **Duration Configuration**:
  - Toggle between Ticks and Minutes
  - Adjustable duration slider (1-10 ticks, 1-60 minutes)
  - Visual duration display

- **Stake Management**:
  - Adjustable stake input with +/- buttons
  - Minimum stake validation ($0.35)
  - USD currency display

- **Barrier Settings** (for Over/Under and Matches/Differs):
  - Numeric input for barrier selection (0-9)
  - Dynamic barrier display in button text

- **Live Proposals**:
  - Real-time payout calculations
  - Probability percentages
  - Automatic proposal updates

- **Trade Execution**:
  - One-click trade execution
  - Loading states during execution
  - Success/error handling

### 2. Manual Trading Service (`src/services/manual-trading.service.ts`)
- **Proposal Management**:
  - Cached proposal requests for performance
  - Multiple proposal fetching
  - Automatic cache invalidation

- **Trade Execution**:
  - Validated trade requests
  - Error handling and recovery
  - Transaction result tracking

- **Price Subscription**:
  - Live price updates
  - WebSocket connection management
  - Automatic cleanup

- **Validation**:
  - Symbol validation
  - Trade parameter validation
  - Contract type verification

### 3. UI/UX Features
- **Responsive Design**:
  - Desktop: Fixed 340px width panel on right side
  - Tablet: Reduced to 320px width
  - Mobile: Collapsible panel at bottom

- **Visual Design**:
  - Clean, modern interface matching the image
  - Color-coded trade buttons (green for primary, red for secondary)
  - Loading indicators and states
  - Hover effects and transitions

- **Accessibility**:
  - Keyboard navigation support
  - Screen reader friendly
  - Clear visual feedback

## Integration with xDtrader

### Layout Structure
```tsx
<div className="xdtrader-main-content">
    <div className="xdtrader-chart-container">
        {/* SmartChart component */}
    </div>
    <div className="xdtrader-trading-panel">
        <ManualTradingPanel symbol={symbol} onTradeExecuted={handleTrade} />
    </div>
</div>
```

### CSS Layout (`src/pages/xdtrader/xdtrader.scss`)
- Flexbox layout for chart and trading panel
- Responsive breakpoints for different screen sizes
- Dark mode support
- Proper spacing and visual hierarchy

## Trade Types and Contract Mapping

| Trade Type | Primary Contract | Secondary Contract | Barrier Required |
|------------|------------------|-------------------|------------------|
| Rise/Fall | CALL | PUT | No |
| Higher/Lower | CALLE | PUTE | No |
| Over/Under | DIGITOVER | DIGITUNDER | Yes (0-9) |
| Even/Odd | DIGITEVEN | DIGITODD | No |
| Matches/Differs | DIGITMATCHES | DIGITDIFFERS | Yes (0-9) |

## API Integration

### Proposal Requests
```typescript
{
    proposal: 1,
    amount: stake,
    basis: 'stake',
    contract_type: contractType,
    currency: 'USD',
    symbol: symbol,
    duration: duration,
    duration_unit: 't' | 'm',
    barrier?: number // For digit contracts
}
```

### Trade Execution
```typescript
{
    buy: proposalId,
    price: stake
}
```

### Price Subscription
```typescript
{
    ticks: symbol,
    subscribe: 1
}
```

## Error Handling

### Symbol Validation
- Validates symbols before API calls
- Prevents invalid symbols like "na", "undefined"
- Provides helpful error messages

### Trade Validation
- Minimum stake requirements
- Duration limits
- Contract type validation
- Barrier range validation

### Connection Handling
- Automatic reconnection on WebSocket failures
- Graceful degradation when API is unavailable
- Loading states during network requests

## Performance Optimizations

### Proposal Caching
- 5-second cache for identical proposals
- Reduces API calls for rapid parameter changes
- Automatic cache cleanup

### Debounced Updates
- 500ms debounce for proposal requests
- Prevents excessive API calls during user input
- Smooth user experience

### Lazy Loading
- Components loaded only when needed
- Reduced initial bundle size
- Better performance on slower devices

## Usage Instructions

1. **Select Trade Type**: Click the navigation arrows to cycle through available trade types
2. **Set Duration**: Choose between Ticks or Minutes, then adjust the duration slider
3. **Configure Stake**: Use +/- buttons or type directly to set your stake amount
4. **Set Barrier** (if applicable): For Over/Under and Matches/Differs, set the barrier digit
5. **Execute Trade**: Click either the primary (green) or secondary (red) button to execute

## Trade Execution Flow

1. User clicks trade button
2. System validates all parameters
3. Gets fresh proposal if needed
4. Executes buy request with proposal ID
5. Displays success/error feedback
6. Calls onTradeExecuted callback with trade data

## Customization Options

### Theme Support
- Light and dark mode compatible
- CSS custom properties for easy theming
- Consistent with application design system

### Configuration
- Adjustable cache timeout
- Customizable stake limits
- Configurable duration ranges

## Testing Recommendations

1. **Symbol Validation**: Test with various symbols including invalid ones
2. **Trade Execution**: Test all contract types with different parameters
3. **Responsive Design**: Test on different screen sizes
4. **Error Handling**: Test with network failures and invalid inputs
5. **Performance**: Test with rapid parameter changes

## Future Enhancements

1. **Trade History**: Display recent manual trades
2. **Favorites**: Save frequently used trade configurations
3. **Advanced Orders**: Stop loss and take profit options
4. **Batch Trading**: Execute multiple trades simultaneously
5. **Analytics**: Track manual trading performance

## Dependencies

- React 18+
- MobX for state management
- SCSS for styling
- Deriv API for trading functionality
- Symbol validation utilities
- Performance monitoring tools

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

- All API calls go through validated channels
- Symbol validation prevents injection attacks
- Stake limits prevent excessive losses
- Error messages don't expose sensitive information