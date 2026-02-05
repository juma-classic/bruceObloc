import { useState, useEffect, useRef } from 'react';

interface UseWebSocketReturn {
    socket: WebSocket | null;
    connectionStatus: 'Connecting' | 'Connected' | 'Disconnected' | 'Error';
    sendMessage: (message: any) => void;
    lastMessage: any;
}

export const useWebSocket = (url: string, token?: string): UseWebSocketReturn => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Connected' | 'Disconnected' | 'Error'>('Disconnected');
    const [lastMessage, setLastMessage] = useState<any>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = () => {
        try {
            setConnectionStatus('Connecting');
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('WebSocket connected');
                setConnectionStatus('Connected');
                reconnectAttempts.current = 0;

                // Send authorization if token is provided
                if (token) {
                    ws.send(JSON.stringify({
                        authorize: token,
                    }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setConnectionStatus('Disconnected');
                setSocket(null);

                // Only attempt to reconnect for certain error codes and if not too many attempts
                const shouldReconnect = event.code !== 1000 && // Not a normal close
                                      event.code !== 1001 && // Not going away
                                      event.code !== 1005 && // No status code
                                      reconnectAttempts.current < maxReconnectAttempts;

                if (shouldReconnect) {
                    const timeout = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000); // Cap at 30 seconds
                    reconnectAttempts.current++;
                    
                    console.log(`Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts.current})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, timeout);
                } else {
                    console.log('Max reconnection attempts reached or connection closed normally');
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionStatus('Error');
            };

            setSocket(ws);
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            setConnectionStatus('Error');
        }
    };

    const sendMessage = (message: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', message);
        }
    };

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socket) {
                socket.close(1000, 'Component unmounting');
            }
        };
    }, [url]);

    // Reconnect when token changes
    useEffect(() => {
        if (socket && socket.readyState === WebSocket.OPEN && token) {
            socket.send(JSON.stringify({
                authorize: token,
            }));
        }
    }, [token, socket]);

    return {
        socket,
        connectionStatus,
        sendMessage,
        lastMessage,
    };
};