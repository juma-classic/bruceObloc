import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PatelSignalsIcon } from '../signals/patel/icons';
import './PatelSignalsNavButton.scss';

interface PatelSignalsNavButtonProps {
  className?: string;
  variant?: 'header' | 'mobile' | 'sidebar';
}

export const PatelSignalsNavButton: React.FC<PatelSignalsNavButtonProps> = ({ 
  className = '', 
  variant = 'header' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/patel-signals';

  const handleClick = () => {
    navigate('/patel-signals');
  };

  return (
    <button
      className={`patel-signals-nav-button patel-signals-nav-button--${variant} ${className} ${
        isActive ? 'active' : ''
      }`}
      onClick={handleClick}
      aria-label="Navigate to Patel Signal Generator"
    >
      <span className="button-icon">
        <PatelSignalsIcon size={16} />
      </span>
      <span className="button-text">Patel Signals</span>
      {isActive && <span className="active-indicator" />}
    </button>
  );
};

export default PatelSignalsNavButton;
