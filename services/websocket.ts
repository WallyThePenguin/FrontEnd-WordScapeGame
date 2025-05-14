import { createWebSocket } from "@/utils/websocket"

// WebSocket Message Types
export interface WebSocketMessage {
    type: string
    userId: string
    payload?: any
}

// WebSocket Event Handlers
export interface WebSocketHandlers {
    onConnect?: () => void
    onDisconnect?: () => void
    onError?: (error: Error) => void
    onMessage?: (message: any) => void
}

// Connection states
type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

class WebSocketService {
    private ws: WebSocket | null = null
    private handlers: WebSocketHandlers = {}
    private userId: string | null = null
    private connectionState: ConnectionState = 'DISCONNECTED'
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectTimeout: NodeJS.Timeout | null = null
    private keepAliveInterval: NodeJS.Timeout | null = null
    private pendingMessages: Array<{type: string, payload?: any}> = []
    private lastConnectionAttempt = 0
    private connectionQueue: Array<() => void> = []
    private isProcessingQueue = false
    private messageDebounceTimers: {[key: string]: NodeJS.Timeout} = {} // Track debounced message handlers
    private lastMessageByType: {[key: string]: number} = {} // Track last message time by type
    private lastMessagesByType: {[key: string]: any} = {} // Store last message of each type for content comparison

