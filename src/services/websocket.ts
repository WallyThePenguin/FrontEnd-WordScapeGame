import { apiConfig } from '../config/api';
import { createWebSocket, sendWebSocketMessage } from '../utils/websocket';

// WebSocket message types
export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

// Game events
export type GameEvent = {
  type: 'GAME_START' | 'GAME_END' | 'OPPONENT_SUBMITTED' | 'WORD_SUBMISSION_RESULT' | 'COMBO_BONUS' | 'COMBO_RESET';
  gameId: string;
  [key: string]: any;
};

// Practice events
export type PracticeEvent = {
  type: 'PRACTICE_STARTED' | 'PRACTICE_LETTERS_UPDATED' | 'PRACTICE_WORD_RESULT' | 'PRACTICE_ENDED';
  [key: string]: any;
};

// Friend events
export type FriendEvent = {
  type: 'FRIEND_INVITE_RECEIVED' | 'FRIEND_INVITE_ACCEPTED' | 'FRIEND_INVITE_EXPIRED';
  fromUserId?: string;
  toUserId?: string;
};

// Queue events
export type QueueEvent = {
  type: 'QUEUE_JOINED' | 'QUEUE_UPDATE' | 'QUEUE_MATCHED' | 'QUEUE_LEFT' | 'QUEUE_ERROR';
  gameId?: string;
  playersInQueue?: number;
  error?: string;
  [key: string]: any;
};

// WebSocket service
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const user = localStorage.getItem('user');
    if (!user) {
      console.error('No user data found for WebSocket connection');
      return;
    }

    const { id } = JSON.parse(user);
    if (!id) {
      console.error('No user ID found for WebSocket connection');
      return;
    }

    this.ws = createWebSocket();
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        const handlers = this.messageHandlers.get(message.type) || [];
        handlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  // Subscribe to specific message types
  on(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  // Unsubscribe from specific message types
  off(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(type, handlers);
    }
  }

  // Send messages
  send(message: WebSocketMessage) {
    sendWebSocketMessage(this.ws, message);
  }

  // Game actions
  joinQueue() {
    this.send({ type: 'JOIN_QUEUE' });
  }

  submitWord(gameId: string, word: string) {
    this.send({
      type: 'SUBMIT_WORD',
      gameId,
      word,
    });
  }

  startPractice() {
    this.send({ type: 'START_PRACTICE' });
  }

  submitPracticeWord(word: string) {
    this.send({
      type: 'SUBMIT_PRACTICE_WORD',
      word,
    });
  }

  endPractice() {
    this.send({ type: 'PRACTICE_END' });
  }

  sendFriendInvite(toUserId: string) {
    this.send({
      type: 'FRIEND_INVITE',
      toUserId,
    });
  }

  acceptFriendInvite(fromUserId: string) {
    this.send({
      type: 'FRIEND_INVITE_ACCEPTED',
      fromUserId,
    });
  }

  leaveQueue() {
    this.send({ type: 'LEAVE_QUEUE' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create a singleton instance
export const wsService = new WebSocketService(); 