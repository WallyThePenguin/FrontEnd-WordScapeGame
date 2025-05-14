import { motion } from "framer-motion"

interface Player {
    id: string
    name: string
    score: number
    letters: string[]
}

interface PlayerInfoProps {
    player: Player
    isCurrentTurn: boolean
    selectedLetters: string[]
    onLetterClick: (letter: string, index: number) => void
}

export default function PlayerInfo({ player, isCurrentTurn, selectedLetters, onLetterClick }: PlayerInfoProps) {
    return (
        <motion.div
            className={`p-6 rounded-lg backdrop-blur-sm transition-all duration-300
                ${isCurrentTurn
                    ? "bg-blue-500/30 border-2 border-blue-400"
                    : "bg-white/10 border border-white/20"
                }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{player.name}</h3>
                <div className="flex items-center space-x-2">
                    <span className="text-white/80">Score:</span>
                    <span className="text-2xl font-bold text-white">{player.score}</span>
                </div>
            </div>

            {isCurrentTurn && (
                <motion.div
                    className="text-blue-300 text-sm mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    Your turn!
                </motion.div>
            )}

            <div className="flex gap-2 flex-wrap">
                {player.letters.map((letter, index) => (
                    <motion.button
                        key={index}
                        className={`w-10 h-10 flex items-center justify-center rounded-md text-lg font-bold transition-all duration-200
                            ${selectedLetters[index] === letter
                                ? "bg-blue-500 text-white"
                                : "bg-white/20 text-white hover:bg-white/30"
                            }`}
                        onClick={() => onLetterClick(letter, index)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {letter}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    )
} 