    constructor(handlers: WebSocketHandlers = {}) {
        this.handlers = handlers
        // Listen for window events to handle connection lifecycle
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleNetworkChange)
            window.addEventListener('offline', this.handleNetworkChange)
            window.addEventListener('beforeunload', this.cleanup)
        }
    }

    connect(userId: string) {
        // Don't reconnect if already connected with the same user
        if (this.ws?.readyState === WebSocket.OPEN && this.userId === userId) {
            console.log('WebSocket already connected')
            return
        }

        // Prevent rapid reconnection attempts
        const now = Date.now();
        if (now - this.lastConnectionAttempt < 300) {
            console.log('Throttling connection attempts');
            // Queue this connection attempt
            this.queueConnectionAttempt(() => this.connect(userId));
            return;
        }

        this.lastConnectionAttempt = now;
        
        // Clean up any existing connection
        this.cleanup()
        
        this.userId = userId
        this.connectionState = 'CONNECTING'
        this.establishConnection()
    }

    private queueConnectionAttempt(attempt: () => void) {
        this.connectionQueue.push(attempt);
        
        // Process queue if not already processing
        if (!this.isProcessingQueue) {
            this.processConnectionQueue();
        }
    }
    
    private processConnectionQueue() {
        if (this.connectionQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        
        // Execute next attempt after a small delay
        setTimeout(() => {
            const nextAttempt = this.connectionQueue.shift();
            if (nextAttempt) {
                nextAttempt();
            }
            
            // Process remaining queue
            this.processConnectionQueue();
        }, 300);
    }

    private establishConnection() {
        try {
            console.log(`Establishing WebSocket connection (attempt ${this.reconnectAttempts + 1})`)
            this.ws = createWebSocket(this.userId!)
            
            // Set a connection timeout
            const connectionTimeout = setTimeout(() => {
                if (this.connectionState === 'CONNECTING') {
                    console.log('WebSocket connection timeout');
                    // Clean up this socket attempt
                    if (this.ws) {
                        this.ws.onopen = null;
                        this.ws.onclose = null;
                        this.ws.onerror = null;
                        this.ws.onmessage = null;
                        this.ws.close();
                        this.ws = null;
                    }
                    this.handleReconnect();
                }
            }, 5000); // 5 second timeout
            
            this.setupEventListeners()
            
            // Clear timeout when event listeners are set up
            clearTimeout(connectionTimeout);
        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error)
            this.handleReconnect()
        }
    }

    private setupEventListeners() {
        if (!this.ws) return

        this.ws.onopen = () => {
            console.log('WebSocket connection established')
            this.connectionState = 'CONNECTED'
            this.reconnectAttempts = 0
            this.handlers.onConnect?.()
            
            // Set up keep-alive interval
            this.setupKeepAlive()
            
            // Send any pending messages
            this.processPendingMessages()
        }

        this.ws.onclose = (event) => {
            console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`)
            this.connectionState = 'DISCONNECTED'
            this.clearKeepAlive()
            this.handlers.onDisconnect?.()
            
            // Only attempt to reconnect if it wasn't a clean close
            if (event.code !== 1000) {
                this.handleReconnect()
            }
        }

        this.ws.onerror = (error) => {
            console.error('WebSocket connection error:', error)
            this.handlers.onError?.(new Error("Connection failed"))
            
            // Don't reconnect here - the onclose handler will be called next
        }

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)
                
                // Track message receipt time
                if (message.type) {
                    this.lastMessageByType[message.type] = Date.now();
                    // Also track the full message for content comparison
                    this.trackMessage(message);
                }
                
                // Handle messages with proper debouncing
                this.processMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error)
                this.handlers.onError?.(new Error("Failed to parse message"))
            }
        }
    }

    // Improve message processing to handle priorities better
    private processMessage(message: any) {
        // First determine if this is a high priority message
        const isHighPriority = this.isHighPriorityMessage(message);
        
        // For high priority messages, deliver immediately
        if (isHighPriority) {
            console.log(`Processing high priority message type: ${message.type || 'unknown'}`);
            // Clear any pending debounced messages of this type to avoid stale updates
            const messageType = message.type || 'unknown';
            if (this.messageDebounceTimers[messageType]) {
                clearTimeout(this.messageDebounceTimers[messageType]);
                delete this.messageDebounceTimers[messageType];
            }
            
            // Process this message immediately
            this.handlers.onMessage?.(message);
            return;
        }
        
        // For non-priority messages, debounce by type
        const messageType = message.type || 'unknown';
        
        // Clear existing timer for this type
        if (this.messageDebounceTimers[messageType]) {
            clearTimeout(this.messageDebounceTimers[messageType]);
        }
        
        // Set new timer (50ms debounce for most messages)
        this.messageDebounceTimers[messageType] = setTimeout(() => {
            console.log(`Processing debounced message type: ${messageType}`);
            this.handlers.onMessage?.(message);
            delete this.messageDebounceTimers[messageType];
        }, 50);
    }
    
    // Improve high priority message detection
    private isHighPriorityMessage(message: any): boolean {
        const type = message.type || '';
        const payload = message.payload || message;
        
        // Check both message.type and message.payload.type
        const messageType = type || (payload && payload.type) || '';
        
        // Critical message types that should never be debounced
        const highPriorityTypes = [
            'GAME_STARTED', 
            'GAME_ENDED', 
            'WORD_SUBMISSION_RESULT',
            'OPPONENT_SCORED',
            'OPPONENT_DISCONNECTED',
            'OPPONENT_RECONNECTED',
            'OPPONENT_JOINED'
        ];
        
        // Check if this is a high priority message type
        if (highPriorityTypes.includes(messageType)) {
            return true;
        }
        
        // Detect if message contains state changes that are always important
        if (payload) {
            // If message updates letters, it's high priority
            if (payload.letters) return true;
            
            // If message includes score changes, it's high priority
            if (payload.score !== undefined || payload.opponentScore !== undefined) return true;
            
            // If message includes found words, it's high priority
            if (Array.isArray(payload.foundWords) || Array.isArray(payload.opponentWords)) {
                // Additional check: if the array has new words compared to what we've seen before,
                // it's definitely high priority
                if (this.hasNewArrayContent(payload)) {
                    return true;
                }
            }
            
            // If game status changes, it's high priority
            if (payload.gameStatus) return true;
        }
        
        // Default to standard priority
        return false;
    }
    
    // Helper to detect if new message has new array content
    private hasNewArrayContent(payload: any): boolean {
        const lastMessage = this.getLastMessageOfType(payload.type);
        if (!lastMessage) return true; // If no previous message, treat as new content
        
        // Check known array fields
        const arrayFields = ['foundWords', 'opponentWords'];
        
        for (const field of arrayFields) {
            if (Array.isArray(payload[field])) {
                // If this field exists in both current and last message
                if (lastMessage[field] && Array.isArray(lastMessage[field])) {
                    // If new array is longer, there's new content
                    if (payload[field].length > lastMessage[field].length) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    // Store last message of each type to help detect new content
    private getLastMessageOfType(type: string): any {
        return this.lastMessagesByType[type];
    }
    
    // Update message tracking when we receive a message
    private trackMessage(message: any) {
        if (message && message.type) {
            // Store this message by type
            this.lastMessagesByType[message.type] = message;
        }
    }

    private handleReconnect() {
        if (this.connectionState === 'RECONNECTING') return
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximum reconnection attempts reached')
            return
        }
        
        this.connectionState = 'RECONNECTING'
        this.reconnectAttempts++
        
        // More aggressive backoff for first few attempts
        const backoffTime = this.reconnectAttempts <= 2 
            ? 500 * this.reconnectAttempts  // 500ms, 1000ms for first two attempts
            : Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 2), 15000); // Slower ramp-up after
        
        console.log(`Attempting to reconnect in ${backoffTime}ms`)
        
        this.reconnectTimeout = setTimeout(() => {
            this.establishConnection()
        }, backoffTime)
    }

    private handleNetworkChange = () => {
        if (navigator.onLine && this.connectionState !== 'CONNECTED' && this.userId) {
            console.log('Network connection restored, reconnecting WebSocket')
            this.reconnectAttempts = 0
            this.establishConnection()
        }
    }

    private setupKeepAlive() {
        this.clearKeepAlive()
        // Send a ping every 30 seconds to keep the connection alive
        this.keepAliveInterval = setInterval(() => {
            this.send('PING')
        }, 30000)
    }

    private clearKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval)
            this.keepAliveInterval = null
        }
    }

    private processPendingMessages() {
        if (this.pendingMessages.length > 0) {
            console.log(`Processing ${this.pendingMessages.length} pending messages`)
            const messages = [...this.pendingMessages]
            this.pendingMessages = []
            
            messages.forEach(msg => {
                this.send(msg.type, msg.payload)
            })
        }
    }

    private cleanup = () => {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }
        
        this.clearKeepAlive()
        
        if (this.ws) {
            // Remove all event listeners to prevent memory leaks
            this.ws.onopen = null
            this.ws.onclose = null
            this.ws.onerror = null
            this.ws.onmessage = null
            
            // Close the connection if it's still open
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close(1000, 'Normal closure')
            }
            
            this.ws = null
        }
    }

    disconnect() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleNetworkChange)
            window.removeEventListener('offline', this.handleNetworkChange)
            window.removeEventListener('beforeunload', this.cleanup)
        }
        
        this.cleanup()
        this.userId = null
        this.connectionState = 'DISCONNECTED'
        this.pendingMessages = []
    }

    setHandlers(handlers: WebSocketHandlers) {
        this.handlers = { ...this.handlers, ...handlers }
    }

    isConnected() {
        return this.connectionState === 'CONNECTED'
    }

    send(type: string, payload?: any) {
        if (!this.userId) {
            console.error('Cannot send message: No user ID')
            return false
        }

        // If not connected, queue the message for later
        if (this.connectionState !== 'CONNECTED' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log(`WebSocket not connected, queueing message: ${type}`)
            this.pendingMessages.push({ type, payload })
            
            // Try to reconnect if we're in a disconnected state
            if (this.connectionState === 'DISCONNECTED' && this.userId) {
                this.reconnectAttempts = 0
                this.establishConnection()
            }
            
            return false
        }

        try {
            // Check if the payload already contains a type field - if so, just use it directly
            // to avoid nested payloads
            let message: WebSocketMessage;
            
            if (payload && payload.type === type) {
                // The payload already has the right type, just add userId
                message = {
                    ...payload,
                    userId: this.userId
                };
            } else {
                // Standard format with payload wrapped
                message = {
                    type,
                    userId: this.userId,
                    ...(payload && { payload })
                };
            }
            
            console.log('Sending WebSocket message:', JSON.stringify(message))
            this.ws.send(JSON.stringify(message))
            return true
        } catch (error) {
            console.error('Failed to send WebSocket message:', error)
            return false
        }
    }
}

// Create and export a singleton instance
export const wsService = new WebSocketService() 