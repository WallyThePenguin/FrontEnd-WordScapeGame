const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://validtesting.tplinkdns.com:3000/ws';

const logger = {
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[WebSocket] ${message}`, data ? data : '')
        }
    },
    error: (message: string, error?: any) => {
        console.error(`[WebSocket Error] ${message}`, error ? error : '')
    }
}

export function createWebSocket(userId: string) {
    if (!userId) {
        logger.error("Cannot create WebSocket: No user ID provided")
        throw new Error("User ID is required for WebSocket connection")
    }

    try {
        const url = `${WS_URL}?userId=${userId}`
        logger.debug("Connecting to WebSocket", { url })
        const ws = new WebSocket(url);
        
        ws.onerror = (error) => {
            logger.error("WebSocket connection error", error)
        }

        return ws;
    } catch (error) {
        logger.error("Failed to create WebSocket", error)
        throw error
    }
} 