import React from 'react';
import { usePasswordProtection } from '@/hooks/usePasswordProtection';
import { PasswordProtection } from './PasswordProtection';

const ZenPage = React.lazy(() => import('@/pages/zen'));

export const ProtectedZen: React.FC = () => {
    const { isAuthenticated, authenticate } = usePasswordProtection();

    if (!isAuthenticated) {
        return (
            <PasswordProtection
                onAuthenticate={authenticate}
                title='Zen Trading Access'
                subtitle='Enter password to access Zen Trading Interface'
            />
        );
    }

    return (
        <React.Suspense fallback={<div>Loading Zen Trading...</div>}>
            <ZenPage />
        </React.Suspense>
    );
};
