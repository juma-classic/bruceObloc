import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TickSpeedNavButton.scss';

interface TickSpeedNavButtonProps {
    className?: string;
    variant?: 'header' | 'mobile' | 'sidebar';
}

export const TickSpeedNavButton: React.FC<TickSpeedNavButtonProps> = ({ className = '', variant = 'header' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === '/tick-speed-trading';

    const handleClick = () => {
        navigate('/tick-speed-trading');
    };

    return (
        <button
            className={`tick-speed-nav-button tick-speed-nav-button--${variant} ${className} ${
                isActive ? 'active' : ''
            }`}
            onClick={handleClick}
            aria-label='Navigate to Tick Speed Trading'
        >
            <span className='button-icon'>⚡</span>
            <span className='button-text'>Tick Speed</span>
            {isActive && <span className='active-indicator' />}
        </button>
    );
};
