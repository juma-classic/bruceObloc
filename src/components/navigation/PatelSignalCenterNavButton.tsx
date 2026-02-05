/**
 * Patel Signal Center Navigation Button
 * Navigation button for the Patel Signal Center page
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PatelSignalCenterNavButton.scss';

interface PatelSignalCenterNavButtonProps {
    variant?: 'header' | 'sidebar' | 'mobile';
    className?: string;
}

export const PatelSignalCenterNavButton: React.FC<PatelSignalCenterNavButtonProps> = ({ 
    variant = 'header', 
    className = '' 
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === '/patel-signal-center';

    const handleClick = () => {
        navigate('/patel-signal-center');
    };

    return (
        <button
            className={`patel-signal-center-nav-button patel-signal-center-nav-button--${variant} ${className} ${isActive ? 'active' : ''}`}
            onClick={handleClick}
            title="Patel Signal Center - Advanced Statistical Trading Engine"
            aria-label="Navigate to Patel Signal Center"
        >
            <span className="button-icon">🟣</span>
            <span className="button-text">Patel Signals</span>
            {isActive && <span className="active-indicator" />}
        </button>
    );
};