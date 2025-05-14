"use client"

import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"

interface GameHeaderProps {
    gameStatus: string
    progress: number
    timeLeft: string
    foundWords: number
    possibleWords: number
}

export default function GameHeader({ gameStatus, progress, timeLeft, foundWords, possibleWords }: GameHeaderProps) {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex items-center justify-between">
            <motion.div
                className="text-xl font-bold"
                animate={{
                    scale: gameStatus === "Good!" ? [1, 1.05, 1] : 1,
                }}
                transition={{ duration: 0.5, repeat: 3, repeatType: "reverse" }}
            >
                {gameStatus}
            </motion.div>

            <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
                <div className="flex flex-col w-full">
                    <div className="flex justify-between text-xs mb-1">
                        <span>{foundWords} found</span>
                        <span>{possibleWords} possible</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-white/20" />
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                        <motion.div
                            key={step}
                            className={`w-3 h-3 rounded-full ${progress >= step * 20 ? "bg-white" : "bg-white/30"}`}
                            animate={{
                                scale: progress >= step * 20 && progress < (step + 1) * 20 ? [1, 1.2, 1] : 1,
                            }}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>
            </div>

            <motion.div
                className="text-xl font-mono font-bold"
                animate={{
                    color: timeLeft <= "01:00" ? ["#ffffff", "#ff0000", "#ffffff"] : "#ffffff",
                }}
                transition={{ duration: 1, repeat: timeLeft <= "01:00" ? Number.POSITIVE_INFINITY : 0 }}
            >
                {timeLeft}
            </motion.div>
        </div>
    )
}