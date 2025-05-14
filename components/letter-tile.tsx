"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LetterTileProps {
    letter: string
    index: number
    isSelected: boolean
    onClick: () => void
    position: { x: number; y: number }
}

export default function LetterTile({ letter, index, isSelected, onClick, position }: LetterTileProps) {
    return (
        <motion.div
            className={cn(
                "absolute w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-lg font-bold text-2xl transition-all duration-200",
                isSelected
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white scale-110 z-20"
                    : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 hover:scale-105",
            )}
            style={{
                top: `${position.y}%`,
                left: `${position.x}%`,
                transform: "translate(-50%, -50%)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: 1,
                scale: isSelected ? 1.1 : 1,
                boxShadow: isSelected ? "0px 0px 15px rgba(255, 165, 0, 0.7)" : "0px 4px 8px rgba(0, 0, 0, 0.1)",
            }}
            transition={{
                duration: 0.3,
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 15,
            }}
        >
            {letter}
        </motion.div>
    )
}