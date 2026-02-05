/**
 * Zen Transaction History Component
 * Enhanced transaction display for zen trading with detailed information
 */

import React, { useEffect, useRef, useState } from 'react';
import './ZenTransactionHistory.scss';

export interface ZenTransaction {
    id: string;
    contractId?: string;
    strategy: string;
    market: string;
    entrySpot?: number;
    exitSpot?: number;
    stake: number;
    profit?: number;
    status: 'pending' | 'won' | 'lost' | 'cancelled' | 'error';
    timestamp: number;
    contractType: string;
    duration: number;
    error?: string;
    payout?: number;
    proposalId?: string;
    buyPrice?: number;
    transactionId?: number;
}

interface ZenTransactionHistoryProps {
    transactions: ZenTransaction[];
    onExport?: () => void;
    onReset?: () => void;
}

export const ZenTransactionHistory: React.FC<ZenTransactionHistoryProps> = ({ transactions, onExport, onReset }) => {
    const [filter, setFilter] = useState<'all' | 'wins' | 'losses' | 'pending' | 'errors'>('all');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const prevTransactionCountRef = useRef(transactions.length);

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'all') return true;
        if (filter === 'wins') return tx.status === 'won';
        if (filter === 'losses') return tx.status === 'lost';
        if (filter === 'pending') return tx.status === 'pending';
        if (filter === 'errors') return tx.status === 'error' || tx.status === 'cancelled';
        return true;
    });

    // Auto-scroll to top when new transactions are added
    useEffect(() => {
        if (transactions.length > prevTransactionCountRef.current && listRef.current) {
            listRef.current.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
        prevTransactionCountRef.current = transactions.length;
    }, [transactions.length]);

    const summary = {
        total: transactions.length,
        wins: transactions.filter(tx => tx.status === 'won').length,
        losses: transactions.filter(tx => tx.status === 'lost').length,
        errors: transactions.filter(tx => tx.status === 'error' || tx.status === 'cancelled').length,
        pending: transactions.filter(tx => tx.status === 'pending').length,
        totalProfit: transactions.reduce((sum, tx) => sum + (tx.profit || 0), 0),
        totalStake: transactions.reduce((sum, tx) => sum + tx.stake, 0),
        winRate:
            transactions.filter(tx => tx.status === 'won' || tx.status === 'lost').length > 0
                ? (transactions.filter(tx => tx.status === 'won').length /
                      transactions.filter(tx => tx.status === 'won' || tx.status === 'lost').length) *
                  100
                : 0,
    };

    const handleExport = () => {
        console.log('📤 ZenTransactionHistory: Export function called');

        if (transactions.length === 0) {
            console.log('⚠️ No transactions to export');
            return;
        }

        try {
            console.log('📊 Preparing to export', transactions.length, 'zen transactions');

            // Create CSV content
            const headers = [
                'ID',
                'Strategy',
                'Market',
                'Contract Type',
                'Entry Spot',
                'Exit Spot',
                'Stake',
                'Profit',
                'Status',
                'Duration',
                'Contract ID',
                'Time',
                'Error',
            ];

            const rows = transactions.map(tx => [
                tx.id,
                tx.strategy,
                tx.market,
                tx.contractType,
                tx.entrySpot?.toFixed(4) || 'N/A',
                tx.exitSpot?.toFixed(4) || 'N/A',
                tx.stake.toFixed(2),
                (tx.profit || 0).toFixed(2),
                tx.status,
                tx.duration,
                tx.contractId || 'N/A',
                new Date(tx.timestamp).toLocaleString(),
                tx.error || 'N/A',
            ]);

            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            console.log('📄 CSV content prepared, length:', csv.length, 'characters');

            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const filename = `zen-trading-transactions-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;

            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

            console.log('✅ Zen Export completed successfully:', filename);
            onExport?.();
        } catch (error) {
            console.error('❌ Zen Export failed:', error);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getStrategyIcon = (strategy: string) => {
        const icons: Record<string, string> = {
            Even: '🟢',
            Odd: '🔴',
            Matches: '🎯',
            Differs: '🔄',
            Over: '⬆️',
            Under: '⬇️',
            Rise: '📈',
            Fall: '📉',
        };
        return icons[strategy] || '🎲';
    };

    return (
        <div className='zen-transaction-history'>
            <div className='zen-transaction-history__header'>
                <div className='zen-transaction-history__header-content'>
                    <h2 className='zen-transaction-history__title'>🧘 Zen Transactions</h2>
                </div>
                <div className='zen-transaction-history__actions'>
                    <button
                        className={`zen-transaction-history__toggle ${isCollapsed ? 'zen-transaction-history__toggle--collapsed' : ''}`}
                        type='button'
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                            <path
                                d='M5 7.5L10 12.5L15 7.5'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </button>
                    <button
                        className='zen-transaction-history__action-btn zen-transaction-history__action-btn--reset'
                        onClick={() => {
                            console.log('🔄 Reset button clicked in ZenTransactionHistory');
                            onReset?.();
                        }}
                        disabled={transactions.length === 0}
                        title='Reset History'
                    >
                        <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                            <path
                                d='M2 8a6 6 0 0110.472-4.472M14 8A6 6 0 013.528 12.472M14 3v3h-3M2 13v-3h3'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </button>
                    <button
                        className='zen-transaction-history__action-btn zen-transaction-history__action-btn--export'
                        onClick={() => {
                            console.log('📤 Export button clicked in ZenTransactionHistory');
                            handleExport();
                        }}
                        disabled={transactions.length === 0}
                        title='Export to CSV'
                    >
                        <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                            <path
                                d='M8 1v10M8 11l-3-3M8 11l3-3M2 11v3a1 1 0 001 1h10a1 1 0 001-1v-3'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div
                className={`zen-transaction-history__content ${isCollapsed ? 'zen-transaction-history__content--collapsed' : ''}`}
            >
                {/* Summary Card */}
                <div className='zen-transaction-history__summary'>
                    <div className='zen-transaction-history__summary-item'>
                        <div className='zen-transaction-history__summary-label'>Total</div>
                        <div className='zen-transaction-history__summary-value'>{summary.total}</div>
                    </div>
                    <div className='zen-transaction-history__summary-item'>
                        <div className='zen-transaction-history__summary-label'>Wins</div>
                        <div className='zen-transaction-history__summary-value zen-transaction-history__summary-value--success'>
                            {summary.wins}
                        </div>
                    </div>
                    <div className='zen-transaction-history__summary-item'>
                        <div className='zen-transaction-history__summary-label'>Losses</div>
                        <div className='zen-transaction-history__summary-value zen-transaction-history__summary-value--danger'>
                            {summary.losses}
                        </div>
                    </div>
                    <div className='zen-transaction-history__summary-item'>
                        <div className='zen-transaction-history__summary-label'>Win Rate</div>
                        <div
                            className={`zen-transaction-history__summary-value ${summary.winRate >= 50 ? 'zen-transaction-history__summary-value--success' : 'zen-transaction-history__summary-value--danger'}`}
                        >
                            {summary.winRate.toFixed(1)}%
                        </div>
                    </div>
                    <div className='zen-transaction-history__summary-item zen-transaction-history__summary-item--full'>
                        <div className='zen-transaction-history__summary-label'>Net P&L</div>
                        <div
                            className={`zen-transaction-history__summary-value zen-transaction-history__summary-value--large ${
                                summary.totalProfit >= 0
                                    ? 'zen-transaction-history__summary-value--success'
                                    : 'zen-transaction-history__summary-value--danger'
                            }`}
                        >
                            ${summary.totalProfit.toFixed(2)}
                        </div>
                        {/* 🚀 ENHANCED: Additional profit metrics */}
                        <div className='zen-transaction-history__summary-details'>
                            {summary.total > 0 && (
                                <>
                                    <small>Avg P&L: ${(summary.totalProfit / summary.total).toFixed(2)}</small>
                                    {summary.totalStake > 0 && (
                                        <small>
                                            ROI: {((summary.totalProfit / summary.totalStake) * 100).toFixed(1)}%
                                        </small>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className='zen-transaction-history__filter'>
                    <button
                        className={`zen-transaction-history__filter-btn ${filter === 'all' ? 'zen-transaction-history__filter-btn--active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({summary.total})
                    </button>
                    <button
                        className={`zen-transaction-history__filter-btn ${filter === 'wins' ? 'zen-transaction-history__filter-btn--active' : ''}`}
                        onClick={() => setFilter('wins')}
                    >
                        Wins ({summary.wins})
                    </button>
                    <button
                        className={`zen-transaction-history__filter-btn ${filter === 'losses' ? 'zen-transaction-history__filter-btn--active' : ''}`}
                        onClick={() => setFilter('losses')}
                    >
                        Losses ({summary.losses})
                    </button>
                    <button
                        className={`zen-transaction-history__filter-btn ${filter === 'pending' ? 'zen-transaction-history__filter-btn--active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending ({summary.pending})
                    </button>
                    <button
                        className={`zen-transaction-history__filter-btn ${filter === 'errors' ? 'zen-transaction-history__filter-btn--active' : ''}`}
                        onClick={() => setFilter('errors')}
                    >
                        Errors ({summary.errors})
                    </button>
                </div>

                {/* Transaction List */}
                <div className='zen-transaction-history__list' ref={listRef}>
                    {filteredTransactions.length === 0 ? (
                        <div className='zen-transaction-history__empty'>
                            <svg width='48' height='48' viewBox='0 0 48 48' fill='none'>
                                <circle cx='24' cy='24' r='20' stroke='currentColor' strokeWidth='2' opacity='0.3' />
                                <path
                                    d='M24 16v12M24 32v2'
                                    stroke='currentColor'
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                />
                            </svg>
                            <p>No zen transactions yet</p>
                            <small>Your zen trading history will appear here</small>
                        </div>
                    ) : (
                        filteredTransactions.map(tx => (
                            <div
                                key={tx.id}
                                className={`zen-transaction-history__item zen-transaction-history__item--${tx.status}`}
                            >
                                <div className='zen-transaction-history__item-header'>
                                    <span className='zen-transaction-history__item-strategy'>
                                        {getStrategyIcon(tx.strategy)} {tx.strategy}
                                    </span>
                                    <span className='zen-transaction-history__item-time'>
                                        {formatTime(tx.timestamp)}
                                    </span>
                                </div>
                                <div className='zen-transaction-history__item-details'>
                                    <div className='zen-transaction-history__item-market'>
                                        Market: {tx.market} • {tx.contractType}
                                    </div>
                                    {tx.entrySpot && (
                                        <div className='zen-transaction-history__item-spots'>
                                            <span>{tx.entrySpot.toFixed(4)}</span>
                                            <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                                <path
                                                    d='M2 6h8M8 6l-2-2M8 6l-2 2'
                                                    stroke='currentColor'
                                                    strokeWidth='1.5'
                                                    strokeLinecap='round'
                                                />
                                            </svg>
                                            <span>
                                                {tx.status === 'pending'
                                                    ? '...'
                                                    : tx.exitSpot
                                                      ? `${tx.exitSpot.toFixed(4)} (${Math.floor((tx.exitSpot * 10000) % 10)})`
                                                      : 'N/A'}
                                            </span>
                                        </div>
                                    )}
                                    <div className='zen-transaction-history__item-stake'>
                                        Stake: ${tx.stake.toFixed(2)} • Duration: {tx.duration} ticks
                                    </div>
                                    {tx.contractId && (
                                        <div className='zen-transaction-history__item-contract'>
                                            Contract: #{tx.contractId.slice(-8)}
                                        </div>
                                    )}
                                </div>
                                <div className='zen-transaction-history__item-footer'>
                                    <span
                                        className={`zen-transaction-history__item-outcome zen-transaction-history__item-outcome--${tx.status}`}
                                    >
                                        {tx.status === 'won'
                                            ? '🎉 PROFIT'
                                            : tx.status === 'lost'
                                              ? '📉 LOSS'
                                              : tx.status === 'error'
                                                ? '❌ ERROR'
                                                : tx.status === 'cancelled'
                                                  ? '🚫 CANCELLED'
                                                  : '⏳ PENDING'}
                                    </span>
                                    <div className='zen-transaction-history__item-profit-details'>
                                        <span
                                            className={`zen-transaction-history__item-profit ${
                                                (tx.profit || 0) >= 0
                                                    ? 'zen-transaction-history__item-profit--positive'
                                                    : 'zen-transaction-history__item-profit--negative'
                                            }`}
                                        >
                                            {(tx.profit || 0) >= 0 ? '+' : ''}${(tx.profit || 0).toFixed(2)}
                                        </span>
                                        {/* 🚀 ENHANCED: Show profit breakdown */}
                                        {tx.status !== 'pending' && (tx.buyPrice || tx.payout) && (
                                            <div className='zen-transaction-history__item-breakdown'>
                                                {tx.buyPrice && <small>Buy: ${tx.buyPrice.toFixed(2)}</small>}
                                                {tx.payout && <small>Payout: ${tx.payout.toFixed(2)}</small>}
                                                {tx.profit && tx.stake && (
                                                    <small>ROI: {((tx.profit / tx.stake) * 100).toFixed(1)}%</small>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {tx.error && (
                                    <div className='zen-transaction-history__item-error'>Error: {tx.error}</div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZenTransactionHistory;
