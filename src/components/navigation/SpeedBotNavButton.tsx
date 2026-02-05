import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SpeedBotNavButton.scss';

// Speed Bot Icon Component
const SpeedBotIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor'>
        <path d='M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z' />
        <path d='M19 15L20.09 18.26L24 19L20.09 19.74L19 23L17.91 19.74L14 19L17.91 18.26L19 15Z' />
        <path d='M5 15L6.09 18.26L10 19L6.09 19.74L5 23L3.91 19.74L0 19L3.91 18.26L5 15Z' />
    </svg>
);

interface SpeedBotNavButtonProps {
    className?: string;
    variant?: 'header' | 'mobile' | 'sidebar';
}

export const SpeedBotNavButton: React.FC<SpeedBotNavButtonProps> = ({ className = '', variant = 'header' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === '/speed-bot';

    const handleClick = () => {
        navigate('/speed-bot');
    };

    return (
        <button
            className={`speed-bot-nav-button speed-bot-nav-button--${variant} ${className} ${isActive ? 'active' : ''}`}
            onClick={handleClick}
            aria-label='Navigate to Speed Bot Trading Engine'
        >
            <span className='button-icon'>
                <SpeedBotIcon size={16} />
            </span>
            <span className='button-text'>Speed Bot</span>
            {isActive && <span className='active-indicator' />}
        </button>
    );
};

export default SpeedBotNavButton;
