# Requirements Document

## Introduction

The fake-profit-mode feature provides a demonstration mode that displays simulated profit data to showcase trading performance capabilities. This feature mirrors the existing fake real mode system but focuses specifically on profit display rather than account balance simulation. It allows authorized users to activate a special mode that transforms profit displays with realistic-looking but fake profit data for demonstration purposes.

## Glossary

- **Fake_Profit_Mode**: A demonstration mode that displays simulated profit data instead of actual trading profits
- **Profit_Generator**: The system component responsible for generating and managing fake profit values
- **Admin_User**: A user with administrative privileges who can activate fake profit mode through a special activation sequence
- **Activation_Sequence**: A 6-click sequence on currency icons that toggles fake profit mode for admin users
- **Profit_Display**: Any UI component that shows trading profit/loss information to users
- **Storage_Manager**: The component that handles persistence of fake profit data in browser localStorage
- **Transform_Engine**: The component that modifies profit values when fake profit mode is active

## Requirements

### Requirement 1: Fake Profit Data Generation

**User Story:** As an admin user, I want the system to generate realistic fake profit data, so that I can demonstrate trading performance capabilities without revealing actual trading results.

#### Acceptance Criteria

1. WHEN fake profit mode is activated, THE Profit_Generator SHALL generate random profit values within realistic ranges
2. WHEN generating profit data, THE Profit_Generator SHALL create values for different time periods (daily, weekly, monthly)
3. WHEN storing profit data, THE Storage_Manager SHALL persist generated values in localStorage with unique key prefixes
4. THE Profit_Generator SHALL format profit values with appropriate decimal places and currency symbols
5. WHEN fake profit mode is deactivated, THE Storage_Manager SHALL clear all stored fake profit data

### Requirement 2: Admin-Only Activation System

**User Story:** As a system administrator, I want fake profit mode to be accessible only to authorized admin users, so that regular users cannot accidentally or intentionally activate demonstration mode.

#### Acceptance Criteria

1. WHEN a non-admin user clicks on currency icons, THE System SHALL ignore the clicks silently
2. WHEN an admin user performs the 6-click activation sequence on currency icons, THE System SHALL toggle fake profit mode
3. THE System SHALL maintain a list of authorized admin account IDs for access control
4. WHEN fake profit mode is toggled, THE System SHALL reload the page to apply changes immediately
5. THE System SHALL store the fake profit mode state in localStorage for persistence across sessions

### Requirement 3: Profit Display Transformation

**User Story:** As an admin user in fake profit mode, I want all profit displays to show the generated fake data, so that I can demonstrate realistic trading performance without exposing actual results.

#### Acceptance Criteria

1. WHEN fake profit mode is active, THE Transform_Engine SHALL replace actual profit values with fake generated values
2. WHEN displaying profit information, THE Profit_Display SHALL show fake profits that appear realistic and consistent
3. WHEN fake profit mode is inactive, THE Profit_Display SHALL show actual profit data unchanged
4. THE Transform_Engine SHALL maintain consistency in fake profit values across different UI components
5. WHEN profit data is requested, THE System SHALL check fake profit mode status before returning values

### Requirement 4: Data Persistence and Management

**User Story:** As an admin user, I want fake profit data to persist across browser sessions, so that the demonstration mode remains consistent until manually changed.

#### Acceptance Criteria

1. WHEN fake profit data is generated, THE Storage_Manager SHALL store values with the prefix "fake_profit_"
2. WHEN the browser is refreshed, THE System SHALL maintain fake profit mode state and data
3. WHEN fake profit mode is deactivated, THE Storage_Manager SHALL remove all fake profit data from localStorage
4. THE Storage_Manager SHALL store a timestamp indicating when fake profit data was generated
5. WHEN retrieving stored data, THE System SHALL validate data existence and generate new data if missing

### Requirement 5: Mode Status Detection

**User Story:** As a developer, I want utility functions to detect fake profit mode status, so that components can conditionally apply profit transformations.

#### Acceptance Criteria

1. THE System SHALL provide a function to check if fake profit mode is currently active
2. WHEN checking mode status, THE System SHALL read the localStorage flag "fake_profit_mode_flag"
3. THE System SHALL return boolean values indicating fake profit mode state
4. WHEN mode status changes, THE System SHALL ensure all components can detect the new state
5. THE System SHALL provide consistent mode detection across all application components

### Requirement 6: Profit Value Transformation Logic

**User Story:** As an admin user, I want fake profit values to look realistic and professional, so that demonstrations appear credible and convincing.

#### Acceptance Criteria

1. WHEN transforming profit values, THE Transform_Engine SHALL generate values within realistic profit ranges
2. WHEN displaying transformed profits, THE System SHALL maintain proper formatting with currency symbols and decimal places
3. WHEN fake profit mode is active, THE Transform_Engine SHALL ensure consistency between related profit displays
4. THE Transform_Engine SHALL handle both positive and negative profit scenarios realistically
5. WHEN generating fake profits, THE System SHALL create values that correlate logically with trading activity levels

### Requirement 7: Integration with Existing Systems

**User Story:** As a developer, I want fake profit mode to integrate seamlessly with existing components, so that it works without disrupting current functionality.

#### Acceptance Criteria

1. WHEN fake profit mode is implemented, THE System SHALL not interfere with existing fake real mode functionality
2. WHEN both modes are active simultaneously, THE System SHALL handle both transformations independently
3. THE System SHALL use separate localStorage keys to avoid conflicts with existing fake real mode
4. WHEN integrating with profit display components, THE System SHALL require minimal code changes
5. THE System SHALL maintain backward compatibility with existing profit display logic

### Requirement 8: Testing and Validation Support

**User Story:** As a developer, I want comprehensive testing capabilities for fake profit mode, so that I can ensure the feature works correctly across all scenarios.

#### Acceptance Criteria

1. WHEN testing fake profit generation, THE System SHALL provide methods to validate generated profit ranges
2. WHEN testing mode activation, THE System SHALL allow programmatic toggling for test scenarios
3. THE System SHALL provide utilities to clear test data and reset mode state
4. WHEN testing transformations, THE System SHALL ensure consistent behavior across multiple invocations
5. THE System SHALL validate that fake profit data follows expected formatting and range constraints