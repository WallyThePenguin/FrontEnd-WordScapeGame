import { apiFetch } from "@/utils/api"

// API Response Types
export interface ApiResponse<T> {
    data: T
    error?: string
    status: number
}

export interface AuthResponse {
    user: {
        id: string
        username: string
        email: string
        dailyStreak: number
        lastLogin: string | null
        winStreak: number
        totalWins: number
        totalLosses: number
        createdAt: string
        updatedAt: string
    }
    accessToken: string
    refreshToken: string
}

// Type definitions for Prisma schema objects
export interface Game {
    id: string
    status: 'PENDING' | 'ACTIVE' | 'FINISHED'
    letters: string
    endsAt: string
    playerOneId?: string
    playerTwoId?: string
    winnerId?: string
    createdAt: string
}

export interface WordSubmission {
    id: string
    gameId: string
    word: string
    score: number
    createdAt: string
}

export interface PracticeStat {
    id: string
    bestScore: number
    totalPlays: number
}

export interface Friendship {
    id: string
    userId?: string
    friendId?: string
    status: 'PENDING' | 'ACCEPTED'
    createdAt: string
}

export interface User {
    id: string
    username: string
    email: string
    dailyStreak: number
    lastLogin: string | null
    winStreak: number
    totalWins: number
    totalLosses: number
    createdAt: string
    updatedAt: string
    gamesAsPlayerOne?: Game[]
    gamesAsPlayerTwo?: Game[]
    gamesWon?: Game[]
    wordSubmissions?: WordSubmission[]
    practiceStats?: PracticeStat
    friendships?: Friendship[]
    friendsWithMe?: Friendship[]
}

