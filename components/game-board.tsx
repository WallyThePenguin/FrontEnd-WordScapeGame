"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import LetterTile from "./letter-tile"
import LetterConnector from "./letter-connector"
import WordList from "./word-list"
import GameHeader from "./game-header"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

// Dictionary of common English words (simplified for demo)
const DICTIONARY = [
    "ACT",
    "ART",
    "ASK",
    "BAD",
    "BAG",
    "BAT",
    "BED",
    "BEE",
    "BET",
    "BIG",
    "BIT",
    "BOX",
    "BOY",
    "BUG",
    "BUS",
    "BUT",
    "BUY",
    "CAN",
    "CAP",
    "CAR",
    "CAT",
    "COW",
    "CRY",
    "CUT",
    "DAD",
    "DAY",
    "DID",
    "DIE",
    "DOG",
    "DRY",
    "EAR",
    "EAT",
    "EGG",
    "END",
    "EYE",
    "FAR",
    "FAT",
    "FEW",
    "FIT",
    "FIX",
    "FLY",
    "FOR",
    "FUN",
    "GAS",
    "GET",
    "GOD",
    "GOT",
    "GUN",
    "HAD",
    "HAT",
    "HAS",
    "HAY",
    "HER",
    "HID",
    "HIM",
    "HIS",
    "HIT",
    "HOT",
    "HOW",
    "ICE",
    "ILL",
    "ITS",
    "JOB",
    "JOY",
    "KEY",
    "KID",
    "LAW",
    "LAY",
    "LED",
    "LEG",
    "LET",
    "LIE",
    "LIP",
    "LOT",
    "LOW",
    "MAN",
    "MAP",
    "MAY",
    "MEN",
    "MET",
    "MIX",
    "MOM",
    "MUD",
    "NET",
    "NEW",
    "NOT",
    "NOW",
    "NUT",
    "OFF",
    "OIL",
    "OLD",
    "ONE",
    "OUR",
    "OUT",
    "OWN",
    "PAY",
    "PEN",
    "PET",
    "PIE",
    "PIG",
    "PIN",
    "POT",
    "PUT",
    "RAN",
    "RAT",
    "RED",
    "RID",
    "RIP",
    "RUN",
    "SAD",
    "SAT",
    "SAW",
    "SAY",
    "SEA",
    "SEE",
    "SET",
    "SHE",
    "SHY",
    "SIN",
    "SIT",
    "SIX",
    "SKY",
    "SON",
    "SUN",
    "TAX",
    "TEA",
    "TEN",
    "THE",
    "TIE",
    "TIP",
    "TOE",
    "TOO",
    "TOP",
    "TOY",
    "TRY",
    "TWO",
    "USE",
    "VAN",
    "WAR",
    "WAS",
    "WAY",
    "WET",
    "WHO",
    "WHY",
    "WIN",
    "WON",
    "YES",
    "YET",
    "YOU",
    "ZOO",
    "ABLE",
    "ACID",
    "AGED",
    "ALSO",
    "AREA",
    "ARMY",
    "AWAY",
    "BABY",
    "BACK",
    "BALL",
    "BAND",
    "BANK",
    "BASE",
    "BATH",
    "BEAR",
    "BEAT",
    "BEEN",
    "BEER",
    "BELL",
    "BELT",
    "BEST",
    "BILL",
    "BIRD",
    "BLOW",
    "BLUE",
    "BOAT",
    "BODY",
    "BOMB",
    "BOND",
    "BONE",
    "BOOK",
    "BOOM",
    "BORN",
    "BOSS",
    "BOTH",
    "BOWL",
    "BULK",
    "BURN",
    "BUSH",
    "BUSY",
    "CALL",
    "CALM",
    "CAME",
    "CAMP",
    "CARD",
    "CARE",
    "CASE",
    "CASH",
    "CAST",
    "CELL",
    "CHAT",
    "CHIP",
    "CITY",
    "CLUB",
    "COAL",
    "COAT",
    "CODE",
    "COLD",
    "COME",
    "COOK",
    "COOL",
    "COPE",
    "COPY",
    "CORE",
    "COST",
    "CREW",
    "CROP",
    "DARK",
    "DATA",
    "DATE",
    "DAWN",
    "DAYS",
    "DEAD",
    "DEAL",
    "DEAN",
    "DEAR",
    "DEBT",
    "DEEP",
    "DENY",
    "DESK",
    "DIAL",
    "DICK",
    "DIET",
    "DIRT",
    "DISC",
    "DISK",
    "DOES",
    "DONE",
    "DOOR",
    "DOSE",
    "DOWN",
    "DRAW",
    "DREW",
    "DROP",
    "DRUG",
    "DUAL",
    "DUKE",
    "DUST",
    "DUTY",
    "EACH",
    "EARN",
    "EASE",
    "EAST",
    "EASY",
    "EDGE",
    "ELSE",
    "EVEN",
    "EVER",
    "EVIL",
    "EXIT",
    "FACE",
    "FACT",
    "FAIL",
    "FAIR",
    "FALL",
    "FARM",
    "FAST",
    "FATE",
    "FEAR",
    "FEED",
    "FEEL",
    "FEET",
    "FELL",
    "FELT",
    "FILE",
    "FILL",
    "FILM",
    "FIND",
    "FINE",
    "FIRE",
    "FIRM",
    "FISH",
    "FIVE",
    "FLAT",
    "FLOW",
]

