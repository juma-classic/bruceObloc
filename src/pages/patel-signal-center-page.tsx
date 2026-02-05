/**
 * Patel Signal Center Page
 * Advanced Statistical Trading Signal Engine
 */

import React from 'react';
import { PatelSignalCenter } from '../components/signals/PatelSignalCenter';
import './patel-signal-center-page.scss';

export const PatelSignalCenterPage: React.FC = () => {
    return (
        <div className="patel-signal-center-page">
            <div className="page-container">
                <PatelSignalCenter />
            </div>
        </div>
    );
};

export default PatelSignalCenterPage;