// API Error class
export class ApiError extends Error {
    constructor(
        public status: number,
        public message: string,
        public data?: any
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

// Logger utility
const logger = {
    info: (message: string, data?: any) => {
        console.log(`[API Info] ${message}`, data ? data : '')
    },
    error: (message: string, error?: any) => {
        console.error(`[API Error] ${message}`, error ? error : '')
    },
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[API Debug] ${message}`, data ? data : '')
        }
    }
}

// Base API class
class BaseApi {
    protected async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        try {
            logger.debug(`Making request to ${endpoint}`, { options })
            
            const response = await apiFetch<T>(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            })

            logger.debug(`Received response from ${endpoint}`, { response })

            if (!response) {
                logger.error(`No response from ${endpoint}`)
                throw new ApiError(500, 'No response from server')
            }

            // The response is already processed by apiFetch, so we can return it directly
            return response
        } catch (error) {
            if (error instanceof ApiError) {
                throw error
            }
            if (error instanceof Error) {
                logger.error(`Unexpected error in ${endpoint}`, error)
                throw new ApiError(500, error.message)
            }
            logger.error(`Unknown error in ${endpoint}`, error)
            throw new ApiError(500, 'An unexpected error occurred')
        }
    }
}

// Auth API
class AuthApi extends BaseApi {
    async login(email: string, password: string): Promise<AuthResponse['user']> {
        try {
            logger.info('Attempting login', { email })
            
            const response = await this.request<AuthResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            logger.debug('Login response received', { 
                user: response.user,
                hasAccessToken: !!response.accessToken,
                hasRefreshToken: !!response.refreshToken
            })

            // Store the tokens
            if (response.accessToken) {
                localStorage.setItem('accessToken', response.accessToken)
                logger.debug('Access token stored')
            }
            if (response.refreshToken) {
                localStorage.setItem('refreshToken', response.refreshToken)
                logger.debug('Refresh token stored')
            }

            // Validate the user data
            if (!this.validateAuthUser(response.user)) {
                logger.error('Invalid user data received', response.user)
                throw new ApiError(400, 'Invalid user data received from server')
            }

            logger.info('Login successful', { username: response.user.username })
            return response.user
        } catch (error) {
            if (error instanceof ApiError) {
                logger.error('Login failed with API error', error)
                throw error
            }
            logger.error('Login failed with unexpected error', error)
            throw new ApiError(500, 'Failed to login. Please try again.')
        }
    }

    async register(username: string, email: string, password: string): Promise<AuthResponse['user']> {
        try {
            logger.info('Attempting registration', { username, email })
            
            const response = await this.request<AuthResponse>('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            logger.debug('Registration response received', { 
                user: response.user,
                hasAccessToken: !!response.accessToken,
                hasRefreshToken: !!response.refreshToken
            })

            // Store the tokens
            if (response.accessToken) {
                localStorage.setItem('accessToken', response.accessToken)
                logger.debug('Access token stored')
            }
            if (response.refreshToken) {
                localStorage.setItem('refreshToken', response.refreshToken)
                logger.debug('Refresh token stored')
            }

            // Validate the user data
            if (!this.validateAuthUser(response.user)) {
                logger.error('Invalid user data received', response.user)
                throw new ApiError(400, 'Invalid user data received from server')
            }

            logger.info('Registration successful', { username: response.user.username })
            return response.user
        } catch (error) {
            if (error instanceof ApiError) {
                logger.error('Registration failed with API error', error)
                throw error
            }
            if (error instanceof Error) {
                // Check for specific error messages
                if (error.message.includes('User already exists')) {
                    throw new ApiError(409, 'A user with this email or username already exists')
                }
                logger.error('Registration failed with unexpected error', error)
                throw new ApiError(500, 'Failed to register. Please try again.')
            }
            logger.error('Registration failed with unknown error', error)
            throw new ApiError(500, 'Failed to register. Please try again.')
        }
    }

    async logout(): Promise<void> {
        try {
            logger.info('Attempting logout')
            
            await this.request('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            // Remove the tokens on logout
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            logger.info('Logout successful - tokens removed')
        } catch (error) {
            if (error instanceof ApiError) {
                logger.error('Logout failed with API error', error)
                throw error
            }
            logger.error('Logout failed with unexpected error', error)
            throw new ApiError(500, 'Failed to logout. Please try again.')
        }
    }

    private validateAuthUser(user: AuthResponse['user']): boolean {
        logger.debug('Validating user data', user)

        // Basic validation for required fields
        if (!user || typeof user !== 'object') {
            logger.error('User is not an object', user)
            return false
        }

        // Check required string fields
        if (!user.id || typeof user.id !== 'string') {
            logger.error('Invalid user id', user.id)
            return false
        }

        if (!user.username || typeof user.username !== 'string') {
            logger.error('Invalid username', user.username)
            return false
        }

        if (!user.email || typeof user.email !== 'string') {
            logger.error('Invalid email', user.email)
            return false
        }

        // Check required number fields
        if (typeof user.dailyStreak !== 'number') {
            logger.error('Invalid dailyStreak', user.dailyStreak)
            return false
        }

        if (typeof user.winStreak !== 'number') {
            logger.error('Invalid winStreak', user.winStreak)
            return false
        }

        if (typeof user.totalWins !== 'number') {
            logger.error('Invalid totalWins', user.totalWins)
            return false
        }

        if (typeof user.totalLosses !== 'number') {
            logger.error('Invalid totalLosses', user.totalLosses)
            return false
        }

        // Check date fields
        if (!user.createdAt || typeof user.createdAt !== 'string') {
            logger.error('Invalid createdAt', user.createdAt)
            return false
        }

        if (!user.updatedAt || typeof user.updatedAt !== 'string') {
            logger.error('Invalid updatedAt', user.updatedAt)
            return false
        }

        logger.debug('User data validation successful')
        return true
    }
}

// Game API
class GameApi extends BaseApi {
    async createGame(mode: 'casual', playerId: string): Promise<Game> {
        return this.request<Game>('/games/create', {
            method: 'POST',
            body: JSON.stringify({
                mode,
                playerOneId: playerId,
            }),
        })
    }

    async getGame(id: string): Promise<Game> {
        return this.request<Game>(`/games/${id}`)
    }

    async submitWord(gameId: string, word: string): Promise<WordSubmission> {
        return this.request<WordSubmission>(`/games/${gameId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ 
                word,
                userId: JSON.parse(localStorage.getItem('user') || '{}').id 
            }),
        })
    }
}

// User API
class UserApi extends BaseApi {
    async getProfile(): Promise<User> {
        return this.request<User>('/users/profile')
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        return this.request<User>('/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    }

    async getFriends(): Promise<Friendship[]> {
        return this.request<Friendship[]>('/users/friends')
    }

    async sendFriendRequest(friendId: string): Promise<Friendship> {
        return this.request<Friendship>('/users/friends', {
            method: 'POST',
            body: JSON.stringify({ friendId }),
        })
    }
}

// Export API instances
export const authApi = new AuthApi()
export const gameApi = new GameApi()
export const userApi = new UserApi() 