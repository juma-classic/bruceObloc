import React, { useState, useEffect } from 'react';
import './DerivAPIConnection.scss';

interface DerivAPIConnectionProps {
    onConnectionChange: (isConnected: boolean, wsConnection?: WebSocket) => void;
}

export const DerivAPIConnection: React.FC<DerivAPIConnectionProps> = ({ onConnectionChange }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
    const [connectionInfo, setConnectionInfo] = useState<any>(null);

    // Auto-connect on component mount
    useEffect(() => {
        connectToAPI();
    }, []);

    const connectToAPI = async () => {
        setIsConnecting(true);
        setConnectionError('');

        try {
            // Create WebSocket connection to Deriv API with your app ID
            const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=68794');

            // Set connection timeout
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.error('❌ Connection timeout after 10 seconds');
                    setConnectionError('Connection timeout - please try again');
                    setIsConnecting(false);
                    setIsConnected(false);
                    onConnectionChange(false);
                    ws.close();
                }
            }, 10000); // 10 second timeout

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ Connected to Deriv API with App ID: 82255');

                // For public data access, we don't need authorization
                // Just send a ping to confirm connection
                ws.send(JSON.stringify({ ping: 1 }));
            };

            ws.onmessage = event => {
                const data = JSON.parse(event.data);
                console.log('📡 Received message:', data);

                // Always check for errors first
                if (data.error) {
                    console.error('❌ API Error:', data.error);
                    setConnectionError(data.error.message);
                    setIsConnecting(false);
                    setIsConnected(false);
                    onConnectionChange(false);
                    ws.close();
                    return;
                }

                // Route messages by msg_type (Critical for Deriv API)
                const msgType = data.msg_type;
                console.log(`📡 Message type: ${msgType || 'unknown'}`, data);

                switch (msgType) {
                    case 'pong':
                        console.log('🏓 Received pong - connection confirmed');
                        setIsConnected(true);
                        setIsConnecting(false);
                        setConnectionError('');
                        setWsConnection(ws);
                        setConnectionInfo({
                            appId: '82255',
                            endpoint: 'wss://ws.derivws.com/websockets/v3',
                            status: 'Connected',
                            mode: 'Public Market Data',
                            connectedAt: new Date().toLocaleString(),
                        });

                        // Notify parent component
                        onConnectionChange(true, ws);

                        // Keep connection alive with periodic pings
                        const pingInterval = setInterval(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ ping: 1 }));
                            } else {
                                clearInterval(pingInterval);
                            }
                        }, 30000);
                        break;

                    case 'ping':
                        console.log('🏓 Received ping from server, sending pong');
                        ws.send(JSON.stringify({ pong: 1 }));
                        break;

                    case 'tick':
                        console.log('📊 Received tick data:', data.tick);
                        break;

                    default:
                        // Handle legacy format or unknown messages
                        if (data.pong) {
                            console.log('🏓 Received pong (legacy format) - connection confirmed');
                            setIsConnected(true);
                            setIsConnecting(false);
                            setConnectionError('');
                            setWsConnection(ws);
                            setConnectionInfo({
                                appId: '82255',
                                endpoint: 'wss://ws.derivws.com/websockets/v3',
                                status: 'Connected',
                                mode: 'Public Market Data',
                                connectedAt: new Date().toLocaleString(),
                            });
                            onConnectionChange(true, ws);
                        } else if (data.ping) {
                            console.log('🏓 Received ping (legacy format), sending pong');
                            ws.send(JSON.stringify({ pong: 1 }));
                        } else if (data.tick) {
                            console.log('📊 Received tick data (legacy format):', data.tick);
                        } else {
                            console.log(`📡 Unhandled message:`, data);
                        }
                        break;
                }
            };

            ws.onerror = error => {
                clearTimeout(connectionTimeout);
                console.error('❌ WebSocket error:', error);
                setConnectionError('Failed to connect to Deriv API');
                setIsConnecting(false);
                setIsConnected(false);
                onConnectionChange(false);
            };

            ws.onclose = event => {
                clearTimeout(connectionTimeout);
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                setIsConnected(false);
                setWsConnection(null);
                onConnectionChange(false);

                // Auto-reconnect after 5 seconds if not manually disconnected
                if (event.code !== 1000) {
                    setTimeout(() => {
                        console.log('🔄 Attempting to reconnect...');
                        connectToAPI();
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('❌ Connection failed:', error);
            setConnectionError('Connection failed: ' + (error as Error).message);
            setIsConnecting(false);
            setIsConnected(false);
            onConnectionChange(false);
        }
    };

    const handleReconnect = () => {
        if (wsConnection) {
            wsConnection.close();
        }
        connectToAPI();
    };

    const handleDisconnect = () => {
        if (wsConnection) {
            wsConnection.close();
        }
        setIsConnected(false);
        setWsConnection(null);
        setConnectionInfo(null);
        onConnectionChange(false);
    };

    return (
        <div className='deriv-api-connection'>
            <div className='connection-header'>
                <h3>🔌 Deriv API Connection</h3>
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                    <span className='status-indicator'></span>
                    <span className='status-text'>
                        {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {!isConnected ? (
                <div className='connection-form'>
                    <div className='connection-info-box'>
                        <h4>📡 Public Market Data Connection</h4>
                        <p>
                            Connecting to Deriv API using App ID <strong>82255</strong> for real-time market data
                            access. No authentication required for public market data.
                        </p>

                        <div className='features-list'>
                            <div className='feature-item'>
                                <span className='feature-icon'>📊</span>
                                <span>Real-time tick data</span>
                            </div>
                            <div className='feature-item'>
                                <span className='feature-icon'>🌍</span>
                                <span>All volatility markets</span>
                            </div>
                            <div className='feature-item'>
                                <span className='feature-icon'>⚡</span>
                                <span>High-frequency updates</span>
                            </div>
                            <div className='feature-item'>
                                <span className='feature-icon'>🔒</span>
                                <span>Secure WebSocket connection</span>
                            </div>
                        </div>

                        <div className='debug-info'>
                            <h5>🔍 Connection Debug Info:</h5>
                            <div className='debug-item'>
                                <span>Endpoint:</span>
                                <span>wss://ws.derivws.com/websockets/v3?app_id=68794</span>
                            </div>
                            <div className='debug-item'>
                                <span>Status:</span>
                                <span>{isConnecting ? 'Connecting...' : 'Ready to connect'}</span>
                            </div>
                            <div className='debug-item'>
                                <span>Browser WebSocket Support:</span>
                                <span>{typeof WebSocket !== 'undefined' ? '✅ Supported' : '❌ Not supported'}</span>
                            </div>
                        </div>
                    </div>

                    {connectionError && <div className='error-message'>⚠️ {connectionError}</div>}

                    <div className='connection-actions'>
                        <button onClick={handleReconnect} disabled={isConnecting} className='connect-btn'>
                            {isConnecting ? 'Connecting...' : 'Connect Now'}
                        </button>

                        <button
                            onClick={() => {
                                // Test WebSocket connection directly
                                console.log('🧪 Testing WebSocket connection...');
                                const testWs = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=68794');
                                testWs.onopen = () => {
                                    console.log('✅ Test connection successful');
                                    testWs.send(JSON.stringify({ ping: 1 }));
                                };
                                testWs.onmessage = event => {
                                    console.log('📡 Test message received:', JSON.parse(event.data));
                                    testWs.close();
                                };
                                testWs.onerror = error => {
                                    console.error('❌ Test connection failed:', error);
                                };
                            }}
                            className='test-btn'
                            disabled={isConnecting}
                        >
                            Test Connection
                        </button>
                    </div>
                </div>
            ) : (
                <div className='connection-info'>
                    <div className='connection-details'>
                        <h4>📊 Connection Information</h4>
                        <div className='connection-grid'>
                            <div className='connection-item'>
                                <span className='label'>App ID:</span>
                                <span className='value'>{connectionInfo?.appId}</span>
                            </div>
                            <div className='connection-item'>
                                <span className='label'>Status:</span>
                                <span className='value'>{connectionInfo?.status}</span>
                            </div>
                            <div className='connection-item'>
                                <span className='label'>Mode:</span>
                                <span className='value'>{connectionInfo?.mode}</span>
                            </div>
                            <div className='connection-item'>
                                <span className='label'>Connected At:</span>
                                <span className='value'>{connectionInfo?.connectedAt}</span>
                            </div>
                        </div>
                    </div>

                    <div className='connection-actions'>
                        <button onClick={handleReconnect} className='reconnect-btn'>
                            Reconnect
                        </button>
                        <button onClick={handleDisconnect} className='disconnect-btn'>
                            Disconnect
                        </button>
                        <div className='market-data-notice'>
                            <span className='market-badge'>MARKET DATA</span>
                            <span className='market-text'>Real-time market data streaming</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
