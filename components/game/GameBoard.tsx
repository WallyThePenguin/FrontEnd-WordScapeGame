import { motion } from "framer-motion"

interface GameBoardProps {
    board: string[][]
    selectedCells: { row: number; col: number }[]
    onCellClick: (row: number, col: number) => void
    lastMove?: {
        playerId: string
        word: string
        score: number
        position: { row: number; col: number }
        direction: "horizontal" | "vertical"
    }
}

export default function GameBoard({ board, selectedCells, onCellClick, lastMove }: GameBoardProps) {
    const isCellSelected = (row: number, col: number) => {
        return selectedCells.some(cell => cell.row === row && cell.col === col)
    }

    const isLastMoveCell = (row: number, col: number) => {
        if (!lastMove) return false
        const { position, direction } = lastMove
        if (direction === "horizontal") {
            return row === position.row && col >= position.col && col < position.col + lastMove.word.length
        } else {
            return col === position.col && row >= position.row && row < position.row + lastMove.word.length
        }
    }

    return (
        <motion.div
            className="grid grid-cols-15 gap-1 bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow-lg"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {board.map((row, rowIndex) => (
                row.map((cell, colIndex) => (
                    <motion.button
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-12 h-12 flex items-center justify-center rounded-md text-xl font-bold transition-all duration-200
                            ${isCellSelected(rowIndex, colIndex)
                                ? "bg-blue-500/50 border-2 border-blue-400 text-white"
                                : isLastMoveCell(rowIndex, colIndex)
                                    ? "bg-green-500/30 border border-green-400 text-white"
                                    : "bg-white/20 border border-white/30 text-white hover:bg-white/30"
                            }`}
                        onClick={() => onCellClick(rowIndex, colIndex)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {cell}
                    </motion.button>
                ))
            ))}
        </motion.div>
    )
} 