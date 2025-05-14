import { apiFetch } from '../utils/api';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  dailyStreak: number;
  lastLogin: string | null;
  winStreak: number;
  totalWins: number;
  totalLosses: number;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'FINISHED';
  letters: string;
  endsAt: string;
  playerOneId?: string;
  playerTwoId?: string;
  winnerId?: string;
  createdAt: string;
}

export interface WordSubmission {
  id: string;
  gameId: string;
  word: string;
  score: number;
  createdAt: string;
}

export interface PracticeStat {
  id: string;
  bestScore: number;
  totalPlays: number;
}

export interface Friendship {
  id: string;
  userId?: string;
  friendId?: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string) =>
    apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
};

// Game API
export const gameApi = {
  createGame: (playerOneId: string, playerTwoId: string, letters: string) =>
    apiFetch<Game>('/games/create', {
      method: 'POST',
      body: JSON.stringify({ playerOneId, playerTwoId, letters }),
    }),

  submitWord: (gameId: string, userId: string, word: string) =>
    apiFetch<WordSubmission>(`/games/${gameId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ userId, word }),
    }),

  getGameHistory: (userId: string) =>
    apiFetch<Game[]>(`/data/user/${userId}/history`),
};

// Practice API
export const practiceApi = {
  startPractice: () =>
    apiFetch<{ letters: string }>('/practice/start', {
      method: 'POST',
    }),

  submitPracticeWord: (word: string) =>
    apiFetch<{
      success: boolean;
      word: string;
      baseScore: number;
      bonusScore: number;
      totalScore: number;
      comboLevel: number;
      finalScore: number;
    }>('/practice/submit', {
      method: 'POST',
      body: JSON.stringify({ word }),
    }),

  endPractice: () =>
    apiFetch<{
      success: boolean;
      finalScore: number;
      newBest: boolean;
    }>('/practice/end', {
      method: 'POST',
    }),
};

// Friend API
export const friendApi = {
  sendFriendRequest: (userId: string, friendId: string) =>
    apiFetch<{ message: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId, friendId }),
    }),

  acceptFriendRequest: (userId: string, friendId: string) =>
    apiFetch<{ message: string }>('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ userId, friendId }),
    }),

  getFriends: (userId: string) =>
    apiFetch<Friendship[]>(`/data/user/${userId}/friends`),
};

// User API
export const userApi = {
  getProfile: (userId: string) =>
    apiFetch<User>(`/data/user/${userId}`),

  getPracticeStats: (userId: string) =>
    apiFetch<PracticeStat>(`/data/user/${userId}/practice-stats`),
};

// Leaderboard API
export const leaderboardApi = {
  getGlobalLeaderboard: () =>
    apiFetch<{
      users: Array<{
        id: string;
        username: string;
        totalWins: number;
        totalLosses: number;
        winStreak: number;
      }>;
    }>('/leaderboard/global'),

  getFriendsLeaderboard: () =>
    apiFetch<{
      users: Array<{
        id: string;
        username: string;
        totalWins: number;
        totalLosses: number;
        winStreak: number;
      }>;
    }>('/leaderboard/friends'),
}; 