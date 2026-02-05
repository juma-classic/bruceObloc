/**
 * Contract Switching Enhancement Tests
 * Tests for the enhanced contract type switching functionality
 */

import type { ZenTradeConfig } from '../zen-trading.service';
import { zenTradingService } from '../zen-trading.service';

describe('Enhanced Contract Switching', () => {
    let mockConfig: ZenTradeConfig;

    beforeEach(() => {
        mockConfig = {
            strategy: 'Even',
            market: 'R_100',
            stake: 1.0,
            martingaleMultiplier: 2.0,
            ticks: 1,
            defaultDigit: 5,
            switchOnLoss: true,
            lossesToSwitch: 3,
            switchMarket: false,
            mainMode: true,
            rounds: 10,
            delay: false,
            contractSwitching: {
                enabled: true,
                mode: 'rotation',
                resetOnWin: true,
                maxSwitches: 10,
                cooldownPeriod: 0, // No cooldown for testing
                performanceWindow: 10,
            },
        };
    });

    afterEach(() => {
        zenTradingService.resetSessionPublic();
        zenTradingService.resetContractPerformance();
    });

    describe('Configuration', () => {
        test('should initialize with enhanced contract switching config', () => {
            zenTradingService.initialize(mockConfig);

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats).toBeDefined();
            expect(stats.totalSwitches).toBe(0);
            expect(stats.switchesThisSession).toBe(0);
        });

        test('should update contract switching configuration', () => {
            zenTradingService.initialize(mockConfig);

            zenTradingService.updateContractSwitchingConfig({
                mode: 'performance',
                maxSwitches: 15,
            });

            // Configuration should be updated (we can't directly test private config,
            // but we can test that the method doesn't throw)
            expect(() => {
                zenTradingService.updateContractSwitchingConfig({
                    cooldownPeriod: 5,
                });
            }).not.toThrow();
        });
    });

    describe('Manual Switching', () => {
        test('should allow manual contract switching', () => {
            zenTradingService.initialize(mockConfig);

            const success = zenTradingService.manualContractSwitch('Rise');
            expect(success).toBe(true);

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats.switchesThisSession).toBe(1);
            expect(stats.switchHistory).toHaveLength(1);
            expect(stats.switchHistory[0].to).toBe('Rise');
            expect(stats.switchHistory[0].reason).toBe('Manual override');
        });

        test('should prevent manual switching when max switches reached', () => {
            mockConfig.contractSwitching!.maxSwitches = 1;
            zenTradingService.initialize(mockConfig);

            // First switch should succeed
            const firstSwitch = zenTradingService.manualContractSwitch('Rise');
            expect(firstSwitch).toBe(true);

            // Second switch should fail due to max switches
            const secondSwitch = zenTradingService.manualContractSwitch('Fall');
            expect(secondSwitch).toBe(false);
        });

        test('should prevent manual switching during cooldown', () => {
            mockConfig.contractSwitching!.cooldownPeriod = 60; // 60 minutes
            zenTradingService.initialize(mockConfig);

            // First switch should succeed
            const firstSwitch = zenTradingService.manualContractSwitch('Rise');
            expect(firstSwitch).toBe(true);

            // Second switch should fail due to cooldown
            const secondSwitch = zenTradingService.manualContractSwitch('Fall');
            expect(secondSwitch).toBe(false);
        });
    });

    describe('Performance Tracking', () => {
        test('should track contract performance', () => {
            zenTradingService.initialize(mockConfig);

            // Initially no performance data
            const initialPerformance = zenTradingService.getContractPerformance('Even');
            expect(initialPerformance).toBeNull();

            // After manual switch, we should have some tracking
            zenTradingService.manualContractSwitch('Rise');

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats.performanceByContract).toBeDefined();
        });

        test('should reset performance data', () => {
            zenTradingService.initialize(mockConfig);

            // Create some performance data
            zenTradingService.manualContractSwitch('Rise');

            // Reset performance
            zenTradingService.resetContractPerformance();

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats.performanceByContract).toHaveLength(0);
        });
    });

    describe('Statistics', () => {
        test('should provide comprehensive switching statistics', () => {
            zenTradingService.initialize(mockConfig);

            const stats = zenTradingService.getContractSwitchingStats();

            expect(stats).toHaveProperty('totalSwitches');
            expect(stats).toHaveProperty('switchesThisSession');
            expect(stats).toHaveProperty('lastSwitchTime');
            expect(stats).toHaveProperty('switchHistory');
            expect(stats).toHaveProperty('performanceByContract');
            expect(stats).toHaveProperty('bestPerformingContract');
            expect(stats).toHaveProperty('currentSwitchCooldown');

            expect(Array.isArray(stats.switchHistory)).toBe(true);
            expect(Array.isArray(stats.performanceByContract)).toBe(true);
        });

        test('should track switch history correctly', () => {
            zenTradingService.initialize(mockConfig);

            // Perform multiple switches
            zenTradingService.manualContractSwitch('Rise');
            zenTradingService.manualContractSwitch('Fall');

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats.switchHistory).toHaveLength(2);

            const firstSwitch = stats.switchHistory[0];
            expect(firstSwitch.from).toBe('Even');
            expect(firstSwitch.to).toBe('Rise');
            expect(firstSwitch.reason).toBe('Manual override');
            expect(typeof firstSwitch.timestamp).toBe('number');
            expect(typeof firstSwitch.consecutiveLosses).toBe('number');
        });
    });

    describe('Backward Compatibility', () => {
        test('should work with legacy switchOnLoss configuration', () => {
            const legacyConfig: ZenTradeConfig = {
                ...mockConfig,
                contractSwitching: undefined, // No enhanced config
            };

            zenTradingService.initialize(legacyConfig);

            // Should still provide statistics even without enhanced config
            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats).toBeDefined();
            expect(stats.totalSwitches).toBe(0);
        });

        test('should handle missing contractSwitching config gracefully', () => {
            const configWithoutSwitching = { ...mockConfig };
            delete configWithoutSwitching.contractSwitching;

            expect(() => {
                zenTradingService.initialize(configWithoutSwitching);
            }).not.toThrow();

            const stats = zenTradingService.getContractSwitchingStats();
            expect(stats).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty custom sequence gracefully', () => {
            mockConfig.contractSwitching!.mode = 'custom';
            mockConfig.contractSwitching!.customSequence = [];

            zenTradingService.initialize(mockConfig);

            // Should fall back to rotation mode
            const success = zenTradingService.manualContractSwitch();
            expect(success).toBe(true);
        });

        test('should handle invalid strategy names in custom sequence', () => {
            mockConfig.contractSwitching!.mode = 'custom';
            mockConfig.contractSwitching!.customSequence = ['InvalidStrategy', 'Even'];

            zenTradingService.initialize(mockConfig);

            // Should still work, potentially filtering invalid strategies
            expect(() => {
                zenTradingService.manualContractSwitch();
            }).not.toThrow();
        });

        test('should handle zero cooldown period', () => {
            mockConfig.contractSwitching!.cooldownPeriod = 0;
            zenTradingService.initialize(mockConfig);

            // Multiple switches should be allowed immediately
            const firstSwitch = zenTradingService.manualContractSwitch('Rise');
            const secondSwitch = zenTradingService.manualContractSwitch('Fall');

            expect(firstSwitch).toBe(true);
            expect(secondSwitch).toBe(true);
        });
    });
});

// Mock console.log to avoid test output noise
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
    jest.restoreAllMocks();
});
