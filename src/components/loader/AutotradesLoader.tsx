import React, { useEffect, useRef, useState } from 'react';
import './AutotradesLoader.scss';

interface AutotradesLoaderProps {
    onLoadComplete?: () => void;
    duration?: number;
}

export const AutotradesLoader: React.FC<AutotradesLoaderProps> = ({ 
    onLoadComplete, 
    duration = 4000 
}) => {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showLogo, setShowLogo] = useState(false);
    const particlesRef = useRef<HTMLCanvasElement>(null);

    const statuses = [
        "Initializing Trading Engine...",
        "Connecting to Market Data...",
        "Loading AI Algorithms...",
        "Synchronizing Strategies...",
        "Ready to Trade!"
    ];

    // Particle Animation Effect
    useEffect(() => {
        const canvas = particlesRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
            color: string;
        }> = [];

        const colors = ['#00D4FF', '#0099CC', '#006699', '#003366'];

        // Create particles
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.8 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(5, 10, 20, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.opacity;
                ctx.fill();
            });

            // Draw connections
            particles.forEach((particle, i) => {
                particles.slice(i + 1).forEach(otherParticle => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.strokeStyle = '#00D4FF';
                        ctx.globalAlpha = (100 - distance) / 100 * 0.3;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Logo reveal animation
    useEffect(() => {
        const logoTimer = setTimeout(() => {
            setShowLogo(true);
        }, 300);

        return () => clearTimeout(logoTimer);
    }, []);

    // Progress and Status Updates
    useEffect(() => {
        const statusInterval = duration / statuses.length;
        const progressInterval = 30;
        const progressIncrement = 100 / (duration / progressInterval);

        const progressTimer = setInterval(() => {
            setProgress(prev => {
                const next = prev + progressIncrement;
                return next >= 100 ? 100 : next;
            });
        }, progressInterval);

        const statusTimer = setInterval(() => {
            setStatusIndex(prev => {
                if (prev < statuses.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, statusInterval);

        const completeTimer = setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => {
                if (onLoadComplete) {
                    onLoadComplete();
                }
            }, 800);
        }, duration);

        return () => {
            clearInterval(progressTimer);
            clearInterval(statusTimer);
            clearTimeout(completeTimer);
        };
    }, [duration, onLoadComplete, statuses.length]);

    return (
        <div className={`autotrades-loader ${isComplete ? 'fade-out' : ''}`}>
            <canvas ref={particlesRef} className="particles-canvas" />
            
            <div className="loader-content">
                {/* Animated Logo */}
                <div className={`logo-container ${showLogo ? 'show' : ''}`}>
                    <div className="logo-wrapper">
                        <div className="logo-icon">
                            <div className="icon-circle"></div>
                            <div className="icon-arrow"></div>
                        </div>
                        <h1 className="logo-text">
                            <span className="auto">AUTO</span>
                            <span className="trades">TRADES</span>
                        </h1>
                    </div>
                    <p className="tagline">Automated Trading Platform</p>
                </div>

                {/* Modern Progress Ring */}
                <div className="progress-ring-container">
                    <svg className="progress-ring" width="120" height="120">
                        <circle
                            className="progress-ring-background"
                            cx="60"
                            cy="60"
                            r="54"
                            fill="transparent"
                            stroke="#1a2332"
                            strokeWidth="4"
                        />
                        <circle
                            className="progress-ring-fill"
                            cx="60"
                            cy="60"
                            r="54"
                            fill="transparent"
                            stroke="#00D4FF"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 54}`}
                            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                        />
                    </svg>
                    <div className="progress-percentage">{Math.round(progress)}%</div>
                </div>

                {/* Status Text */}
                <div className="status-container">
                    <p className="status-text">{statuses[statusIndex]}</p>
                </div>

                {/* Loading Dots */}
                <div className="loading-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            </div>
        </div>
    );
};

export default AutotradesLoader;