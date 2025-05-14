"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { FormEvent } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { authApi, ApiError } from "@/services/api"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MIN_USERNAME_LENGTH = 3

export default function LoginPage() {
    const router = useRouter()
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [username, setUsername] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Check if user is already logged in
        const userStr = localStorage.getItem("user")
        const accessToken = localStorage.getItem("accessToken")

        if (userStr && accessToken) {
            try {
                const user = JSON.parse(userStr)
                if (user && user.username) {
                    setWelcomeMessage(`Welcome back, ${user.username}!`)
                    // Redirect to profile after a short delay
                    setTimeout(() => {
                        router.push("/profile")
                    }, 2000)
                }
            } catch (e) {
                console.error("Failed to parse user data:", e)
                localStorage.removeItem("user")
                localStorage.removeItem("accessToken")
                localStorage.removeItem("refreshToken")
            }
        }
    }, [router])

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            toast({
                title: "Login failed",
                description: "Please fill in all fields",
                variant: "destructive"
            })
            return
        }

        if (!EMAIL_REGEX.test(email)) {
            toast({
                title: "Login failed",
                description: "Please enter a valid email address",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        try {
            const user = await authApi.login(email, password)

            // Store user data and show welcome message
            localStorage.setItem("user", JSON.stringify(user))
            setWelcomeMessage(`Welcome, ${user.username}!`)

            // Redirect after a short delay
            setTimeout(() => {
                router.push("/profile")
            }, 2000)
        } catch (error) {
            if (error instanceof ApiError) {
                toast({
                    title: "Login failed",
                    description: error.message,
                    variant: "destructive"
                })
            } else {
                toast({
                    title: "Login failed",
                    description: "An unexpected error occurred",
                    variant: "destructive"
                })
            }
            console.error("Login error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault()

        if (!username || !email || !password || !confirmPassword) {
            toast({
                title: "Registration failed",
                description: "Please fill in all fields",
                variant: "destructive"
            })
            return
        }

        if (!EMAIL_REGEX.test(email)) {
            toast({
                title: "Registration failed",
                description: "Please enter a valid email address",
                variant: "destructive"
            })
            return
        }

        if (username.length < MIN_USERNAME_LENGTH) {
            toast({
                title: "Registration failed",
                description: `Username must be at least ${MIN_USERNAME_LENGTH} characters long`,
                variant: "destructive"
            })
            return
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            toast({
                title: "Registration failed",
                description: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
                variant: "destructive"
            })
            return
        }

        if (password !== confirmPassword) {
            toast({
                title: "Registration failed",
                description: "Passwords do not match",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        try {
            const user = await authApi.register(username, email, password)

            // Store user data and show welcome message
            localStorage.setItem("user", JSON.stringify(user))
            setWelcomeMessage(`Welcome, ${user.username}!`)

            // Redirect after a short delay
            setTimeout(() => {
                router.push("/profile")
            }, 2000)
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 409) {
                    toast({
                        title: "Registration failed",
                        description: "A user with this email or username already exists. Please try logging in instead.",
                        variant: "destructive"
                    })
                    // Switch to login tab
                    const loginTab = document.querySelector('[data-value="login"]') as HTMLElement
                    if (loginTab) {
                        loginTab.click()
                    }
                } else {
                    toast({
                        title: "Registration failed",
                        description: error.message,
                        variant: "destructive"
                    })
                }
            } else {
                toast({
                    title: "Registration failed",
                    description: "An unexpected error occurred. Please try again.",
                    variant: "destructive"
                })
            }
            console.error("Registration error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTabChange = (tab: string) => {
        if (tab === "register") {
            setUsername("")
            setEmail("")
            setPassword("")
            setConfirmPassword("")
        }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center relative">
            {/* Background */}
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
                className="relative z-10 w-full max-w-md px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center mb-8 text-white">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">Word Explorer</h1>
                    <p className="text-xl">Unlock nature's beauty with words</p>
                    {welcomeMessage && (
                        <motion.p
                            className="text-2xl font-semibold mt-4 text-green-400"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {welcomeMessage}
                        </motion.p>
                    )}
                </div>

                {!welcomeMessage && (
                    <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange}>
                        <TabsList className="w-full grid grid-cols-2 mb-6">
                            <TabsTrigger value="login" className="text-lg">Login</TabsTrigger>
                            <TabsTrigger value="register" className="text-lg">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-4">
                            <form onSubmit={handleLogin}>
                                <div className="space-y-2">
                                    <label className="text-white text-lg">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white text-lg">Password</label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your password"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 border-0 mt-4"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Signing In...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register" className="space-y-4">
                            <form onSubmit={handleRegister}>
                                <div className="space-y-2">
                                    <label className="text-white text-lg">Username</label>
                                    <Input
                                        type="text"
                                        placeholder="Enter your username"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white text-lg">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white text-lg">Password</label>
                                    <Input
                                        type="password"
                                        placeholder="Create a password"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white text-lg">Confirm Password</label>
                                    <Input
                                        type="password"
                                        placeholder="Confirm your password"
                                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 border-0 mt-4"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                )}

                <p className="text-center mt-6 text-white/70 text-sm">
                    By signing in, you agree to our{" "}
                    <Link href="#" className="underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="#" className="underline">Privacy Policy</Link>.
                </p>
            </motion.div>
        </main>
    )
}