"use client"

import { useState, useEffect } from "react"
import GameBoard from "@/components/game-board"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Settings, Trophy, User, RefreshCw } from "lucide-react"

export default function GamePage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isNewGame, setIsNewGame] = useState(true)

    useEffect(() => {
        // Simulate loading time
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 1000)

        return () => clearTimeout(timer)
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center text-white"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-bold">Loading your game...</h2>
                    <p className="text-white/80">Preparing your word adventure</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/z0fc5qn4jjl41.jpg-8kMGT20OVci9E5ub3SeOQ644GRLdBR.jpeg')",
                        backgroundBlendMode: "overlay",
                        filter: "blur(8px)",
                        transform: "scale(1.1)",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/70 to-purple-800/70" />
            </div>

            {/* Game content */}
            <div className="relative z-10 container mx-auto py-6 px-4 flex flex-col min-h-screen">
                {/* Top navigation */}
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={() => router.push("/")}
                    >
                        <Home className="h-5 w-5" />
                    </Button>

                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                            onClick={() => setIsNewGame(!isNewGame)}
                        >
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                        >
                            <Trophy className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                        >
                            <User className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Game board */}
                <motion.div
                    className="flex-1 flex items-center justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    key={isNewGame ? "new-game" : "current-game"}
                >
                    <GameBoard />
                </motion.div>
            </div>
        </div>
    )
}