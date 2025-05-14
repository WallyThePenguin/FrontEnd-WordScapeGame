"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, Clock, X } from "lucide-react"
import { wsService } from "@/services/websocket"
import type { WebSocketMessage } from "@/types/websocket"
import { useToast } from "@/components/ui/use-toast"

type QueueStatus = 'IDLE' | 'JOINING' | 'IN_QUEUE' | 'MATCHED' | 'ERROR'

export default function QueuePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [queueStatus, setQueueStatus] = useState<QueueStatus>('IDLE')
    const [waitTime, setWaitTime] = useState(0)
    const [playersInQueue, setPlayersInQueue] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        let mounted = true;
        let userId: string | null = null;

        // Function to establish connection to WebSocket
        const connectToWebSocket = async () => {
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

                userId = user.id;

                if (!mounted) return;

                // Set up handlers before connecting
                wsService.setHandlers({
                    onConnect: () => {
                        if (!mounted) return;
                        console.log("WebSocket connected successfully");
                        setIsConnected(true);
                        setError(null);

                        // Automatically join queue if in JOINING state
                        if (queueStatus === 'JOINING' && wsService.isConnected()) {
                            console.log("Auto-joining queue after connection");
                            wsService.send("JOIN_QUEUE");
                        }
                    },
                    onMessage: (message: WebSocketMessage) => {
                        if (!mounted) return;
                        console.log("Received message:", message);
                        handleQueueMessage(message);
                    },
                    onError: (error: Error) => {
                        if (!mounted) return;
                        console.error("WebSocket error:", error);
                        setIsConnected(false);
                        setError(error.message);
                        // Don't set to ERROR immediately, allow reconnection attempts
                        if (queueStatus !== 'ERROR') {
                            toast({
                                title: "Connection Issue",
                                description: "Attempting to reconnect...",
                                variant: "destructive"
                            });
                        }
                    },
                    onDisconnect: () => {
                        if (!mounted) return;
                        console.log("WebSocket disconnected");
                        setIsConnected(false);

                        // Only update UI if disconnection persists
                        setTimeout(() => {
                            if (!mounted || wsService.isConnected()) return;
                            setError("Connection lost - please refresh the page");
                            setQueueStatus('ERROR');
                        }, 5000);
                    }
                });

                // Connect with retry logic
                if (!wsService.isConnected()) {
                    console.log("Initiating WebSocket connection");
                    wsService.connect(user.id);
                } else {
                    console.log("WebSocket already connected");
                    setIsConnected(true);
                }
            } catch (error) {
                if (!mounted) return;
                console.error("Failed to initialize queue:", error);
                setError("Failed to connect to matchmaking");
                setQueueStatus('ERROR');
            }
        };

        // Connect immediately
        connectToWebSocket();

        // Attempt to reconnect periodically if connection fails
        const reconnectInterval = setInterval(() => {
            if (!wsService.isConnected() && userId) {
                console.log("Attempting to reconnect WebSocket");
                wsService.connect(userId);
            }
        }, 10000);

        return () => {
            mounted = false;
            clearInterval(reconnectInterval);

            if (queueStatus === 'IN_QUEUE') {
                wsService.send("LEAVE_QUEUE");
            }
            // Don't disconnect here - maintain the connection across page changes
            // wsService.disconnect();
        };
    }, [router]);  // Remove queueStatus from dependency array to prevent recreation of connection

    // Timer for wait time
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null

        if (queueStatus === 'IN_QUEUE') {
            intervalId = setInterval(() => {
                setWaitTime(prev => prev + 1)
            }, 1000)
        } else {
            setWaitTime(0)
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [queueStatus])

    const handleQueueMessage = (message: WebSocketMessage) => {
        switch (message.type) {
            case "QUEUE_JOINED":
                setQueueStatus('IN_QUEUE')
                setPlayersInQueue(message.playersInQueue as number || 0)
                toast({
                    title: "Joined Queue",
                    description: "Looking for an opponent...",
                    variant: "default"
                })
                break

            case "QUEUE_UPDATE":
                setPlayersInQueue(message.playersInQueue as number || 0)
                break

            case "QUEUE_MATCHED":
                setQueueStatus('MATCHED')
                toast({
                    title: "Match Found!",
                    description: "Connecting to game...",
                    variant: "default"
                })
                setTimeout(() => {
                    router.push(`/game/${message.gameId as string}`)
                }, 1500)
                break

            case "QUEUE_LEFT":
                setQueueStatus('IDLE')
                setWaitTime(0)
                toast({
                    title: "Left Queue",
                    description: "You left the matchmaking queue",
                    variant: "default"
                })
                break

            case "QUEUE_ERROR":
                setQueueStatus('ERROR')
                setError(message.error as string || "Matchmaking error")
                toast({
                    title: "Queue Error",
                    description: message.error || "An error occurred",
                    variant: "destructive"
                })
                break
        }
    }

    const joinQueue = () => {
        if (queueStatus !== 'IDLE') return;

        setQueueStatus('JOINING');

        if (!wsService.isConnected()) {
            // Connection isn't ready yet, joining will happen via onConnect handler
            console.log("Not connected yet - will join queue after connection");
            toast({
                title: "Connecting...",
                description: "Establishing connection to server",
                variant: "default"
            });
            return;
        }

        // If connected, send immediately
        console.log("Sending JOIN_QUEUE message");
        const sent = wsService.send("JOIN_QUEUE");

        if (!sent) {
            console.log("Failed to send JOIN_QUEUE, will retry automatically");
            toast({
                title: "Connection Issue",
                description: "Trying to reconnect...",
                variant: "default"
            });
        }
    }

    const leaveQueue = () => {
        if (!isConnected) return
        wsService.send("LEAVE_QUEUE")
        setQueueStatus('IDLE')
        router.push("/profile")
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (error && queueStatus === 'ERROR') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
                    <p className="text-white mb-6">{error}</p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                        <Button variant="outline" onClick={() => router.push("/profile")}>
                            Back to Profile
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
            {/* Navigation */}
            <div className="absolute top-6 left-8">
                <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                    onClick={() => router.push("/profile")}
                >
                    <Home className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content */}
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md w-full mx-4">
                <h1 className="text-3xl font-bold text-white mb-4">Matchmaking</h1>

                <Button
                    variant="ghost"
                    onClick={() => router.push("/profile")}
                    className="mb-6 text-white/70 hover:text-white hover:bg-white/10"
                >
                    <X className="w-4 h-4 mr-2" />
                    Back to Profile
                </Button>

                {/* Idle State */}
                {queueStatus === 'IDLE' && (
                    <div className="space-y-6">
                        <div className="text-white">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-80" />
                            <p className="text-lg mb-2">Ready to play?</p>
                            <p className="text-sm opacity-80">Find an opponent and start a game</p>
                        </div>
                        <Button
                            onClick={joinQueue}
                            disabled={!isConnected}
                            className="w-full py-3 text-lg"
                        >
                            {!isConnected ? "Connecting..." : "Join Queue"}
                        </Button>
                    </div>
                )}

                {/* Joining State */}
                {queueStatus === 'JOINING' && (
                    <div className="space-y-6">
                        <div className="text-white">
                            <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
                            <p className="text-lg">Joining queue...</p>
                        </div>
                        <Button
                            onClick={leaveQueue}
                            variant="outline"
                            className="w-full py-3 text-lg bg-red-500/20 text-white border-red-400 hover:bg-red-500/30"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                )}

                {/* In Queue State */}
                {queueStatus === 'IN_QUEUE' && (
                    <div className="space-y-6">
                        <div className="text-white">
                            <div className="animate-pulse">
                                <Clock className="w-16 h-16 mx-auto mb-4" />
                            </div>
                            <p className="text-xl font-semibold mb-2">Looking for opponent...</p>
                            <div className="space-y-2">
                                <p className="text-sm opacity-80">Wait time: {formatTime(waitTime)}</p>
                                {playersInQueue > 0 && (
                                    <p className="text-sm opacity-80">{playersInQueue} players in queue</p>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={leaveQueue}
                            variant="outline"
                            className="w-full py-3 text-lg bg-red-500/20 text-white border-red-400 hover:bg-red-500/30"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Leave Queue
                        </Button>
                    </div>
                )}

                {/* Matched State */}
                {queueStatus === 'MATCHED' && (
                    <div className="space-y-6">
                        <div className="text-white">
                            <div className="animate-bounce">
                                <Users className="w-16 h-16 mx-auto mb-4 text-green-400" />
                            </div>
                            <p className="text-xl font-semibold text-green-300">Match Found!</p>
                            <p className="text-sm opacity-80 mt-2">Connecting to game...</p>
                        </div>
                        <div className="animate-spin w-8 h-8 border-4 border-green-400/30 border-t-green-400 rounded-full mx-auto"></div>
                    </div>
                )}
            </div>
        </div>
    )
} 