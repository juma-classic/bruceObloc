import React from 'react';
import './PatelPrime.scss';

const PatelPrime: React.FC = () => {
    return (
        <div className="patel-prime">
            <div className="patel-prime-header">
                <h2>Patel Prime Signals</h2>
                <p>Advanced trading signals and analysis</p>
            </div>
            
            <div className="patel-prime-content">
                <div className="signals-grid">
                    <div className="signal-card">
                        <div className="signal-header">
                            <span className="signal-symbol">R_100</span>
                            <span className="signal-type call">CALL</span>
                        </div>
                        <div className="signal-details">
                            <div className="signal-price">Entry: 1234.56</div>
                            <div className="signal-duration">Duration: 5 ticks</div>
                            <div className="signal-confidence">Confidence: 85%</div>
                        </div>
                    </div>
                    
                    <div className="signal-card">
                        <div className="signal-header">
                            <span className="signal-symbol">R_50</span>
                            <span className="signal-type put">PUT</span>
                        </div>
                        <div className="signal-details">
                            <div className="signal-price">Entry: 987.65</div>
                            <div className="signal-duration">Duration: 3 ticks</div>
                            <div className="signal-confidence">Confidence: 92%</div>
                        </div>
                    </div>
                </div>
                
                <div className="patel-prime-stats">
                    <div className="stat-item">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">87.5%</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Signals</span>
                        <span className="stat-value">1,247</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Active Signals</span>
                        <span className="stat-value">12</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatelPrime;