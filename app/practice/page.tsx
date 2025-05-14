"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Settings, Trophy, User, RefreshCw, RotateCw, Delete, Send, Sparkles, Power } from "lucide-react"
import { wsService } from "@/services/websocket"
import { WebSocketMessage } from "@/types/websocket"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface PracticeState {
    letters: string[]
    currentWord: string[]
    foundWords: string[]
    score: number
    combo: number
    timeRemaining: string
    possibleWords: number
    gameStatus: 'PENDING' | 'ACTIVE' | 'FINISHED'
}

export default function PracticePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [error, setError] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isShaking, setIsShaking] = useState(false)
    const [practiceState, setPracticeState] = useState<PracticeState>({
        letters: [],
        currentWord: [],
        foundWords: [],
        score: 0,
        combo: 0,
        timeRemaining: "00:00",
        possibleWords: 0,
        gameStatus: 'PENDING'
    })
    const [foundCount, setFoundCount] = useState(0)
    const [comboTimer, setComboTimer] = useState(0)
    const [rerollTimer, setRerollTimer] = useState(30)
    const rerollInterval = 30 // seconds

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

            wsService.setHandlers({
                onConnect: () => {
                    console.log("WebSocket connected")
                    setIsConnected(true)
                    setError(null)
                    wsService.send("START_PRACTICE", {})
                },
                onMessage: (message: WebSocketMessage) => {
                    console.log("Received message:", message)
                    handlePracticeMessage(message)
                },
                onError: (error: Error) => {
                    console.error("WebSocket error:", error)
                    setIsConnected(false)
                    setError(error.message)
                },
                onDisconnect: () => {
                    console.log("WebSocket disconnected")
                    setIsConnected(false)
                    setError("Connection lost")
                }
            })

            wsService.connect(user.id)

            return () => {
                wsService.disconnect()
            }
        } catch (error) {
            console.error("Failed to initialize practice:", error)
            setError("Failed to initialize practice mode")
        }
    }, [router])

    useEffect(() => {
        let rerollIntervalId: NodeJS.Timeout | null = null

        if (practiceState.gameStatus === 'ACTIVE') {
            setRerollTimer(rerollInterval)
            rerollIntervalId = setInterval(() => {
                setRerollTimer(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)
        } else {
            setRerollTimer(rerollInterval)
        }

        return () => {
            if (rerollIntervalId) clearInterval(rerollIntervalId)
        }
    }, [practiceState.gameStatus])

    useEffect(() => {
        if (comboTimer > 0) {
            const intervalId = setInterval(() => {
                setComboTimer(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [comboTimer]);

    const handlePracticeMessage = (message: WebSocketMessage) => {
        console.log("Handling message:", message)
        switch (message.type) {
            case "PRACTICE_STARTED":
                console.log("PRACTICE_STARTED - Letters:", message.letters)
                setPracticeState(prev => {
                    const newState: PracticeState = {
                        ...prev,
                        letters: message.letters?.split("") || [],
                        gameStatus: 'ACTIVE',
                        possibleWords: message.possibleWords || 0,
                        score: 0, // Reset score for new session
                        combo: 0, // Reset combo for new session
                        foundWords: [] // Reset found words for new session
                    }
                    console.log("New state after PRACTICE_STARTED:", newState)
                    return newState
                })
                toast({
                    title: message.isNewSession ? "New Practice Session" : "Practice Session Resumed",
                    description: `Find ${message.possibleWords} possible words!`,
                    variant: "default"
                })
                setFoundCount(0)
                setRerollTimer(rerollInterval)
                setComboTimer(0)
                break

            case "PRACTICE_LETTERS_UPDATED":
                console.log("PRACTICE_LETTERS_UPDATED - Letters:", message.letters)
                setPracticeState(prev => {
                    const newState: PracticeState = {
                        ...prev,
                        letters: message.letters?.split("") || prev.letters,
                        currentWord: [], // Clear current word on new letters
                        possibleWords: message.possibleWords || prev.possibleWords
                    }
                    console.log("New state after PRACTICE_LETTERS_UPDATED:", newState)
                    return newState
                })
                toast({
                    title: "New Letters!",
                    description: message.reason === "AUTO_REROLL" ? "Auto-rerolled after 30s" : "Manual reroll",
                    variant: "default"
                })
                setFoundCount(0)
                setRerollTimer(rerollInterval)
                setComboTimer(0)
                break

            case "PRACTICE_WORD_RESULT":
                console.log("PRACTICE_WORD_RESULT - Current state:", practiceState)
                if (message.success) {
                    setPracticeState(prev => {
                        const newState: PracticeState = {
                            ...prev,
                            foundWords: [...prev.foundWords, message.word],
                            score: message.finalScore,
                            combo: message.comboLevel,
                            currentWord: [], // Clear current word but keep letters
                            letters: prev.letters // Preserve the letters
                        }
                        console.log("New state after successful word:", newState)
                        return newState
                    })
                    // Show success toast with detailed score breakdown
                    toast({
                        title: "Word Accepted!",
                        description: (
                            <div className="space-y-1">
                                <p>Word: {message.word}</p>
                                <p>Base Score: +{message.baseScore}</p>
                                <p>Bonus: +{message.bonusScore}</p>
                                {message.comboLevel > 0 && (
                                    <p className="text-yellow-500">Combo: {message.comboLevel}x!</p>
                                )}
                                <p className="font-bold">Total: {message.finalScore}</p>
                            </div>
                        ),
                        variant: "default"
                    })
                    setError(null)
                    setFoundCount(prev => prev + 1)
                    setComboTimer(5) // Reset combo timer on success
                } else {
                    setPracticeState(prev => {
                        const newState: PracticeState = {
                            ...prev,
                            combo: 0,
                            currentWord: [], // Clear current word but keep letters
                            letters: prev.letters // Preserve the letters
                        }
                        console.log("New state after failed word:", newState)
                        return newState
                    })
                    // Trigger shake animation
                    setIsShaking(true)
                    setTimeout(() => setIsShaking(false), 500) // Reset after animation
                    setComboTimer(0) // Reset combo timer on fail
                }
                break

            case "PRACTICE_ENDED":
                setPracticeState(prev => ({
                    ...prev,
                    gameStatus: 'FINISHED'
                }))
                toast({
                    title: "Practice Session Ended",
                    description: (
                        <div className="space-y-1">
                            <p>Final Score: {message.finalScore}</p>
                            {message.newBest && (
                                <p className="text-yellow-500 font-bold">New Best Score! 🎉</p>
                            )}
                        </div>
                    ),
                    variant: "default"
                })
                break
        }
    }

    // Add effect to log state changes
    useEffect(() => {
        console.log("Practice state updated:", practiceState)
    }, [practiceState])

    const handleLetterClick = (letter: string) => {
        if (!isConnected) return
        setPracticeState(prev => ({
            ...prev,
            currentWord: [...prev.currentWord, letter]
        }))
    }

    const handleDelete = () => {
        if (!isConnected) return
        setPracticeState(prev => ({
            ...prev,
            currentWord: prev.currentWord.slice(0, -1)
        }))
    }

    const handleShuffle = () => {
        if (!isConnected) return
        setPracticeState(prev => ({
            ...prev,
            letters: [...prev.letters].sort(() => Math.random() - 0.5)
        }))
    }

    const handleNewLetters = () => {
        if (!isConnected) return
        wsService.send("PRACTICE_REROLL", {})
        setPracticeState(prev => ({
            ...prev,
            currentWord: []
        }))
    }

    const handleEnter = () => {
        if (!isConnected) return
        if (practiceState.currentWord.length > 0) {
            const word = practiceState.currentWord.join("")
            if (practiceState.foundWords.includes(word)) {
                setError("Word already found!")
            } else {
                wsService.send("PRACTICE_WORD_SUBMIT", {
                    word
                })
            }
            setPracticeState(prev => ({
                ...prev,
                currentWord: []
            }))
        }
    }

    const endPractice = () => {
        if (!isConnected) return
        wsService.send("PRACTICE_END", {})
        router.push("/profile")
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
                    <p className="text-white mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        )
    }

    if (practiceState.gameStatus === 'PENDING') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-white">Loading practice mode...</div>
            </div>
        )
    }

    return (
        <div className={cn(
            "min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center relative overflow-hidden",
            isShaking && "animate-shake"
        )}>
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
                <Button variant="ghost" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12">
                    <Trophy className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12">
                    <User className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="bg-red-500/20 text-white hover:bg-red-500/30 rounded-full w-12 h-12"
                    onClick={endPractice}
                >
                    <Power className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-full w-12 h-12">
                    <Settings className="h-5 w-5" />
                </Button>
            </div>

            {/* Game content */}
            <div className="relative w-full max-w-4xl bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-0 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between px-8 pt-6 pb-2">
                    <div className="text-lg font-bold text-white">
                        Score: {practiceState.score}
                        {practiceState.combo > 0 && (
                            <span className="ml-2 text-yellow-300">Combo: {practiceState.combo}x!</span>
                        )}
                        {practiceState.combo > 0 && (
                            <div className="text-xs text-yellow-200 mt-1">Combo Timer: {comboTimer}s</div>
                        )}
                    </div>
                    <div className="flex-1 mx-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/80">{foundCount} found</span>
                            <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                                    style={{ width: `${(foundCount / practiceState.possibleWords) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-white/80">{practiceState.possibleWords} possible</span>
                        </div>
                    </div>
                    <div className="text-sm font-mono text-white bg-purple-500/80 px-4 py-1 rounded-xl">
                        {rerollTimer}s
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col md:flex-row p-6 gap-6">
                    {/* Left: Circle letters and controls */}
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="relative w-64 h-64 flex items-center justify-center">
                            {practiceState.letters.map((letter, i) => {
                                const angle = (i / practiceState.letters.length) * 2 * Math.PI
                                const radius = 110
                                const x = Math.cos(angle) * radius
                                const y = Math.sin(angle) * radius
                                return (
                                    <button
                                        key={i}
                                        className="absolute w-14 h-14 flex items-center justify-center rounded-full bg-white/80 text-2xl font-bold text-blue-700 shadow-lg hover:bg-blue-200"
                                        style={{ left: `calc(50% + ${x}px - 1.75rem)`, top: `calc(50% + ${y}px - 1.75rem)` }}
                                        onClick={() => handleLetterClick(letter)}
                                        disabled={!isConnected}
                                    >
                                        {letter}
                                    </button>
                                )
                            })}
                        </div>
                        {/* Controls */}
                        <div className="flex gap-4 mt-6">
                            <Button variant="secondary" className="px-6" onClick={handleDelete} disabled={!isConnected}>
                                <Delete className="w-5 h-5 mr-2" />Delete
                            </Button>
                            <Button variant="secondary" className="px-6" onClick={handleShuffle} disabled={!isConnected}>
                                <RotateCw className="w-5 h-5 mr-2" />
                            </Button>
                            <Button
                                variant="secondary"
                                className="px-6"
                                onClick={handleNewLetters}
                                disabled={!isConnected}
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                            </Button>
                            <Button variant="default" className="px-6" onClick={handleEnter} disabled={!isConnected}>
                                <Send className="w-5 h-5 mr-2" />Enter
                            </Button>
                        </div>
                        <div className="mt-6 text-lg text-center text-blue-900 font-semibold">
                            Current word: <span className="tracking-widest">
                                {practiceState.currentWord.length ? practiceState.currentWord.join("") : "_ _ _"}
                            </span>
                        </div>
                    </div>

                    {/* Right: Word list */}
                    <div className="flex flex-col gap-4 w-full md:w-80">
                        <div className="bg-white/60 rounded-xl p-4 min-h-[120px]">
                            <div className="font-semibold text-blue-900 mb-2">
                                You have found <span className="font-bold">{practiceState.foundWords.length} words</span>:
                            </div>
                            <ul className="list-disc list-inside text-blue-800">
                                {practiceState.foundWords.length === 0 ? (
                                    <li className="text-blue-400">No words yet</li>
                                ) : (
                                    practiceState.foundWords.map((w, i) => <li key={i}>{w}</li>)
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
`

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
} 