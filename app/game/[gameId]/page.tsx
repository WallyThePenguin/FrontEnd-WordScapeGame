"use client"

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Settings, Trophy, User, RefreshCw, RotateCw, Delete, Send, Power, AlertTriangle } from "lucide-react"
import { wsService } from "@/services/websocket"
import type { WebSocketMessage } from "@/types/websocket"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface GameState {
    gameId: string
    letters: string[]
    currentWord: string[]
    foundWords: string[]
    opponentWords: string[]
    score: number
    opponentScore: number
    timeRemaining: string
    possibleWords: number
    gameStatus: 'PENDING' | 'ACTIVE' | 'FINISHED'
    winner: string | null
    opponentName: string
    opponentConnected: boolean
    lastOpponentWord: {
        word: string;
        timestamp: number;
    } | null
}

// Add a debug mode for development
const DEBUG_MODE = true;

// Add memoized PlayerWordList component
const PlayerWordList = memo(({ words, newWord }: { words: string[], newWord: string | null }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {words.length === 0 ? (
                <p className="text-white/50 text-sm">No words found yet</p>
            ) : (
                words.map((word, i) => (
                    <span
                        key={`word-${i}-${word}`}
                        className={cn(
                            "rounded px-2 py-1 text-sm text-white",
                            word === newWord
                                ? "bg-green-500/60 animate-pulse"
                                : "bg-white/10"
                        )}
                    >
                        {word}
                    </span>
                ))
            )}
        </div>
    );
});

// Add memoized OpponentWordList component
const OpponentWordList = memo(({ words, highlightedWord }: { words: string[], highlightedWord: string | null }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {words.length === 0 ? (
                <p className="text-white/50 text-sm">No words found yet</p>
            ) : (
                words.map((word, i) => (
                    <span
                        key={`opponent-word-${i}-${word}`}
                        className={`${word === highlightedWord
                            ? 'bg-red-400/30 animate-pulse border border-red-400'
                            : 'bg-white/10'
                            } rounded px-2 py-1 text-sm text-white transition-all`}
                    >
                        {word}
                    </span>
                ))
            )}
        </div>
    );
});

// Add memoized GameBoard component
const GameBoard = memo(({ letters, onLetterClick, isShaking, gameStatus, isConnected }: {
    letters: string[],
    onLetterClick: (letter: string) => void,
    isShaking: boolean,
    gameStatus: string,
    isConnected: boolean
}) => {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center mb-4">
            {letters.map((letter, i) => {
                const angle = (i / letters.length) * 2 * Math.PI;
                const radius = 110;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                    <button
                        key={`letter-${i}-${letter}-${gameStatus}`}
                        className="absolute w-14 h-14 flex items-center justify-center rounded-full bg-white/80 text-2xl font-bold text-blue-700 shadow-lg hover:bg-blue-200 transition-all"
                        style={{
                            left: `calc(50% + ${x}px - 1.75rem)`,
                            top: `calc(50% + ${y}px - 1.75rem)`,
                            transform: isShaking ? 'scale(0.98)' : 'scale(1)',
                            transition: 'left 0.3s ease-out, top 0.3s ease-out, transform 0.2s'
                        }}
                        onClick={() => onLetterClick(letter)}
                        disabled={!isConnected || gameStatus !== 'ACTIVE'}
                    >
                        {letter}
                    </button>
                );
            })}
        </div>
    );
});