export default function GameBoard() {
    const [letters, setLetters] = useState<string[]>([])
    const [selectedLetters, setSelectedLetters] = useState<string[]>([])
    const [selectedPositions, setSelectedPositions] = useState<Array<{ x: number; y: number }>>([])
    const [currentWord, setCurrentWord] = useState<string>("")
    const [playerWords, setPlayerWords] = useState<string[]>([])
    const [opponentWords, setOpponentWords] = useState<string[]>([])
    const [timeLeft, setTimeLeft] = useState<number>(359) // 5:59 in seconds
    const [progress, setProgress] = useState<number>(0)
    const [gameStatus, setGameStatus] = useState<string>("Good!")
    const [possibleWords, setPossibleWords] = useState<string[]>([])
    const [letterPositions, setLetterPositions] = useState<Array<{ x: number; y: number }>>([])
    const [containerSize, setContainerSize] = useState({ width: 288, height: 288 }) // Default size
    const containerRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    // Generate random letters
    useEffect(() => {
        generateRandomLetters()
    }, [])

    // Calculate letter positions in a circle
    useEffect(() => {
        if (letters.length > 0) {
            const positions = calculateLetterPositions(letters.length)
            setLetterPositions(positions)
        }
    }, [letters])

    // Find possible words when letters change
    useEffect(() => {
        if (letters.length > 0) {
            const words = findPossibleWords(letters)
            setPossibleWords(words)
        }
    }, [letters])

    // Update container size when component mounts or window resizes
    useEffect(() => {
        const updateContainerSize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect()
                setContainerSize({ width, height })
            }
        }

        // Initial size
        updateContainerSize()

        // Update on resize
        window.addEventListener("resize", updateContainerSize)
        return () => window.removeEventListener("resize", updateContainerSize)
    }, [])

    // Timer countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    // Calculate positions for letters in a circle (no center letter)
    const calculateLetterPositions = (count: number) => {
        const positions = []
        // Adjusted radius to position letters in a perfect circle that fits the container
        // The value 42 positions the letters closer to the edge but with enough margin
        const radius = 42

        for (let i = 0; i < count; i++) {
            // Calculate angle for even distribution
            const angle = (i / count) * 2 * Math.PI
            // Calculate x and y coordinates based on angle and radius
            const x = 50 + radius * Math.cos(angle)
            const y = 50 + radius * Math.sin(angle)
            positions.push({ x, y })
        }

        return positions
    }

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    // Generate 7 random letters (with vowels guaranteed)
    const generateRandomLetters = () => {
        const vowels = ["A", "E", "I", "O", "U"]
        const consonants = [
            "B",
            "C",
            "D",
            "F",
            "G",
            "H",
            "J",
            "K",
            "L",
            "M",
            "N",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "V",
            "W",
            "X",
            "Y",
            "Z",
        ]

        // Ensure at least 2 vowels
        const randomVowels = []
        for (let i = 0; i < 2; i++) {
            const randomIndex = Math.floor(Math.random() * vowels.length)
            randomVowels.push(vowels[randomIndex])
        }

        // Fill the rest with random letters (could be vowels or consonants)
        const allLetters = [...vowels, ...consonants]
        const randomLetters = []
        for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * allLetters.length)
            randomLetters.push(allLetters[randomIndex])
        }

        // Combine and shuffle
        const newLetters = [...randomVowels, ...randomLetters]
        setLetters(newLetters.sort(() => Math.random() - 0.5))

        // Reset game state
        setSelectedLetters([])
        setSelectedPositions([])
        setCurrentWord("")
        setPlayerWords([])
        setOpponentWords([])
        setProgress(0)
        setTimeLeft(359)
    }

    // Find all possible words that can be formed with the given letters
    const findPossibleWords = (letterArray: string[]): string[] => {
        const letterPool = [...letterArray]
        return DICTIONARY.filter((word) => {
            // Check if the word can be formed with the available letters
            const wordLetters = word.split("")
            const letterPoolCopy = [...letterPool]

            return wordLetters.every((letter) => {
                const index = letterPoolCopy.indexOf(letter)
                if (index !== -1) {
                    letterPoolCopy.splice(index, 1)
                    return true
                }
                return false
            })
        })
    }

    // Handle tile click
    const handleTileClick = (letter: string, index: number) => {
        if (selectedLetters.includes(letter + index)) {
            // Find the position in the selected array
            const position = selectedLetters.indexOf(letter + index)

            // Remove this letter and all letters after it (to maintain a valid path)
            const newSelectedLetters = selectedLetters.slice(0, position)
            const newSelectedPositions = selectedPositions.slice(0, position)
            const newCurrentWord = currentWord.slice(0, position)

            setSelectedLetters(newSelectedLetters)
            setSelectedPositions(newSelectedPositions)
            setCurrentWord(newCurrentWord)
        } else {
            // Add to selected letters
            setSelectedLetters([...selectedLetters, letter + index])
            setSelectedPositions([...selectedPositions, letterPositions[index]])
            setCurrentWord(currentWord + letter)
        }
    }

    // Handle word submission
    const handleSubmit = () => {
        if (currentWord.length < 3) {
            toast({
                title: "Word too short",
                description: "Words must be at least 3 letters long",
                variant: "destructive",
            })
            return
        }

        // Check if word is valid (in our dictionary)
        if (possibleWords.includes(currentWord)) {
            if (!playerWords.includes(currentWord)) {
                setPlayerWords([...playerWords, currentWord])

                // Update progress based on word length and total possible words
                const newProgress = Math.min(Math.round(((playerWords.length + 1) / possibleWords.length) * 100), 100)
                setProgress(newProgress)

                toast({
                    title: "Word found!",
                    description: `You found "${currentWord}"`,
                    variant: "default",
                })

                // Simulate opponent finding a word occasionally
                if (Math.random() > 0.7 && opponentWords.length < possibleWords.length / 3) {
                    const availableWords = possibleWords.filter(
                        (word) => !playerWords.includes(word) && !opponentWords.includes(word),
                    )
                    if (availableWords.length > 0) {
                        const randomIndex = Math.floor(Math.random() * availableWords.length)
                        const opponentWord = availableWords[randomIndex]
                        setOpponentWords([...opponentWords, opponentWord])
                    }
                }
            } else {
                toast({
                    title: "Word already found",
                    description: "You've already found this word",
                    variant: "destructive",
                })
            }
        } else {
            toast({
                title: "Not a valid word",
                description: "Try another combination",
                variant: "destructive",
            })
        }

        // Reset selection
        setSelectedLetters([])
        setSelectedPositions([])
        setCurrentWord("")
    }

    // Reset current selection
    const handleReset = () => {
        setSelectedLetters([])
        setSelectedPositions([])
        setCurrentWord("")
    }

    return (
        <Card className="w-full max-w-4xl shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden border-0">
            <CardContent className="p-0">
                <GameHeader
                    gameStatus={gameStatus}
                    progress={progress}
                    timeLeft={formatTime(timeLeft)}
                    foundWords={playerWords.length}
                    possibleWords={possibleWords.length}
                />

                <div className="grid md:grid-cols-2 gap-4 p-6">
                    <div className="flex flex-col items-center justify-center">
                        <div
                            ref={containerRef}
                            className="relative w-80 h-80 mb-6 bg-white/50 rounded-full shadow-inner flex items-center justify-center"
                        >
                            {/* Letter connector lines */}
                            <LetterConnector selectedPositions={selectedPositions} containerSize={containerSize} />

                            {/* Letter tiles */}
                            <div className="letter-grid absolute inset-0">
                                {letters.map(
                                    (letter, index) =>
                                        letterPositions[index] && (
                                            <LetterTile
                                                key={index}
                                                letter={letter}
                                                index={index}
                                                isSelected={selectedLetters.includes(letter + index)}
                                                onClick={() => handleTileClick(letter, index)}
                                                position={letterPositions[index]}
                                            />
                                        ),
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2 w-full max-w-xs justify-between">
                            <Button
                                variant="outline"
                                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800"
                                onClick={handleReset}
                            >
                                Delete
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800"
                                onClick={() => {
                                    setLetters([...letters].sort(() => Math.random() - 0.5))
                                    setSelectedLetters([])
                                    setSelectedPositions([])
                                    setCurrentWord("")
                                    toast({
                                        title: "Letters shuffled",
                                        description: "Try a different arrangement",
                                    })
                                }}
                            >
                                <RefreshCcw className="h-5 w-5" />
                            </Button>
                            <Button
                                className="w-1/3 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                                onClick={handleSubmit}
                            >
                                Enter
                            </Button>
                        </div>

                        <motion.div
                            className="mt-4 text-center"
                            animate={{
                                scale: currentWord ? [1, 1.05, 1] : 1,
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            <p className="text-lg font-medium">
                                Current word: <span className="text-blue-600 font-bold">{currentWord || "_ _ _"}</span>
                            </p>
                        </motion.div>

                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-500">{possibleWords.length} possible words can be formed</p>
                        </div>
                    </div>

                    <div className="flex flex-col h-full">
                        <div className="grid gap-6 h-full">
                            <WordList
                                title="You have found"
                                count={playerWords.length}
                                words={playerWords}
                                highlightColor="text-blue-600 border-blue-400"
                            />

                            <WordList
                                title="Opponent has found"
                                count={opponentWords.length}
                                words={opponentWords}
                                highlightColor="text-pink-500 border-pink-400"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
