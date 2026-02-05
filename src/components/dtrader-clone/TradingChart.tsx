import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TradingStore } from '@/stores/trading-store';
import './TradingChart.scss';

interface TradingChartProps {
    store: TradingStore;
}

const TradingChart: React.FC<TradingChartProps> = observer(({ store }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 400 });

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current?.parentElement) {
                const parent = canvasRef.current.parentElement;
                setChartDimensions({
                    width: parent.clientWidth - 20,
                    height: parent.clientHeight - 60,
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        drawChart();
    }, [store.chartData, store.currentPrice, chartDimensions]);

    const drawChart = () => {
        const canvas = canvasRef.current;
        if (!canvas || store.chartData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = chartDimensions;
        canvas.width = width;
        canvas.height = height;

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        drawGrid(ctx, width, height);

        // Draw candlesticks
        drawCandlesticks(ctx, width, height);

        // Draw current price line
        drawCurrentPriceLine(ctx, width, height);
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 0.5;

        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i <= 8; i++) {
            const y = (height / 8) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    };

    const drawCandlesticks = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (store.chartData.length === 0) return;

        const data = store.chartData.slice(-100); // Show last 100 candles
        const candleWidth = width / data.length;
        
        // Calculate price range
        const prices = data.flatMap(d => [d.high, d.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;

        data.forEach((candle, index) => {
            const x = index * candleWidth;
            const openY = height - ((candle.open - minPrice) / priceRange) * height;
            const closeY = height - ((candle.close - minPrice) / priceRange) * height;
            const highY = height - ((candle.high - minPrice) / priceRange) * height;
            const lowY = height - ((candle.low - minPrice) / priceRange) * height;

            const isGreen = candle.close > candle.open;
            ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
            ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';

            // Draw wick
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + candleWidth / 2, highY);
            ctx.lineTo(x + candleWidth / 2, lowY);
            ctx.stroke();

            // Draw body
            const bodyHeight = Math.abs(closeY - openY);
            const bodyY = Math.min(openY, closeY);
            ctx.fillRect(x + 1, bodyY, candleWidth - 2, bodyHeight || 1);
        });
    };

    const drawCurrentPriceLine = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (store.currentPrice === 0 || store.chartData.length === 0) return;

        const data = store.chartData.slice(-100);
        const prices = data.flatMap(d => [d.high, d.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;

        const priceY = height - ((store.currentPrice - minPrice) / priceRange) * height;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, priceY);
        ctx.lineTo(width, priceY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price label
        ctx.fillStyle = '#f59e0b';
        ctx.font = '12px Arial';
        ctx.fillText(store.currentPrice.toFixed(5), width - 80, priceY - 5);
    };

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    return (
        <div className="trading-chart">
            <div className="chart-header">
                <div className="chart-title">
                    <h3>{store.activeSymbol}</h3>
                    <span className="current-price">
                        {store.currentPrice.toFixed(5)}
                    </span>
                </div>
                <div className="chart-controls">
                    <div className="timeframe-selector">
                        {timeframes.map(tf => (
                            <button
                                key={tf}
                                className={`timeframe-btn ${store.timeframe === tf ? 'active' : ''}`}
                                onClick={() => store.setTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="chart-container">
                <canvas
                    ref={canvasRef}
                    width={chartDimensions.width}
                    height={chartDimensions.height}
                />
            </div>
        </div>
    );
});

export default TradingChart;