export interface WebSocketMessage {
    type: string;
    gameId?: string;
    [key: string]: any;
}

export interface WebSocketHandlers {
    onMessage: (message: WebSocketMessage) => void;
    onError: (error: Error) => void;
    onClose?: () => void;
    onOpen?: () => void;
} 