// Add memoized ScoreDisplay component
const ScoreDisplay = memo(({
    playerScore,
    opponentScore,
    scoreHighlight,
    opponentScoreHighlight,
    opponentName,
    isOpponentConnected,
    timeRemaining
}: {
    playerScore: number,
    opponentScore: number,
    scoreHighlight: boolean,
    opponentScoreHighlight: boolean,
    opponentName: string,
    isOpponentConnected: boolean,
    timeRemaining: string
}) => {
    return (
        <div className="flex items-center justify-between px-8 pt-6 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="text-base text-white">
                    You: <span className={cn(
                        "font-bold",
                        scoreHighlight && "text-green-300 animate-pulse"
                    )}>
                        {playerScore}
                    </span>
                </div>
            </div>
            <div className="text-center flex flex-col items-center">
                <div className="text-xl font-mono text-white bg-purple-500/80 px-4 py-1 rounded-xl mb-1">
                    {timeRemaining}
                </div>

                {/* Score comparison indicator */}
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                    {playerScore > opponentScore ? (
                        <span className="text-xs text-green-400 font-bold">You're winning by {playerScore - opponentScore}</span>
                    ) : playerScore < opponentScore ? (
                        <span className="text-xs text-red-400 font-bold">Behind by {opponentScore - playerScore}</span>
                    ) : (
                        <span className="text-xs text-yellow-400 font-bold">Tied</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-base text-white text-right">
                    {opponentName}: <span className={cn(
                        "font-bold",
                        opponentScoreHighlight && "text-red-300 animate-pulse"
                    )}>
                        {opponentScore}
                    </span>
                </div>
                <div className={`w-3 h-3 rounded-full ${isOpponentConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            </div>
        </div>
    );
});

export default function GamePage() {
    // Get gameId using useParams hook to avoid the error
    const params = useParams()
    const gameId = params.gameId as string

    const router = useRouter()
    const { toast } = useToast()
    const [error, setError] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isShaking, setIsShaking] = useState(false)
    const [newEnemyWord, setNewEnemyWord] = useState<string | null>(null)
    // Track when we started loading
    const startTime = Date.now();
    const [gameState, setGameState] = useState<GameState>({
        gameId: gameId,
        letters: [],
        currentWord: [],
        foundWords: [],
        opponentWords: [],
        score: 0,
        opponentScore: 0,
        timeRemaining: "00:00",
        possibleWords: 0,
        gameStatus: 'PENDING',
        winner: null,
        opponentName: "Opponent",
        opponentConnected: false,
        lastOpponentWord: null
    })

    const [isReconnecting, setIsReconnecting] = useState(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const lastStateUpdate = useRef(Date.now());

    // State update tracking refs
    const pendingStateUpdates = useRef<Partial<GameState>[]>([]);
    const isUpdatingState = useRef(false);

    const [scoreHighlight, setScoreHighlight] = useState(false);
    const [opponentScoreHighlight, setOpponentScoreHighlight] = useState(false);
    const [newWord, setNewWord] = useState<string | null>(null);

    // Add connection timeout tracking
    const [connectionStartTime] = useState(Date.now());
    const [isJoining, setIsJoining] = useState(true);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const joinAttemptRef = useRef<NodeJS.Timeout | null>(null);

    // Add a loading and initialization tracking
    const hasInitializedRef = useRef(false);
    const forcedTimerInitRef = useRef(false);

    // Add timestamp to track last server state sync
    const lastServerSyncRef = useRef(Date.now());

    // Add a state for tracking newest opponent word for UI highlighting
    const [lastHighlightedOpponentWord, setLastHighlightedOpponentWord] = useState<string | null>(null);

    // Add a state cache with versioning and snapshots
    const gameStateCache = useRef<{
        version: number;
        lastUpdate: number;
        snapshot: GameState | null;
        pendingUpdates: Partial<GameState>[];
    }>({
        version: 0,
        lastUpdate: Date.now(),
        snapshot: null,
        pendingUpdates: []
    });

    // Add cache performance metrics
    const cacheMetrics = useRef({
        cacheHits: 0,
        cacheMisses: 0,
        batchedUpdates: 0,
        directUpdates: 0,
        lastUpdateSize: 0
    });

    // Add cache metrics tracker
    const recordCacheMetric = useCallback((type: 'hit' | 'miss' | 'batched' | 'direct', size: number = 0) => {
        if (type === 'hit') cacheMetrics.current.cacheHits++;
        if (type === 'miss') cacheMetrics.current.cacheMisses++;
        if (type === 'batched') cacheMetrics.current.batchedUpdates++;
        if (type === 'direct') cacheMetrics.current.directUpdates++;
        if (size > 0) cacheMetrics.current.lastUpdateSize = size;
    }, []);

    // Add a synchronizer function to ensure we're in sync with the server
    const syncWithServer = useCallback(() => {
        if (isConnected && gameState.gameStatus === 'ACTIVE') {
            debugLog("Syncing game state with server");
            lastServerSyncRef.current = Date.now();
            wsService.send("GET_GAME_STATE", { gameId });
        }
    }, [isConnected, gameState.gameStatus, gameId]);

    // Run periodic sync to ensure we stay in sync
    useEffect(() => {
        if (gameState.gameStatus !== 'ACTIVE') return;

        // Sync every 5 seconds while game is active
        const syncInterval = setInterval(() => {
            // Only sync if we haven't synced in the last 3 seconds
            const timeSinceLastSync = Date.now() - lastServerSyncRef.current;
            if (timeSinceLastSync > 3000) {
                syncWithServer();
            }
        }, 5000);

        return () => clearInterval(syncInterval);
    }, [gameState.gameStatus, syncWithServer]);

    // Force sync whenever critical state changes to ensure we're up to date
    useEffect(() => {
        // The useEffect dependency array monitors important game state
        // When these change in a significant way, sync with server

        // Short delay to avoid spamming the server with multiple requests
        const syncTimer = setTimeout(() => {
            syncWithServer();
        }, 500);

        return () => clearTimeout(syncTimer);

    }, [gameState.foundWords.length, gameState.opponentWords.length, syncWithServer]);

    // Sync immediately after connection is established
    useEffect(() => {
        if (isConnected && !isReconnecting && gameState.gameStatus === 'ACTIVE') {
            syncWithServer();
        }
    }, [isConnected, isReconnecting, gameState.gameStatus, syncWithServer]);

    // Immediate initialization on component mount
    useEffect(() => {
        console.log("Component mounted, initializing game connection");
        // Pre-initialize with default values to improve perceived performance
        if (!hasInitializedRef.current && gameState.gameStatus === 'PENDING') {
            // Force a timer start after 2 seconds if we're still waiting
            const forceTimer = setTimeout(() => {
                if (gameState.gameStatus === 'PENDING' && !forcedTimerInitRef.current) {
                    console.log("Forcing timer initialization for better UX");
                    forcedTimerInitRef.current = true;
                    setGameState(prev => ({
                        ...prev,
                        timeRemaining: "03:00"
                    }));
                }
            }, 2000);

            return () => clearTimeout(forceTimer);
        }
    }, [gameState.gameStatus]);

    // Debug log helper
    const debugLog = (...args: any[]) => {
        if (DEBUG_MODE) {
            console.log(...args);
        }
    };

    // Enhanced state update function that uses caching
    const safeUpdateGameState = useCallback((updater: (prev: GameState) => GameState) => {
        lastStateUpdate.current = Date.now();
        gameStateCache.current.lastUpdate = Date.now();

        // Track as direct update for metrics
        recordCacheMetric('direct');

        // Apply update to the real state
        setGameState(prev => {
            // First apply the update
            const newState = updater(prev);

            // Cache the state snapshot and increment version
            gameStateCache.current.snapshot = { ...newState };
            gameStateCache.current.version++;

            debugLog("State updated (v" + gameStateCache.current.version + "):", newState);
            return newState;
        });
    }, [recordCacheMetric]);

    // Add a function to apply pending updates from cache
    const applyPendingUpdates = useCallback(() => {
        if (gameStateCache.current.pendingUpdates.length === 0) return;

        const batchSize = gameStateCache.current.pendingUpdates.length;
        debugLog(`Applying ${batchSize} pending updates from cache`);

        // Merge all pending updates into one update operation
        const combinedUpdate = gameStateCache.current.pendingUpdates.reduce(
            (acc, update) => ({ ...acc, ...update }),
            {}
        );

        // Record metrics
        recordCacheMetric('batched', batchSize);

        // Apply the combined update
        safeUpdateGameState(prev => ({
            ...prev,
            ...combinedUpdate
        }));

        // Clear pending updates
        gameStateCache.current.pendingUpdates = [];
    }, [safeUpdateGameState, recordCacheMetric]);

    // Add a function to stage updates for batching
    const stageUpdate = useCallback((update: Partial<GameState>, priority: 'high' | 'normal' | 'low' = 'normal') => {
        // For high priority updates, apply immediately
        if (priority === 'high') {
            recordCacheMetric('direct');
            safeUpdateGameState(prev => ({
                ...prev,
                ...update
            }));
            return;
        }

        // Otherwise, add to pending updates
        gameStateCache.current.pendingUpdates.push(update);

        // For normal priority, apply soon
        if (priority === 'normal') {
            setTimeout(applyPendingUpdates, 50);
        }
        // For low priority, they'll be applied by the next cache flush
    }, [safeUpdateGameState, applyPendingUpdates, recordCacheMetric]);

    // Add a cache flush effect to periodically apply pending updates
    useEffect(() => {
        const flushInterval = setInterval(() => {
            if (gameStateCache.current.pendingUpdates.length > 0) {
                applyPendingUpdates();
            }
        }, 500); // Flush cache every 500ms if needed

        return () => clearInterval(flushInterval);
    }, [applyPendingUpdates]);

    // Add a state hydration function to restore from cache if needed
    const hydrateStateFromCache = useCallback(() => {
        if (!gameStateCache.current.snapshot) {
            recordCacheMetric('miss');
            return false;
        }

        const timeSinceLastUpdate = Date.now() - gameStateCache.current.lastUpdate;
        // Only use cache if it's fresh (less than 5 seconds old)
        if (timeSinceLastUpdate < 5000) {
            recordCacheMetric('hit');
            debugLog("Hydrating state from cache (v" + gameStateCache.current.version + ")");
            setGameState(gameStateCache.current.snapshot);
            return true;
        }

        recordCacheMetric('miss');
        return false;
    }, [recordCacheMetric]);

    // Add active polling for game state during active gameplay
    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null;

        if (gameState.gameStatus === 'ACTIVE' && isConnected) {
            // During active gameplay, poll every 5 seconds to ensure state is fresh
            pollInterval = setInterval(() => {
                debugLog("Polling for game state updates");
                wsService.send("GET_GAME_STATE", { gameId });
            }, 5000);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [gameState.gameStatus, isConnected, gameId]);

    // Add a function to reconnect WebSocket
    const reconnectWebSocket = () => {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            router.push("/login");
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (!user || !user.id) {
                router.push("/login");
                return;
            }

            setIsReconnecting(true);
            reconnectAttempts.current += 1;

            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);

            wsService.disconnect(); // Ensure we're fully disconnected first

            setTimeout(() => {
                wsService.connect(user.id);

                // If we've tried too many times, give up
                if (reconnectAttempts.current >= maxReconnectAttempts) {
                    setError("Failed to reconnect after multiple attempts. Please refresh the page.");
                    setIsReconnecting(false);
                }
            }, 1000 * Math.min(reconnectAttempts.current, 5)); // Backoff strategy
        } catch (error) {
            console.error("Failed to reconnect:", error);
            setError("Failed to reconnect to the game.");
            setIsReconnecting(false);
        }
    };

    // Improved connection logic with faster timeouts
    useEffect(() => {
        const userStr = localStorage.getItem("user")
        if (!userStr) {
            router.push("/login")
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (!user || !user.id) {
                router.push("/login")
                return
            }

            // Immediately set connection in progress UI state
            setIsJoining(true);

            wsService.setHandlers({
                onConnect: () => {
                    console.log("WebSocket connected")
                    setIsConnected(true)
                    setIsReconnecting(false)
                    reconnectAttempts.current = 0
                    setError(null)

                    // Immediately join game when connected - no delay
                    console.log("Immediately sending JOIN_GAME with gameId:", gameId)
                    sendJoinGameRequest();

                    // Set up rapid retry for join attempts
                    const attemptJoin = () => {
                        if (gameState.gameStatus === 'PENDING' && connectionAttempts < 5) {
                            console.log(`Rapid retry JOIN_GAME attempt ${connectionAttempts + 1}`);
                            sendJoinGameRequest();
                            setConnectionAttempts(prev => prev + 1);

                            // Schedule next attempt with increasing delays (200ms, 400ms, 800ms, etc)
                            const nextDelay = Math.min(200 * Math.pow(2, connectionAttempts), 2000);
                            joinAttemptRef.current = setTimeout(attemptJoin, nextDelay);
                        } else {
                            // After 5 rapid attempts, switch to normal state checks
                            if (gameState.gameStatus === 'PENDING') {
                                console.log("Switching to normal game state checks");
                                // Request state after rapid retries
                                wsService.send("GET_GAME_STATE", { gameId });
                                setIsJoining(false);
                            }
                        }
                    };

                    // Start rapid retry (first attempt after 200ms)
                    joinAttemptRef.current = setTimeout(attemptJoin, 200);
                },
                onMessage: (message: WebSocketMessage) => {
                    console.log("Received raw message:", message)

                    // Clear join attempt timeouts once we get any message
                    if (joinAttemptRef.current) {
                        clearTimeout(joinAttemptRef.current);
                        joinAttemptRef.current = null;
                    }

                    // If still joining and received a response, we can stop the joining indicator
                    if (isJoining) {
                        setIsJoining(false);
                    }

                    handleGameMessage(message)
                },
                onError: (error: Error) => {
                    console.error("WebSocket error:", error)
                    setIsConnected(false)
                    setIsJoining(false)
                    setError("Connection error: " + error.message)

                    // Attempt to reconnect if it's not a critical error
                    if (gameState.gameStatus === 'ACTIVE' && !isReconnecting) {
                        reconnectWebSocket();
                    }
                },
                onDisconnect: () => {
                    console.log("WebSocket disconnected")
                    setIsConnected(false)
                    setIsJoining(false)

                    // Only try to reconnect if we were in an active game
                    if (gameState.gameStatus === 'ACTIVE' && !isReconnecting) {
                        setError("Connection lost. Attempting to reconnect...")
                        reconnectWebSocket();
                    } else {
                        setError("Connection lost")
                    }
                }
            })

            wsService.connect(user.id)

            return () => {
                if (joinAttemptRef.current) {
                    clearTimeout(joinAttemptRef.current);
                }
                wsService.disconnect()
            }
        } catch (error) {
            console.error("Failed to initialize game:", error)
            setError("Failed to initialize game mode")
            setIsJoining(false)
        }
    }, [router, gameId]);

    // Helper function to send join game request
    const sendJoinGameRequest = () => {
        const message = {
            type: "JOIN_GAME",
            gameId: gameId
        };
        wsService.send("JOIN_GAME", message);
    };

    // Add a more aggressive state check for stuck "waiting" state
    useEffect(() => {
        let forceCheckTimer: NodeJS.Timeout | null = null;

        if (gameState.gameStatus === 'PENDING' && isConnected) {
            console.log("DEBUG - Setting up force check timer for stuck game state");

            // Check every 3 seconds if we're still pending
            forceCheckTimer = setInterval(() => {
                console.log("DEBUG - Force checking if game should be active");
                // Try to get updated game state
                wsService.send("GET_GAME_STATE", { gameId });

                // If we're really stuck, force transition after 15 seconds
                if (Date.now() - connectionStartTime > 15000) {
                    console.log("DEBUG - EMERGENCY: Forcing game to active state after 15s timeout");
                    setGameState(prev => ({
                        ...prev,
                        gameStatus: 'ACTIVE',
                        opponentConnected: true,
                        letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
                    }));

                    if (forceCheckTimer) {
                        clearInterval(forceCheckTimer);
                    }
                }
            }, 3000); // Reduced from 10s to 3s
        }

        return () => {
            if (forceCheckTimer) {
                clearInterval(forceCheckTimer);
            }
        };
    }, [gameState.gameStatus, isConnected, gameId, connectionStartTime]);

    // Add a debugging effect to log state changes
    useEffect(() => {
        console.log("Game state updated:", gameState);
    }, [gameState]);

    // Add a timer effect to keep track of time locally
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | null = null;

        // Only run timer when game is active
        if (gameState.gameStatus === 'ACTIVE') {
            timerInterval = setInterval(() => {
                // Parse the current time
                const [minutes, seconds] = gameState.timeRemaining.split(':').map(Number);
                let totalSeconds = minutes * 60 + seconds;

                // Decrement by 1 second
                if (totalSeconds > 0) {
                    totalSeconds--;

                    // Format back to mm:ss
                    const newMinutes = Math.floor(totalSeconds / 60);
                    const newSeconds = totalSeconds % 60;
                    const newTimeRemaining = `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;

                    // Update the time without touching other state
                    setGameState(prev => ({
                        ...prev,
                        timeRemaining: newTimeRemaining
                    }));
                } else if (gameState.gameStatus === 'ACTIVE') {
                    // If time runs out but game is still active, handle game end
                    setGameState(prev => ({
                        ...prev,
                        gameStatus: 'FINISHED'
                    }));

                    // Clear the interval
                    if (timerInterval) {
                        clearInterval(timerInterval);
                    }
                }
            }, 1000);
        }

        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [gameState.gameStatus, gameState.timeRemaining]);

    // Add periodic ping to keep the connection alive
    useEffect(() => {
        let pingInterval: NodeJS.Timeout | null = null;

        if (isConnected && gameState.gameStatus === 'ACTIVE') {
            // Send a ping every 30 seconds to keep the connection alive
            pingInterval = setInterval(() => {
                console.log("Sending periodic ping to keep connection alive");
                wsService.send("PING", { gameId });

                // Also request the latest game state
                wsService.send("GET_GAME_STATE", { gameId });
            }, 30000);
        }

        return () => {
            if (pingInterval) {
                clearInterval(pingInterval);
            }
        };
    }, [isConnected, gameState.gameStatus, gameId]);

    // Add opponent connection heartbeat check
    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let missedHeartbeats = 0;

        if (gameState.gameStatus === 'ACTIVE' && isConnected) {
            // Check opponent connection every 10 seconds
            heartbeatInterval = setInterval(() => {
                if (gameState.opponentConnected) {
                    // Reset counter if opponent is connected
                    missedHeartbeats = 0;
                } else {
                    missedHeartbeats++;
                    console.log(`Opponent connection check: ${missedHeartbeats} missed heartbeats`);

                    // If we haven't seen opponent for a while, check game state
                    if (missedHeartbeats >= 3) {
                        console.log("Requesting game state due to missing opponent heartbeats");
                        wsService.send("GET_GAME_STATE", { gameId });
                    }
                }
            }, 10000);
        }

        return () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        };
    }, [isConnected, gameState.gameStatus, gameState.opponentConnected, gameId]);

    // Function to get time since last opponent word
    const getTimeSinceLastWord = () => {
        if (!gameState.lastOpponentWord) return '';

        const secondsAgo = Math.floor((Date.now() - gameState.lastOpponentWord.timestamp) / 1000);

        if (secondsAgo < 5) return 'just now';
        if (secondsAgo < 60) return `${secondsAgo} seconds ago`;

        const minutesAgo = Math.floor(secondsAgo / 60);
        return `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
    };

    // Add memoized state selectors for optimized re-rendering
    const playerScore = useMemo(() => gameState.score, [gameState.score]);
    const opponentScore = useMemo(() => gameState.opponentScore, [gameState.opponentScore]);
    const playerWords = useMemo(() => gameState.foundWords, [gameState.foundWords]);
    const opponentWords = useMemo(() => gameState.opponentWords, [gameState.opponentWords]);
    const currentWord = useMemo(() => gameState.currentWord, [gameState.currentWord]);
    const gameLetters = useMemo(() => gameState.letters, [gameState.letters]);
    const timeRemaining = useMemo(() => gameState.timeRemaining, [gameState.timeRemaining]);
    const isOpponentConnected = useMemo(() => gameState.opponentConnected, [gameState.opponentConnected]);
    const opponentName = useMemo(() => gameState.opponentName, [gameState.opponentName]);
    const lastOpponentWord = useMemo(() => gameState.lastOpponentWord, [gameState.lastOpponentWord]);

    // Replace the request game state update function to use cache
    const requestGameStateUpdate = useCallback((immediate = false) => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        // Check the cache first
        const timeSinceLastUpdate = Date.now() - gameStateCache.current.lastUpdate;

        // If we just updated, don't spam the server
        if (timeSinceLastUpdate < 200 && !immediate) {
            debugLog("Skipping state update request - recent cache update");
            return;
        }

        if (immediate) {
            wsService.send("GET_GAME_STATE", { gameId });
        } else {
            // Use setTimeout to avoid spamming the server with multiple rapid requests
            setTimeout(() => {
                wsService.send("GET_GAME_STATE", { gameId });
            }, 300);
        }
    }, [isConnected, gameState.gameStatus, gameId]);

    // Update the handleGameMessage function to use cache
    const handleGameMessage = useCallback((message: WebSocketMessage) => {
        debugLog("DEBUG - Full message received:", JSON.stringify(message, null, 2));

        // Handle the case where the message is directly the data or has a payload
        const data = message.payload || message;

        // Check different possible locations for the message type
        let messageType = data.type || message.type;

        // Mark game as initialized once we get any game-specific message
        if (!hasInitializedRef.current && messageType) {
            debugLog("Game initialization detected with message type:", messageType);
            hasInitializedRef.current = true;
        }

        // IMPROVEMENT: Define message priority levels to handle conflicting updates
        const getMessagePriority = (type: string | undefined): number => {
            if (!type) return 0;

            // Priority levels (higher = more important)
            switch (type) {
                case "GAME_STARTED": return 10;
                case "GAME_ENDED": return 10;
                case "OPPONENT_SCORED": return 8;
                case "WORD_SUBMISSION_RESULT": return 8;
                case "OPPONENT_JOINED": return 7;
                case "OPPONENT_DISCONNECTED": return 7;
                case "OPPONENT_RECONNECTED": return 7;
                case "GAME_STATE": return 6;
                case "GAME_UPDATE": return 5;
                default: return 1;
            }
        };

        // Get the priority of this message
        const priority = getMessagePriority(messageType);
        const cachePriority: 'high' | 'normal' | 'low' =
            priority >= 7 ? 'high' :
                priority >= 5 ? 'normal' : 'low';

        // Log message priority for debugging
        debugLog(`Message priority: ${priority} for type: ${messageType}`);

        // IMPROVEMENT: Create a more comprehensive state update
        const createFullGameStateUpdate = (data: any): Partial<GameState> => {
            // Start with an empty update
            const update: Partial<GameState> = {};

            // Process all fields consistently
            if (data.letters && typeof data.letters === 'string') {
                const letters = data.letters.split("");
                if (letters.length > 0) {
                    update.letters = letters;
                    // If we get letters, the game should be active
                    update.gameStatus = 'ACTIVE';
                }
            }

            if (data.timeRemaining) {
                update.timeRemaining = data.timeRemaining;
            }

            if (data.score !== undefined) {
                update.score = data.score;
            }

            if (data.opponentScore !== undefined) {
                update.opponentScore = data.opponentScore;
            }

            if (Array.isArray(data.foundWords)) {
                update.foundWords = data.foundWords;
            }

            if (Array.isArray(data.opponentWords)) {
                update.opponentWords = data.opponentWords;
            }

            if (data.opponentConnected !== undefined) {
                update.opponentConnected = data.opponentConnected;
            }

            if (data.opponentName) {
                update.opponentName = data.opponentName;
            }

            if (data.gameStatus) {
                update.gameStatus = data.gameStatus;
            }

            if (data.winner !== undefined) {
                update.winner = data.winner;
            }

            if (data.possibleWords !== undefined) {
                update.possibleWords = data.possibleWords;
            }

            return update;
        };

        // Extract important state updates
        const stateUpdate = createFullGameStateUpdate(data);
        const hasUpdates = Object.keys(stateUpdate).length > 0;

        // Critical updates that should always trigger a state update
        if (hasUpdates) {
            // Use appropriate cache priority based on message importance
            stageUpdate(stateUpdate, cachePriority);
        }

        // Continue with message-type specific processing
        debugLog(`Processing ${messageType} message with data:`, data);

        // Detect game state updates based on message content
        if (data.opponentConnected || data.opponentName || (messageType === "OPPONENT_JOINED")) {
            debugLog("DEBUG - CRITICAL: Detected opponent has joined:", data);

            // Force transition to active state - high priority update
            const activeStateUpdate: Partial<GameState> = {
                gameStatus: 'ACTIVE',
                opponentConnected: true,
                opponentName: data.opponentName || gameState.opponentName
            };

            // Handle letters specially
            if (data.letters && typeof data.letters === 'string') {
                const letters = data.letters.split("");
                if (letters.length > 0) {
                    activeStateUpdate.letters = letters;
                } else if (gameState.letters.length === 0) {
                    // If no letters but game should be active, generate some placeholder letters
                    activeStateUpdate.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                    debugLog("DEBUG - No letters found, using placeholders");
                }
            } else if (gameState.letters.length === 0) {
                activeStateUpdate.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            }

            // Ensure we have a valid time remaining
            activeStateUpdate.timeRemaining = data.timeRemaining || "03:00";
            activeStateUpdate.possibleWords = data.possibleWords || gameState.possibleWords;

            // Apply as high priority update
            stageUpdate(activeStateUpdate, 'high');

            // Show a notification
            toast({
                title: "Game Started!",
                description: `${data.opponentName || gameState.opponentName} has joined. The game is now active!`,
                variant: "default"
            });

            // IMPROVEMENT: Add immediate follow-up state request
            setTimeout(() => {
                if (isConnected) {
                    wsService.send("GET_GAME_STATE", { gameId });
                }
            }, 300);

            // Don't continue processing this message in the switch to avoid duplicate state updates
            return;
        }

        // Proceed with standard message type handling
        if (!messageType) {
            console.warn("Unknown message format received:", message);
            return;
        }

        // Handle specific message types using the cache system
        switch (messageType) {
            case "GAME_JOINED":
                toast({
                    title: "Game Joined",
                    description: "Waiting for opponent...",
                    variant: "default"
                });
                stageUpdate({ opponentName: data.opponentName || "Opponent" }, 'normal');
                break;

            case "OPPONENT_JOINED":
                console.log("DEBUG - OPPONENT_JOINED message received:", data);
                stageUpdate({
                    gameStatus: 'ACTIVE',
                    opponentConnected: true,
                    opponentName: data.opponentName || "Opponent"
                }, 'high');

                toast({
                    title: "Opponent Connected!",
                    description: `${data.opponentName || "Opponent"} has joined the game!`,
                    variant: "default"
                });

                // IMPROVEMENT: Add immediate follow-up state request
                setTimeout(() => {
                    wsService.send("GET_GAME_STATE", { gameId });
                }, 300);
                break;

            case "GAME_STARTED":
                stageUpdate({
                    letters: data.letters?.split("") || [],
                    gameStatus: 'ACTIVE',
                    possibleWords: data.possibleWords || 0,
                    timeRemaining: data.timeRemaining || "03:00"
                }, 'high');

                toast({
                    title: "Game Started!",
                    description: "Find as many words as you can!",
                    variant: "default"
                });

                // IMPROVEMENT: Add immediate follow-up state request
                setTimeout(() => {
                    wsService.send("GET_GAME_STATE", { gameId });
                }, 300);
                break;

            case "GAME_UPDATE":
                console.log("Updating game state with:", data);
                stageUpdate({
                    timeRemaining: data.timeRemaining || gameState.timeRemaining,
                    score: data.score !== undefined ? data.score : gameState.score,
                    opponentScore: data.opponentScore !== undefined ? data.opponentScore : gameState.opponentScore,
                    possibleWords: data.possibleWords || gameState.possibleWords,
                }, 'normal');
                break;

            case "GAME_STATE":
                // Handle complete game state updates from server more thoroughly
                console.log("Processing GAME_STATE message:", data);

                if (data.opponentConnected) {
                    const wasGamePending = gameState.gameStatus === 'PENDING';

                    console.log("Updating game state with opponent connected:", {
                        currentStatus: gameState.gameStatus,
                        newStatus: 'ACTIVE',
                        opponentConnected: data.opponentConnected,
                        prevTimeRemaining: gameState.timeRemaining,
                        newTimeRemaining: data.timeRemaining,
                        prevScore: gameState.score,
                        newScore: data.score,
                        prevOpponentScore: gameState.opponentScore,
                        newOpponentScore: data.opponentScore
                    });

                    // Check if we have valid arrays from the server
                    const foundWords = Array.isArray(data.foundWords) ? data.foundWords : gameState.foundWords;
                    const opponentWords = Array.isArray(data.opponentWords) ? data.opponentWords : gameState.opponentWords;

                    // Create new state with the opponent connected and game active
                    const newState: Partial<GameState> = {
                        gameStatus: 'ACTIVE',
                        opponentConnected: true,
                        opponentName: data.opponentName || gameState.opponentName,
                        letters: data.letters?.split("") || gameState.letters,
                        possibleWords: data.possibleWords || gameState.possibleWords,
                        timeRemaining: data.timeRemaining || gameState.timeRemaining,
                        score: data.score !== undefined ? data.score : gameState.score,
                        opponentScore: data.opponentScore !== undefined ? data.opponentScore : gameState.opponentScore,
                        foundWords: foundWords,
                        opponentWords: opponentWords,
                        // Preserve last opponent word
                        lastOpponentWord: gameState.lastOpponentWord
                    };

                    // Use high priority for initial activation, normal otherwise
                    stageUpdate(newState, wasGamePending ? 'high' : 'normal');

                    // Show toast if the game is changing from pending to active
                    if (wasGamePending) {
                        toast({
                            title: "Game Started!",
                            description: "Find as many words as you can!",
                            variant: "default"
                        });
                    }
                } else if (data.gameStatus) {
                    const gameStatusChanged = data.gameStatus === 'ACTIVE' && gameState.gameStatus === 'PENDING';

                    // Check if we have valid arrays from the server
                    const foundWords = Array.isArray(data.foundWords) ? data.foundWords : gameState.foundWords;
                    const opponentWords = Array.isArray(data.opponentWords) ? data.opponentWords : gameState.opponentWords;

                    // Update state with new values from server
                    const newState: Partial<GameState> = {
                        gameStatus: data.gameStatus,
                        opponentConnected: data.opponentConnected || false,
                        opponentName: data.opponentName || gameState.opponentName,
                        letters: data.letters?.split("") || gameState.letters,
                        possibleWords: data.possibleWords || gameState.possibleWords,
                        timeRemaining: data.timeRemaining || gameState.timeRemaining,
                        score: data.score !== undefined ? data.score : gameState.score,
                        opponentScore: data.opponentScore !== undefined ? data.opponentScore : gameState.opponentScore,
                        foundWords: foundWords,
                        opponentWords: opponentWords,
                        // Preserve last opponent word
                        lastOpponentWord: gameState.lastOpponentWord
                    };

                    // Use high priority for status changes, normal otherwise
                    stageUpdate(newState, gameStatusChanged ? 'high' : 'normal');

                    // Show toast if game status changed from pending to active
                    if (gameStatusChanged) {
                        toast({
                            title: "Game Started!",
                            description: "Find as many words as you can!",
                            variant: "default"
                        });
                    }
                }
                break;

            case "WORD_SUBMISSION_RESULT":
                if (data.success) {
                    // Updated approach with cache handling
                    const newState: Partial<GameState> = {
                        currentWord: [],
                        score: data.score !== undefined ? data.score : gameState.score,
                    };

                    // Make sure the word isn't already in the list to avoid duplicates
                    if (!gameState.foundWords.includes(data.word)) {
                        newState.foundWords = [...gameState.foundWords, data.word];
                    }

                    // Apply as high priority update
                    stageUpdate(newState, 'high');

                    toast({
                        title: "Word Accepted!",
                        description: `${data.word}: +${data.points} points`,
                        variant: "default"
                    });

                    // Force a state update to reflect the new score and word
                    setTimeout(() => {
                        wsService.send("GET_GAME_STATE", { gameId });
                    }, 300); // Reduced from 500ms to 300ms for faster updates
                } else {
                    // Trigger shake animation
                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 500);

                    toast({
                        title: "Invalid Word",
                        description: data.reason || "This word is not valid",
                        variant: "destructive"
                    });

                    stageUpdate({ currentWord: [] }, 'high');
                }
                break;

            case "OPPONENT_SCORED":
                const updatedOpponentWords = gameState.opponentWords.includes(data.word)
                    ? gameState.opponentWords
                    : [...gameState.opponentWords, data.word];

                stageUpdate({
                    opponentScore: data.opponentScore || gameState.opponentScore,
                    opponentWords: updatedOpponentWords,
                    lastOpponentWord: {
                        word: data.word,
                        timestamp: Date.now()
                    }
                }, 'high');

                toast({
                    title: `${gameState.opponentName} found a word!`,
                    description: `${data.word}`,
                    variant: "destructive"
                });

                // Trigger the animation for new enemy word
                setNewEnemyWord(data.word);
                setTimeout(() => setNewEnemyWord(null), 3000);

                // Force a state update to reflect the new opponent score/words
                setTimeout(() => {
                    wsService.send("GET_GAME_STATE", { gameId });
                }, 300); // Reduced from 500ms to 300ms for faster updates
                break;

            case "OPPONENT_DISCONNECTED":
                console.log("Opponent disconnected message received");
                stageUpdate({ opponentConnected: false }, 'high');

                toast({
                    title: "Opponent Disconnected",
                    description: "Your opponent has left the game.",
                    variant: "destructive"
                });
                break;

            case "OPPONENT_RECONNECTED":
                console.log("Opponent reconnected message received");
                stageUpdate({ opponentConnected: true }, 'high');

                toast({
                    title: "Opponent Reconnected",
                    description: `${gameState.opponentName} has rejoined the game!`,
                    variant: "default"
                });
                break;

            case "GAME_ENDED":
                stageUpdate({
                    gameStatus: 'FINISHED',
                    winner: data.winner || null
                }, 'high');

                const isWinner = data.winner === "player";
                const isTie = data.winner === "tie";

                toast({
                    title: isWinner ? "You Won! 🎉" : isTie ? "It's a Tie! 🤝" : "You Lost",
                    description: `Final score: ${gameState.score} - ${gameState.opponentScore}`,
                    variant: isWinner ? "default" : "default"
                });
                break;
        }
    }, [gameId, gameState, isConnected, toast, stageUpdate]);

    // Watch for score changes and trigger animations
    useEffect(() => {
        if (gameState.score > 0) {
            setScoreHighlight(true);
            setTimeout(() => setScoreHighlight(false), 1500);
        }
    }, [gameState.score]);

    useEffect(() => {
        if (gameState.opponentScore > 0) {
            setOpponentScoreHighlight(true);
            setTimeout(() => setOpponentScoreHighlight(false), 1500);
        }
    }, [gameState.opponentScore]);

    // Track new words found by player
    useEffect(() => {
        if (gameState.foundWords.length > 0) {
            const latestWord = gameState.foundWords[gameState.foundWords.length - 1];
            setNewWord(latestWord);
            setTimeout(() => setNewWord(null), 2000);
        }
    }, [gameState.foundWords.length]);

    // Track opponent words changes to highlight new additions
    useEffect(() => {
        if (opponentWords.length === 0) return;

        // Get the most recently added word
        const newestWord = opponentWords[opponentWords.length - 1];

        // Only highlight if this is a newly detected word
        if (newestWord && newestWord !== lastHighlightedOpponentWord) {
            setLastHighlightedOpponentWord(newestWord);

            // Also trigger the new enemy word animation for better visibility
            setNewEnemyWord(newestWord);
            setTimeout(() => setNewEnemyWord(null), 3000);

            // Request immediate state update to ensure we're in sync
            requestGameStateUpdate(true);
        }
    }, [opponentWords, lastHighlightedOpponentWord, requestGameStateUpdate]);

    // Update handle letter click for immediate feedback
    const handleLetterClick = (letter: string) => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        // Provide immediate feedback
        safeUpdateGameState(prev => ({
            ...prev,
            currentWord: [...prev.currentWord, letter]
        }));

        // Play a subtle sound effect or provide haptic feedback here if needed
    };

    // Update handle delete for immediate feedback
    const handleDelete = () => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        // Use high priority update for UI responsiveness
        stageUpdate({
            currentWord: gameState.currentWord.slice(0, -1)
        }, 'high');
    };

    // Update handle shuffle for better visual feedback
    const handleShuffle = () => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        // Use high priority update for UI responsiveness
        stageUpdate({
            letters: [...gameState.letters].sort(() => Math.random() - 0.5)
        }, 'high');

        // Add a brief shake for feedback
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
    };

    // Update handle enter for optimistic updates and faster feedback
    const handleEnter = () => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        if (gameState.currentWord.length > 0) {
            const word = gameState.currentWord.join("");

            // Clear word immediately for better UX using high priority
            stageUpdate({
                currentWord: []
            }, 'high');

            if (gameState.foundWords.includes(word)) {
                toast({
                    title: "Word Already Found",
                    description: "You've already found this word!",
                    variant: "destructive"
                });
                return;
            }

            // Check if word is at least 3 letters
            if (word.length < 3) {
                toast({
                    title: "Word Too Short",
                    description: "Words must be at least 3 letters long",
                    variant: "destructive"
                });
                return;
            }

            // Send the word to the server
            const message = {
                type: "SUBMIT_WORD",
                gameId: gameId,
                word: word
            };

            // Add optimistic UI update for better responsiveness
            // We'll show it temporarily until we get server confirmation
            setNewWord(word);

            // For debug only - makes it easier to test UI responsiveness
            if (DEBUG_MODE) {
                debugLog("Submitting word with optimistic update:", word);

                // Apply optimistic update to cache
                const currentScore = gameState.score;
                const tentativeScore = currentScore + word.length;

                // Stage optimistic update with normal priority
                stageUpdate({
                    score: tentativeScore,
                    foundWords: [...gameState.foundWords, word]
                }, 'normal');
            }

            wsService.send("SUBMIT_WORD", message);

            // Request immediate game state update
            setTimeout(() => {
                if (isConnected) {
                    wsService.send("GET_GAME_STATE", { gameId });
                }
            }, 300);
        }
    };

    const exitGame = () => {
        router.push("/profile")
    }

    // Add a more robust effect for active in-game synchronization
    useEffect(() => {
        if (!isConnected || gameState.gameStatus !== 'ACTIVE') return;

        // Request updates after important changes
        requestGameStateUpdate();

        // Set up a routine sync interval
        const syncInterval = setInterval(() => {
            // Only request if we haven't updated recently from cache
            const timeSinceLastUpdate = Date.now() - gameStateCache.current.lastUpdate;
            if (timeSinceLastUpdate > 8000) {
                requestGameStateUpdate(true);
            }
        }, 10000); // Full sync every 10 seconds

        return () => clearInterval(syncInterval);
    }, [isConnected, gameState.gameStatus, requestGameStateUpdate]);

    // Add conflict resolution and real-time updates for score changes
    useEffect(() => {
        // Specifically watch score changes and request immediate updates
        // This helps ensure UI is in sync with the server when scoring happens
        if (playerScore > 0 || opponentScore > 0) {
            // Update cache with latest scores
            const scoreUpdate: Partial<GameState> = {};
            if (playerScore > 0) scoreUpdate.score = playerScore;
            if (opponentScore > 0) scoreUpdate.opponentScore = opponentScore;

            // Apply score updates with normal priority
            if (Object.keys(scoreUpdate).length > 0) {
                stageUpdate(scoreUpdate, 'normal');
            }

            // Request server state if it's been more than 3 seconds since our last update
            const timeSinceLastUpdate = Date.now() - gameStateCache.current.lastUpdate;
            if (timeSinceLastUpdate > 3000) {
                requestGameStateUpdate();
            }
        }
    }, [playerScore, opponentScore, requestGameStateUpdate, stageUpdate]);

    // Add an adaptive polling rate based on game activity
    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null;

        if (isConnected && gameState.gameStatus === 'ACTIVE') {
            // Calculate an adaptive polling rate based on game activity
            // More active games need more frequent updates
            const activityLevel = Math.max(
                1,
                playerWords.length + opponentWords.length
            );

            // Scale polling frequency: more activity = more frequent polling
            // Minimum 2 seconds, maximum 10 seconds
            const pollRate = Math.max(2000, Math.min(10000, 10000 - (activityLevel * 200)));

            debugLog(`Setting adaptive poll rate to ${pollRate}ms based on activity level ${activityLevel}`);

            pollInterval = setInterval(() => {
                // Only request if needed
                const timeSinceLastUpdate = Date.now() - gameStateCache.current.lastUpdate;
                if (timeSinceLastUpdate > pollRate / 2) {
                    requestGameStateUpdate(false);
                }
            }, pollRate);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [isConnected, gameState.gameStatus, playerWords.length, opponentWords.length, requestGameStateUpdate]);

    // Add a cache init effect to hydrate state if needed
    useEffect(() => {
        // Only run this once on mount
        if (!gameStateCache.current.snapshot && hasInitializedRef.current) {
            // Create initial snapshot
            gameStateCache.current.snapshot = { ...gameState };
            gameStateCache.current.version = 1;
            debugLog("Created initial state cache snapshot");
        }
    }, [gameState]);

    // Add the onbeforeunload handler to save cache to sessionStorage
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (gameStateCache.current.snapshot) {
                try {
                    sessionStorage.setItem('gameStateCache', JSON.stringify({
                        version: gameStateCache.current.version,
                        timestamp: Date.now(),
                        snapshot: gameStateCache.current.snapshot
                    }));
                    debugLog("Saved game state to sessionStorage");
                } catch (err) {
                    console.error("Failed to save game state to sessionStorage:", err);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Try to load cache from sessionStorage on mount
    useEffect(() => {
        try {
            const cachedState = sessionStorage.getItem('gameStateCache');
            if (cachedState) {
                const parsed = JSON.parse(cachedState);
                const age = Date.now() - parsed.timestamp;

                // Only use cache if it's less than 30 seconds old
                if (age < 30000 && parsed.snapshot) {
                    gameStateCache.current.snapshot = parsed.snapshot;
                    gameStateCache.current.version = parsed.version;
                    gameStateCache.current.lastUpdate = parsed.timestamp;

                    // Apply the cached state
                    setGameState(parsed.snapshot);
                    debugLog("Restored game state from sessionStorage", parsed.snapshot);

                    // Request an immediate sync to ensure we're up to date
                    setTimeout(() => {
                        if (isConnected) {
                            wsService.send("GET_GAME_STATE", { gameId });
                        }
                    }, 500);
                } else {
                    sessionStorage.removeItem('gameStateCache');
                }
            }
        } catch (err) {
            console.error("Failed to load game state from sessionStorage:", err);
        }
    }, [gameId, isConnected]);

    // Create a CacheDebugger component to show metrics when in debug mode
    const CacheDebugger = () => {
        const [metrics, setMetrics] = useState(cacheMetrics.current);

        // Update metrics every second
        useEffect(() => {
            const timer = setInterval(() => {
                setMetrics({ ...cacheMetrics.current });
            }, 1000);

            return () => clearInterval(timer);
        }, []);

        // Cache efficiency percentage
        const cacheEfficiency = metrics.cacheHits + metrics.cacheMisses > 0
            ? Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)
            : 0;

        // Batch efficiency percentage
        const batchEfficiency = metrics.batchedUpdates + metrics.directUpdates > 0
            ? Math.round((metrics.batchedUpdates / (metrics.batchedUpdates + metrics.directUpdates)) * 100)
            : 0;

        return (
            <div className="fixed bottom-10 right-2 z-50 text-xs bg-black/60 text-white p-2 rounded">
                <div className="font-bold mb-1">Cache v{gameStateCache.current.version}</div>
                <div>Hits: {metrics.cacheHits} | Misses: {metrics.cacheMisses}</div>
                <div>Efficiency: {cacheEfficiency}%</div>
                <div>Batched: {metrics.batchedUpdates} | Direct: {metrics.directUpdates}</div>
                <div>Batch efficiency: {batchEfficiency}%</div>
                <div>Pending: {gameStateCache.current.pendingUpdates.length}</div>
                <div>Last batch: {metrics.lastUpdateSize}</div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
                    <p className="text-white mb-6">{error}</p>
                    <div className="flex space-x-4 justify-center">
                        {isReconnecting ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mb-2"></div>
                                <p className="text-white text-sm">Reconnecting... ({reconnectAttempts.current}/{maxReconnectAttempts})</p>
                            </div>
                        ) : (
                            <Button onClick={reconnectWebSocket} disabled={reconnectAttempts.current >= maxReconnectAttempts}>
                                Reconnect
                            </Button>
                        )}
                        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                        <Button variant="outline" onClick={() => router.push("/profile")}>Back to Profile</Button>
                    </div>
                </div>
            </div>
        )
    }

    if (gameState.gameStatus === 'PENDING') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {isJoining ? "Connecting to Game..." : "Waiting for Opponent"}
                    </h2>

                    <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>

                    <div className="mb-4">
                        <p className="text-white mb-2">{isJoining ? "Establishing connection..." : "Game ready, waiting for opponent to join"}</p>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{
                                    width: `${Math.min((Date.now() - connectionStartTime) / 150, 100)}%`
                                }}
                            ></div>
                        </div>
                    </div>

                    <p className="text-white mb-6">Game ID: {gameId}</p>

                    {/* After 10 seconds show reconnect option alongside cancel */}
                    {Date.now() - connectionStartTime > 10000 && (
                        <div className="flex justify-center space-x-4 mb-4">
                            <Button onClick={() => window.location.reload()}>Reconnect</Button>
                        </div>
                    )}

                    <Button variant="outline" onClick={() => router.push("/profile")}>Cancel</Button>
                </div>
            </div>
        )
    }

    if (gameState.gameStatus === 'FINISHED') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {gameState.winner === "player"
                            ? "You Won! 🎉"
                            : gameState.winner === "tie"
                                ? "It's a Tie! 🤝"
                                : "You Lost 😢"}
                    </h2>

                    <div className="bg-white/10 rounded-xl p-4 mb-6">
                        <div className="flex justify-between mb-4">
                            <div className="text-white">
                                <p className="font-bold">Your Score</p>
                                <p className="text-2xl">{gameState.score}</p>
                            </div>
                            <div className="text-white">
                                <p className="font-bold">{gameState.opponentName}'s Score</p>
                                <p className="text-2xl">{gameState.opponentScore}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-white font-semibold mb-2">Your Words ({gameState.foundWords.length})</p>
                                <div className="bg-white/5 rounded p-2 max-h-40 overflow-y-auto text-left">
                                    {gameState.foundWords.length === 0 ? (
                                        <p className="text-white/50 text-sm">No words found</p>
                                    ) : (
                                        <ul className="text-white space-y-1 text-sm">
                                            {gameState.foundWords.map((word, i) => (
                                                <li key={i}>{word}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-semibold mb-2">{gameState.opponentName}'s Words ({gameState.opponentWords.length})</p>
                                <div className="bg-white/5 rounded p-2 max-h-40 overflow-y-auto text-left">
                                    {gameState.opponentWords.length === 0 ? (
                                        <p className="text-white/50 text-sm">No words found</p>
                                    ) : (
                                        <ul className="text-white space-y-1 text-sm">
                                            {gameState.opponentWords.map((word, i) => (
                                                <li key={i}>{word}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-4 justify-center">
                        <Button onClick={() => router.push("/queue")}>Play Again</Button>
                        <Button variant="outline" onClick={() => router.push("/profile")}>Back to Profile</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center relative overflow-hidden",
            isShaking && "animate-shake"
        )}>
            {/* Connection status indicator */}
            <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`}></div>
                <span className="text-xs text-white">
                    {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
                </span>
            </div>

            {/* Game state debug */}
            {DEBUG_MODE && (
                <div className="fixed top-10 right-2 z-50 text-xs text-white bg-black/30 backdrop-blur-sm rounded p-1">
                    <div>Score: {playerScore}</div>
                    <div>Words: {playerWords.length}</div>
                    <div>Opponent: {opponentScore}</div>
                    <div>Time: {timeRemaining}</div>
                </div>
            )}

            {/* Enemy word found animation */}
            <AnimatePresence>
                {newEnemyWord && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            className="bg-red-500/80 backdrop-blur-sm text-white px-8 py-6 rounded-2xl shadow-lg border-2 border-white/20 flex flex-col items-center"
                            animate={{
                                y: [0, -20, 0],
                                rotateZ: [0, -2, 2, -2, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: 1,
                                repeatType: "reverse"
                            }}
                        >
                            <AlertTriangle className="w-8 h-8 mb-2" />
                            <p className="text-lg font-bold mb-1">{opponentName} found:</p>
                            <p className="text-3xl font-extrabold tracking-wider">{newEnemyWord}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="absolute top-6 left-8 flex gap-2 z-20">
                <Button variant="ghost" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12" onClick={() => router.push("/profile")}>
                    <Home className="h-5 w-5" />
                </Button>
            </div>
            <div className="absolute top-6 right-8 flex gap-2 z-20">
                <Button variant="ghost" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12" onClick={handleShuffle}>
                    <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="bg-red-500/20 text-white hover:bg-red-500/30 rounded-full w-12 h-12"
                    onClick={exitGame}
                >
                    <Power className="h-5 w-5" />
                </Button>
            </div>

            {/* Game content */}
            <div className="relative w-full max-w-5xl bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-0 flex flex-col overflow-hidden">
                {/* Top bar */}
                <ScoreDisplay
                    playerScore={playerScore}
                    opponentScore={opponentScore}
                    scoreHighlight={scoreHighlight}
                    opponentScoreHighlight={opponentScoreHighlight}
                    opponentName={opponentName}
                    isOpponentConnected={isOpponentConnected}
                    timeRemaining={timeRemaining}
                />

                {/* Main content */}
                <div className="flex flex-col p-6 gap-6 h-full">
                    {/* Game progress */}
                    <div className="w-full">
                        <div className="bg-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white text-sm">Your words: {playerWords.length}</span>
                                <span className="text-white/70 text-xs">
                                    {playerWords.length + opponentWords.length} words found of {gameState.possibleWords} possible
                                </span>
                                <span className="text-white text-sm">{opponentName}'s words: {opponentWords.length}</span>
                            </div>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{
                                        width: `${(playerWords.length / (gameState.possibleWords || 1)) * 100}%`,
                                        transition: 'width 0.5s ease-in-out'
                                    }}
                                ></div>
                                <div
                                    className="h-full bg-red-500"
                                    style={{
                                        width: `${(opponentWords.length / (gameState.possibleWords || 1)) * 100}%`,
                                        transition: 'width 0.5s ease-in-out'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Game content */}
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: Player's game area */}
                        <div className="flex flex-col flex-1">
                            <div className="bg-white/10 rounded-xl p-4 mb-4">
                                <h3 className="text-lg font-bold text-white mb-2">Your Words ({playerWords.length})</h3>
                                <div className="bg-white/5 rounded p-2 max-h-32 overflow-y-auto">
                                    <PlayerWordList words={playerWords} newWord={newWord} />
                                </div>
                            </div>

                            {/* Game board */}
                            <div className="flex flex-col items-center">
                                <GameBoard
                                    letters={gameLetters}
                                    onLetterClick={handleLetterClick}
                                    isShaking={isShaking}
                                    gameStatus={gameState.gameStatus}
                                    isConnected={isConnected}
                                />

                                {/* Current word display */}
                                <div className="bg-white/10 rounded-lg px-4 py-2 mb-4 min-w-[200px] text-center">
                                    <p className="text-lg text-white font-mono tracking-wider">
                                        {currentWord.length > 0
                                            ? currentWord.join("")
                                            : "_____"}
                                    </p>
                                </div>

                                {/* Game controls */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={handleDelete}
                                        disabled={!isConnected || gameState.gameStatus !== 'ACTIVE' || currentWord.length === 0}
                                    >
                                        <Delete className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleShuffle}
                                        disabled={!isConnected || gameState.gameStatus !== 'ACTIVE'}
                                    >
                                        <RotateCw className="w-4 h-4 mr-2" />
                                        Shuffle
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleEnter}
                                        disabled={!isConnected || gameState.gameStatus !== 'ACTIVE' || currentWord.length < 3}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Opponent's area */}
                        <div className="md:w-80 bg-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-white">{opponentName}</h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isOpponentConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                                    <span className="text-sm text-white/70">
                                        {isOpponentConnected ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-white text-sm mb-4">
                                Score: <span className={cn(
                                    "font-bold",
                                    opponentScoreHighlight && "text-red-300 animate-pulse"
                                )}>
                                    {opponentScore}
                                </span>
                            </div>

                            <h4 className="text-white/70 text-sm font-medium mb-2">
                                Words Found ({opponentWords.length})
                            </h4>

                            <div className="bg-white/10 rounded p-3 max-h-[300px] overflow-y-auto">
                                <OpponentWordList words={opponentWords} highlightedWord={lastHighlightedOpponentWord} />
                            </div>

                            {/* Recent opponent activity */}
                            {lastOpponentWord && (
                                <div className="mt-4 bg-red-500/20 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-white text-sm font-medium">Recent Activity</h4>
                                        <span className="text-white/70 text-xs">{getTimeSinceLastWord()}</span>
                                    </div>
                                    <div className="text-white">
                                        <span className="font-bold">{opponentName}</span> found:
                                        <div className="bg-white/10 rounded mt-1 p-2 text-center">
                                            <span className="text-xl font-bold">
                                                {lastOpponentWord.word}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add a loading indicator when waiting for updates */}
            {isConnected && gameState.gameStatus === 'ACTIVE' && (
                <div className="fixed bottom-2 left-2 z-50 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-xs text-white">Game active</span>
                </div>
            )}

            {/* Add manual sync button when in debug mode */}
            {DEBUG_MODE && (
                <div className="fixed bottom-2 right-2 z-50">
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-xs bg-black/30 hover:bg-black/50 text-white border-white/20"
                        onClick={() => wsService.send("GET_GAME_STATE", { gameId })}
                    >
                        Sync
                    </Button>
                </div>
            )}

            {/* Add the cache debugger when in debug mode */}
            {DEBUG_MODE && <CacheDebugger />}
        </div>
    )
} 