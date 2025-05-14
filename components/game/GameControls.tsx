import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Send, SkipForward } from "lucide-react"

interface GameControlsProps {
    onSubmitWord: () => void
    onPassTurn: () => void
    selectedLetters: string[]
    selectedCells: { row: number; col: number }[]
}

export default function GameControls({
    onSubmitWord,
    onPassTurn,
    selectedLetters,
    selectedCells,
}: GameControlsProps) {
    const canSubmitWord = selectedLetters.length > 0 && selectedCells.length > 0

    return (
        <motion.div
            className="flex justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Button
                variant="default"
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 rounded-full"
                onClick={onSubmitWord}
                disabled={!canSubmitWord}
            >
                <Send className="w-5 h-5 mr-2" />
                Submit Word
            </Button>

            <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 rounded-full"
                onClick={onPassTurn}
            >
                <SkipForward className="w-5 h-5 mr-2" />
                Pass Turn
            </Button>
        </motion.div>
    )
} 