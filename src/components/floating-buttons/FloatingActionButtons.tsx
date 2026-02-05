import React, { useState } from 'react';
import './FloatingActionButtons.scss';

interface FloatingActionButtonsProps {
    onPatelClick?: () => void;
    onRazielClick?: () => void;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
    onPatelClick,
    onRazielClick
}) => {
    const [patelHovered, setPatelHovered] = useState(false);
    const [razielHovered, setRazielHovered] = useState(false);

    const handlePatelClick = () => {
        console.log('🟣 Patel button clicked');
        // Add power-up effect
        const button = document.querySelector('.fab--patel');
        button?.classList.add('fab--powered');
        setTimeout(() => button?.classList.remove('fab--powered'), 500);
        onPatelClick?.();
    };

    const handleRazielClick = () => {
        console.log('🟠 Raziel button clicked');
        // Add power-up effect
        const button = document.querySelector('.fab--raziel');
        button?.classList.add('fab--powered');
        setTimeout(() => button?.classList.remove('fab--powered'), 500);
        onRazielClick?.();
    };

    return (
        <div className="floating-action-buttons">
            {/* Patel Button - Purple */}
            <button
                className={`fab fab--patel ${patelHovered ? 'fab--hovered' : ''}`}
                onClick={handlePatelClick}
                onMouseEnter={() => setPatelHovered(true)}
                onMouseLeave={() => setPatelHovered(false)}
                title="PATEL AI - Advanced Trading Intelligence System"
            >
                <div className="fab__content">
                    <div className="fab__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Futuristic AI Brain Icon */}
                            <path
                                d="M12 2C8.5 2 6 4.5 6 8c0 1.5.5 3 1.5 4.5L12 22l4.5-9.5C17.5 11 18 9.5 18 8c0-3.5-2.5-6-6-6z"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="rgba(255, 255, 255, 0.1)"
                            />
                            <circle cx="12" cy="8" r="2" fill="currentColor" />
                            <path d="M10 8h4M12 6v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                            
                            {/* Neural network connections - enhanced */}
                            <circle cx="8" cy="6" r="1.2" fill="currentColor" opacity="0.9" />
                            <circle cx="16" cy="6" r="1.2" fill="currentColor" opacity="0.9" />
                            <circle cx="8" cy="10" r="1.2" fill="currentColor" opacity="0.9" />
                            <circle cx="16" cy="10" r="1.2" fill="currentColor" opacity="0.9" />
                            
                            {/* Data flow lines */}
                            <path
                                d="M9 6.5L11 7.5M15 7.5L17 6.5M9 9.5L11 8.5M15 8.5L17 9.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                opacity="0.8"
                                strokeLinecap="round"
                            />
                            
                            {/* AI processing indicators */}
                            <circle cx="6" cy="8" r="0.8" fill="#00ffff" opacity="0.7">
                                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="18" cy="8" r="0.8" fill="#00ffff" opacity="0.7">
                                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                    </div>
                    <div className="fab__label">
                        <span className="fab__text">PATEL</span>
                        <span className="fab__subtext">AI SIGNALS</span>
                    </div>
                </div>
                <div className="fab__glow"></div>
                <div className="fab__pulse"></div>
                <div className="fab__hologram"></div>
            </button>

            {/* Raziel Button - Orange */}
            <button
                className={`fab fab--raziel ${razielHovered ? 'fab--hovered' : ''}`}
                onClick={handleRazielClick}
                onMouseEnter={() => setRazielHovered(true)}
                onMouseLeave={() => setRazielHovered(false)}
                title="RAZIEL SCANNER - Market Intelligence & Analysis Engine"
            >
                <div className="fab__content">
                    <div className="fab__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Futuristic Scanner/Radar Icon */}
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="rgba(255, 255, 255, 0.05)" />
                            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                            
                            {/* Scanning lines - enhanced */}
                            <path
                                d="M12 2V6M12 18V22M2 12H6M18 12H22"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                            <path
                                d="M5.5 5.5L8.5 8.5M15.5 15.5L18.5 18.5M18.5 5.5L15.5 8.5M8.5 15.5L5.5 18.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                opacity="0.8"
                            />
                            
                            {/* Scanning sweep */}
                            <path
                                d="M12 12L20 8"
                                stroke="#00ff88"
                                strokeWidth="2"
                                opacity="0.8"
                                strokeLinecap="round"
                            >
                                <animateTransform
                                    attributeName="transform"
                                    attributeType="XML"
                                    type="rotate"
                                    from="0 12 12"
                                    to="360 12 12"
                                    dur="3s"
                                    repeatCount="indefinite"
                                />
                            </path>
                            
                            {/* Data points - enhanced */}
                            <circle cx="12" cy="6" r="1.2" fill="#00ff88" opacity="0.9">
                                <animate attributeName="r" values="1;1.5;1" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="18" cy="12" r="1.2" fill="#00ff88" opacity="0.9">
                                <animate attributeName="r" values="1.5;1;1.5" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="12" cy="18" r="1.2" fill="#00ff88" opacity="0.9">
                                <animate attributeName="r" values="1;1.5;1" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                            </circle>
                            <circle cx="6" cy="12" r="1.2" fill="#00ff88" opacity="0.9">
                                <animate attributeName="r" values="1.5;1;1.5" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                            </circle>
                        </svg>
                    </div>
                    <div className="fab__label">
                        <span className="fab__text">RAZIEL</span>
                        <span className="fab__subtext">SCANNER</span>
                    </div>
                </div>
                <div className="fab__glow"></div>
                <div className="fab__pulse"></div>
                <div className="fab__hologram"></div>
            </button>
        </div>
    );
};

export default FloatingActionButtons;