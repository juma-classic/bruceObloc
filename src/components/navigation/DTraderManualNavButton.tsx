import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DTraderManualNavButton.scss';

export const DTraderManualNavButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === '/dtrader-manual';

    const handleClick = () => {
        navigate('/dtrader-manual');
    };

    return (
        <button
            className={`dtrader-manual-nav-button ${isActive ? 'active' : ''}`}
            onClick={handleClick}
            title="Professional DTrader Manual Trading Interface"
        >
            <div className="nav-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M3 3H21V21H3V3ZM5 5V19H19V5H5ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"
                        fill="currentColor"
                    />
                    <circle cx="16" cy="16" r="2" fill="currentColor" />
                </svg>
            </div>
            <div className="nav-content">
                <div className="nav-title">DTrader Manual</div>
                <div className="nav-subtitle">Professional Trading Interface</div>
            </div>
            <div className="nav-badge">PRO</div>
        </button>
    );
};