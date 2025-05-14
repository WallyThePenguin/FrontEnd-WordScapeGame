export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface QueueMessage extends WebSocketMessage {
  type: 'QUEUE_JOINED' | 'QUEUE_UPDATE' | 'QUEUE_MATCHED' | 'QUEUE_LEFT' | 'QUEUE_ERROR';
  gameId?: string;
  playersInQueue?: number;
  error?: string;
} 