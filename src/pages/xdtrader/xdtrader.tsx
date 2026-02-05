import { useEffect, useRef, useState, Suspense, useMemo, useCallback, memo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useStore } from '@/hooks/useStore';
import {
    ActiveSymbolsRequest,
    ServerTimeRequest,
    TicksHistoryResponse,
    TicksStreamRequest,
    TradingTimesRequest,
} from '@deriv/api-types';
import { ChartTitle, SmartChart } from '@deriv/deriv-charts';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import { delayedLazy } from '@/utils/delayed-lazy';
import '@deriv/deriv-charts/dist/smartcharts.css';

// Lazy load components to avoid potential import issues
const ManualTradingPanel = delayedLazy(() => import('@/components/xdtrader/ManualTradingPanel'), 100);
const TradeIndicators = delayedLazy(() => import('@/components/xdtrader/TradeIndicators'), 100);
const TradeProfitLoss = delayedLazy(() => import('@/components/xdtrader/TradeProfitLoss'), 100);
const DigitStats = delayedLazy(() => import('@/components/digit-stats'), 500);

type TSubscription = {
    [key: string]: null | {
        unsubscribe?: () => void;
    };
};

type TError = null | {
    error?: {
        code?: string;
        message?: string;
    };
};

const subscriptions: TSubscription = {};

// Loading component for better UX
const ChartLoader = memo(() => (
    <div className="chart-loader" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        background: 'var(--general-main-1)',
        borderRadius: '8px',
        flexDirection: 'column',
        gap: '16px'
    }}>
        <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #ff444f',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'var(--text-general)', fontSize: '14px' }}>Loading Chart...</p>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
    </div>
));

ChartLoader.displayName = 'ChartLoader';

