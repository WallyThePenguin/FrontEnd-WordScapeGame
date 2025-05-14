"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { apiFetch } from "@/utils/api"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { authApi } from "@/services/api"

interface GameStats {
    totalGames: number
    wins: number
    losses: number
    averageScore: number
    highestScore: number
    recentGames: {
        id: string
        score: number
        result: "win" | "loss"
        date: string
    }[]
}

interface GameMode {
    id: string
    name: string
    description: string
    icon: string
}

export default function ProfilePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [stats, setStats] = useState<GameStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isJoiningGame, setIsJoiningGame] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const gameModes: GameMode[] = [
        {
            id: "practice",
            name: "Practice Mode",
            description: "Play against AI to improve your skills",
            icon: "🎯"
        },
        {
            id: "casual",
            name: "Casual Match",
            description: "Find a random opponent for a quick game",
            icon: "🎮"
        }
    ]

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Get user ID from localStorage with proper error handling
                const userStr = localStorage.getItem("user")
                if (!userStr) {
                    setError("Please log in to view your profile")
                    router.push("/login")
                    return
                }

                let user
                try {
                    user = JSON.parse(userStr)
                } catch (e) {
                    console.error("Failed to parse user data:", e)
                    localStorage.removeItem("user")
                    setError("Your session has expired. Please log in again.")
                    router.push("/login")
                    return
                }

                if (!user || typeof user !== 'object' || !user.id || !user.username) {
                    console.error("Invalid user data structure:", user)
                    localStorage.removeItem("user")
                    setError("Your session is invalid. Please log in again.")
                    router.push("/login")
                    return
                }

                try {
                    const response = await apiFetch<GameStats>(`/data/user/${user.id}/stats`)
                    if (!response || typeof response !== 'object') {
                        throw new Error("Invalid response format from server")
                    }
                    setStats(response)
                } catch (apiError) {
                    console.error("API request failed:", apiError)
                    if (apiError instanceof Error) {
                        if (apiError.message.includes("timed out")) {
                            setError("Request timed out. Please check your connection and try again.")
                        } else if (apiError.message.includes("Failed to fetch")) {
                            setError("Unable to connect to the server. Please check if the server is running.")
                        } else {
                            setError(`Failed to load stats: ${apiError.message}`)
                        }
                    } else {
                        setError("An unexpected error occurred while loading your stats.")
                    }
                    setStats({
                        totalGames: 0,
                        wins: 0,
                        losses: 0,
                        averageScore: 0,
                        highestScore: 0,
                        recentGames: []
                    })
                }
            } catch (error) {
                console.error("Unexpected error:", error)
                setError("An unexpected error occurred. Please try again later.")
                setStats({
                    totalGames: 0,
                    wins: 0,
                    losses: 0,
                    averageScore: 0,
                    highestScore: 0,
                    recentGames: []
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [router])

    const handleGameModeSelect = async (modeId: string) => {
        try {
            setIsJoiningGame(true)
            setError(null)

            const userStr = localStorage.getItem("user")
            if (!userStr) {
                setError("Please log in to play")
                router.push("/login")
                return
            }

            const user = JSON.parse(userStr)
            if (!user || !user.id) {
                setError("Invalid user session")
                return
            }

            if (modeId === "practice") {
                // Simply redirect to practice page
                router.push("/practice")
            } else if (modeId === "casual") {
                // Redirect to queue page
                router.push("/queue")
            }
        } catch (error) {
            console.error("Failed to navigate:", error)
            toast({
                title: "Navigation Error",
                description: "Failed to navigate to game mode. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsJoiningGame(false)
        }
    }

    const handleLogout = () => {
        // Remove all auth-related data from localStorage
        localStorage.removeItem("user")
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")

        // Show success message
        toast({
            title: "Logged out successfully",
            description: "You have been logged out. Redirecting to login page...",
        })

        // Redirect to login page
        router.push("/login")
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center relative">
            {/* Background with overlay */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/z0fc5qn4jjl41.jpg-8kMGT20OVci9E5ub3SeOQ644GRLdBR.jpeg')",
                        backgroundBlendMode: "overlay",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/40 to-blue-900/70" />
            </div>

            {/* Content */}
            <motion.div
                className="relative z-10 w-full max-w-4xl px-4 py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Top navigation */}
                <div className="flex justify-end mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                <div className="text-center mb-8 text-white">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">Player Profile</h1>
                    <p className="text-xl">View your stats and choose a game mode</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-8 bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-500/50">
                        <p className="text-white text-center">{error}</p>
                    </div>
                )}

                {/* Stats Section */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-4">Game Statistics</h2>
                    {isLoading ? (
                        <div className="text-white text-center">
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-white/20 rounded w-3/4 mx-auto"></div>
                                <div className="h-4 bg-white/20 rounded w-1/2 mx-auto"></div>
                            </div>
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <p className="text-white/70">Total Games</p>
                                <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <p className="text-white/70">Win Rate</p>
                                <p className="text-2xl font-bold text-white">
                                    {stats.totalGames > 0
                                        ? `${Math.round((stats.wins / stats.totalGames) * 100)}%`
                                        : "0%"}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <p className="text-white/70">Average Score</p>
                                <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 text-center">
                                <p className="text-white/70">Highest Score</p>
                                <p className="text-2xl font-bold text-white">{stats.highestScore}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-white text-center">Failed to load stats</div>
                    )}
                </div>

                {/* Game Modes Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gameModes.map((mode) => (
                        <motion.div
                            key={mode.id}
                            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleGameModeSelect(mode.id)}
                            style={{ pointerEvents: isJoiningGame ? 'none' : 'auto' }}
                        >
                            <div className="text-4xl mb-4">{mode.icon}</div>
                            <h3 className="text-xl font-semibold text-white mb-2">{mode.name}</h3>
                            <p className="text-white/70">{mode.description}</p>
                            {isJoiningGame && mode.id === "casual" && (
                                <div className="mt-4 text-white/70 text-center">
                                    Finding a game...
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Recent Games Section */}
                {stats?.recentGames && stats.recentGames.length > 0 && (
                    <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <h2 className="text-2xl font-semibold text-white mb-4">Recent Games</h2>
                        <div className="space-y-2">
                            {stats.recentGames.map((game) => (
                                <div
                                    key={game.id}
                                    className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
                                >
                                    <div className="text-white">
                                        <p className="font-medium">Game #{game.id}</p>
                                        <p className="text-sm text-white/70">{game.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-medium">Score: {game.score}</p>
                                        <p
                                            className={`text-sm ${game.result === "win" ? "text-green-400" : "text-red-400"
                                                }`}
                                        >
                                            {game.result.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </main>
    )
} 