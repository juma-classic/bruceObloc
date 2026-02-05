import { useEffect } from 'react';

export const RichMotherPage: React.FC = () => {
    useEffect(() => {
        // Redirect to the Rich Mother app in the public folder
        window.location.href = '/RichMother/index.html';
    }, []);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                💎 Redirecting to Advanced Trading Tool...
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>
                If you're not redirected automatically, 
                <a 
                    href="/RichMother/index.html" 
                    style={{ color: '#ffd700', marginLeft: '5px' }}
                >
                    click here
                </a>
            </div>
        </div>
    );
};

export default RichMotherPage;