const XDtrader = observer(({ show_digits_stats }: { show_digits_stats: boolean }) => {
    const barriers: [] = [];
    const { common, ui } = useStore();
    const { chart_store, run_panel, dashboard } = useStore();
    
    // Destructure chart_store properties
    const {
        chart_type,
        getMarketsOrder,
        granularity,
        onSymbolChange,
        setChartStatus,
        symbol,
        updateChartType,
        updateGranularity,
        updateSymbol,
        setChartSubscriptionId,
        chart_subscription_id,
    } = chart_store;
    
    // Other store properties
    const chartSubscriptionIdRef = useRef(chart_subscription_id);
    const { isDesktop, isMobile } = useDevice();
    const { is_drawer_open } = run_panel;
    const { is_chart_modal_visible } = dashboard;
    
    // Hide the run panel in xDtrader since we're replacing it with manual trading panel
    useEffect(() => {
        // Run panel is hidden via CSS in xDtrader layout
        console.log('XDtrader: Run panel hidden for manual trading mode');
    }, []);
    
    // Component state
    const [isChartReady, setIsChartReady] = useState(false);
    const [isApiReady, setIsApiReady] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [tradePositionManager, setTradePositionManager] = useState<any>(null);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

    // Lazy load trade position manager to avoid import issues
    useEffect(() => {
        import('@/services/trade-position-manager.service').then(module => {
            setTradePositionManager(module.tradePositionManager);
        }).catch(error => {
            console.warn('Failed to load trade position manager:', error);
        });
    }, []);

    // Subscribe to price updates for trade indicators
    useEffect(() => {
        if (!symbol || !tradePositionManager) return;

        const subscription = chart_api.api?.onMessage()?.subscribe(({ data }: { data: any }) => {
            if (data.tick && data.tick.symbol === symbol) {
                const price = data.tick.quote;
                setCurrentPrice(price);
                // Update all trade positions with current price
                tradePositionManager.updateAllPositionsPrice(price);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [symbol, tradePositionManager]);

    // Performance monitoring
    useEffect(() => {
        const startTime = performance.now();
        console.log('🚀 XDtrader component mounted');
        
        return () => {
            const endTime = performance.now();
            console.log(`⚡ XDtrader total load time: ${(endTime - startTime).toFixed(2)}ms`);
        };
    }, []);

    useEffect(() => {
        chartSubscriptionIdRef.current = chart_subscription_id;
    }, [chart_subscription_id]);

    useEffect(() => {
        if (!symbol) updateSymbol();
    }, [symbol, updateSymbol]);

    // Memoize settings to prevent unnecessary re-renders
    const settings = useMemo(() => ({
        assetInformation: false,
        countdown: true,
        isHighestLowestMarkerEnabled: false,
        language: common.current_language.toLowerCase(),
        position: ui.is_chart_layout_default ? 'bottom' : 'left',
        theme: ui.is_dark_mode_on ? 'dark' : 'light',
    }), [common.current_language, ui.is_chart_layout_default, ui.is_dark_mode_on]);

    // Memoize class names to prevent unnecessary re-renders
    const wrapperClassName = useMemo(() => classNames('dashboard__chart-wrapper', {
        'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
        'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
    }), [is_drawer_open, isDesktop, is_chart_modal_visible]);

    // Initialize API connection asynchronously with better error handling
    useEffect(() => {
        const initializeAPI = async () => {
            try {
                const startTime = performance.now();
                setApiError(null);
                if (!chart_api.api) {
                    await chart_api.init();
                }
                const endTime = performance.now();
                console.log(`⚡ API initialization: ${(endTime - startTime).toFixed(2)}ms`);
                setIsApiReady(true);
            } catch (error) {
                console.error('Failed to initialize chart API:', error);
                setApiError(error instanceof Error ? error.message : 'Failed to initialize API');
                // Continue with fallback
                setIsApiReady(true);
            }
        };

        initializeAPI();

        return () => {
            // Cleanup subscriptions on unmount
            if (chart_api.api) {
                chart_api.api.forgetAll('ticks').catch(console.error);
            }
        };
    }, []);

    // Optimized API request function with error handling and retry logic
    const requestAPI = useCallback(async (req: ServerTimeRequest | ActiveSymbolsRequest | TradingTimesRequest) => {
        try {
            if (!chart_api.api) {
                await chart_api.init();
            }
            return await chart_api.api.send(req);
        } catch (error) {
            console.error('API request failed:', error);
            setApiError(error instanceof Error ? error.message : 'API request failed');
            return null;
        }
    }, []);

    const requestForgetStream = useCallback((subscription_id: string) => {
        if (subscription_id && chart_api.api) {
            chart_api.api.forget(subscription_id).catch(console.error);
        }
    }, []);

    const requestSubscribe = useCallback(async (req: TicksStreamRequest, callback: (data: any) => void) => {
        try {
            requestForgetStream(chartSubscriptionIdRef.current);
            
            if (!chart_api.api) {
                await chart_api.init();
            }
            
            const history = await chart_api.api.send(req);
            setChartSubscriptionId(history?.subscription.id);
            
            if (history) {
                callback(history);
            }
            
            if (req.subscribe === 1) {
                subscriptions[history?.subscription.id] = chart_api.api
                    .onMessage()
                    ?.subscribe(({ data }: { data: TicksHistoryResponse }) => {
                        callback(data);
                    });
            }
        } catch (e) {
            const error = e as TError;
            if (error?.error?.code === 'MarketIsClosed') {
                callback([]);
            } else {
                console.error('Subscription failed:', error?.error?.message);
                setApiError(error?.error?.message || 'Subscription failed');
            }
        }
    }, [requestForgetStream, setChartSubscriptionId]);

    // Memoize toolbar widget to prevent unnecessary re-renders
    const toolbarWidget = useCallback(() => (
        <ToolbarWidgets
            updateChartType={updateChartType}
            updateGranularity={updateGranularity}
            position={!isDesktop ? 'bottom' : 'top'}
            isDesktop={isDesktop}
        />
    ), [updateChartType, updateGranularity, isDesktop]);

    // Memoize top widgets to prevent unnecessary re-renders
    const topWidgets = useCallback(() => <ChartTitle onChange={onSymbolChange} />, [onSymbolChange]);

    // Don't render until we have basic requirements
    if (!symbol || !isApiReady) {
        return <ChartLoader />;
    }

    const is_connection_opened = !!chart_api?.api;

    // Show error state if API failed to initialize
    if (apiError && !is_connection_opened) {
        return (
            <div className="chart-error" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                background: 'var(--general-main-1)',
                borderRadius: '8px',
                flexDirection: 'column',
                gap: '16px',
                color: 'var(--text-general)'
            }}>
                <p>⚠️ Chart connection failed</p>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>{apiError}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    style={{
                        padding: '8px 16px',
                        background: '#ff444f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Trade Profit/Loss Panel on the left side */}
            {tradePositionManager && tradePositionManager.positions.length > 0 && (
                <Suspense fallback={null}>
                    <TradeProfitLoss currentPrice={currentPrice} />
                </Suspense>
            )}
            
            <div
                className={wrapperClassName}
                dir='ltr'
            >
                <div className="xdtrader-main-content">
                    {/* Mobile Panel Toggle Button */}
                    {isMobile && (
                        <>
                            <button 
                                className={`mobile-panel-toggle ${isMobilePanelOpen ? 'panel-open' : ''}`}
                                onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
                                aria-label="Toggle trading panel"
                            >
                                {isMobilePanelOpen ? '×' : '☰'}
                            </button>
                            <div 
                                className={`mobile-overlay ${isMobilePanelOpen ? 'active' : ''}`}
                                onClick={() => setIsMobilePanelOpen(false)}
                            />
                        </>
                    )}
                    
                    <div className="xdtrader-chart-container">
                        <Suspense fallback={<ChartLoader />}>
                            <SmartChart
                                id='dbot'
                                barriers={barriers}
                                showLastDigitStats={false} // Disable built-in digit stats for performance
                                chartControlsWidgets={null}
                                enabledChartFooter={false}
                                chartStatusListener={(v: boolean) => {
                                    setChartStatus(!v);
                                    setIsChartReady(v);
                                }}
                                toolbarWidget={toolbarWidget}
                                chartType={chart_type}
                                isMobile={isMobile}
                                enabledNavigationWidget={isDesktop}
                                granularity={granularity}
                                requestAPI={requestAPI}
                                requestForget={() => {}}
                                requestForgetStream={() => {}}
                                requestSubscribe={requestSubscribe}
                                settings={settings}
                                symbol={symbol}
                                topWidgets={topWidgets}
                                isConnectionOpened={is_connection_opened}
                                getMarketsOrder={getMarketsOrder}
                                isLive
                                leftMargin={20} // Reduced left margin
                                rightMargin={20} // Add right margin to prevent overlap
                            />
                            
                            {/* Trade Indicators Overlay */}
                            <Suspense fallback={null}>
                                <TradeIndicators 
                                    trades={tradePositionManager?.positions || []}
                                    currentPrice={currentPrice}
                                    onTradeUpdate={(trade) => {
                                        console.log('Trade updated:', trade);
                                    }}
                                />
                            </Suspense>
                        </Suspense>
                    </div>
                    
                    {/* Manual Trading Panel on the right side */}
                    <div className={`xdtrader-trading-panel ${isMobile && isMobilePanelOpen ? 'mobile-open' : ''}`}>
                        <Suspense fallback={<div>Loading trading panel...</div>}>
                            <ManualTradingPanel 
                                symbol={symbol}
                                onTradeExecuted={(trade) => {
                                    console.log('Trade executed:', trade);
                                    
                                    // Add trade position to manager for visual indicators
                                    if (tradePositionManager) {
                                        tradePositionManager.addPosition({
                                            contractId: trade.contract_id,
                                            transactionId: trade.transaction_id,
                                            contractType: trade.contract_type,
                                            symbol: trade.symbol,
                                            stake: trade.stake,
                                            payout: trade.payout,
                                            buyPrice: trade.buy_price,
                                            entryPrice: currentPrice || 0,
                                            duration: trade.duration || 5,
                                            durationType: trade.duration_type || 'ticks',
                                            barrier: trade.barrier,
                                        });
                                    }
                                }}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>
            {/* Only load DigitStats after chart is ready and if enabled */}
            {show_digits_stats && isChartReady && (
                <Suspense fallback={<div style={{ height: '60px' }} />}>
                    <DigitStats symbol={symbol} className="xdtrader-digit-stats" />
                </Suspense>
            )}
        </>
    );
});

export default XDtrader;