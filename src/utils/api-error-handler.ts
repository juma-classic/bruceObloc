/**
 * API Error Handler
 * Handles and logs API errors, especially invalid symbol errors
 */

export interface APIError {
    code?: string;
    message?: string;
    echo_req?: any;
}

/**
 * Handle API errors and provide helpful debugging information
 */
export function handleAPIError(error: APIError, context: string = 'API call'): void {
    console.group(`❌ API Error in ${context}`);
    
    if (error.code === 'InvalidSymbol') {
        console.error('🚫 Invalid Symbol Error:', {
            message: error.message,
            requestedSymbol: error.echo_req?.ticks_history || error.echo_req?.ticks || 'unknown',
            request: error.echo_req
        });
        
        // Provide helpful suggestions
        console.info('💡 Suggestions:');
        console.info('   • Check if the symbol is correctly initialized');
        console.info('   • Verify the symbol exists in active_symbols');
        console.info('   • Use valid symbols like R_100, R_50, 1HZ100V, etc.');
        console.info('   • Check for undefined/null values being passed as symbols');
    } else {
        console.error('API Error:', {
            code: error.code,
            message: error.message,
            request: error.echo_req
        });
    }
    
    console.groupEnd();
}

/**
 * Monitor WebSocket messages for API errors
 */
export function setupAPIErrorMonitoring(): void {
    // Listen for global error events
    window.addEventListener('error', (event) => {
        if (event.error && typeof event.error === 'object') {
            const error = event.error;
            if (error.code === 'InvalidSymbol' || (error.message && error.message.includes('Symbol na is invalid'))) {
                handleAPIError(error, 'Global Error Handler');
            }
        }
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && typeof event.reason === 'object') {
            const error = event.reason;
            if (error.code === 'InvalidSymbol' || (error.message && error.message.includes('Symbol na is invalid'))) {
                handleAPIError(error, 'Unhandled Promise Rejection');
                event.preventDefault(); // Prevent the error from being logged to console again
            }
        }
    });

    console.log('✅ API Error Monitoring initialized');
}

/**
 * Create a wrapper for WebSocket send to validate symbols
 */
export function createSafeWebSocketSend(originalSend: (data: string) => void) {
    return function safeSend(data: string) {
        try {
            const parsedData = JSON.parse(data);
            
            // Check for invalid symbols in common API calls
            if (parsedData.ticks_history && (
                !parsedData.ticks_history || 
                parsedData.ticks_history === 'na' || 
                parsedData.ticks_history === 'undefined' ||
                parsedData.ticks_history === 'null'
            )) {
                console.error('🚫 Blocked invalid ticks_history request:', parsedData);
                return;
            }
            
            if (parsedData.ticks && (
                !parsedData.ticks || 
                parsedData.ticks === 'na' || 
                parsedData.ticks === 'undefined' ||
                parsedData.ticks === 'null'
            )) {
                console.error('🚫 Blocked invalid ticks subscription:', parsedData);
                return;
            }
            
            // If validation passes, send the original data
            originalSend.call(this, data);
        } catch (error) {
            // If parsing fails, send as-is (might be a non-JSON message)
            originalSend.call(this, data);
        }
    };
}