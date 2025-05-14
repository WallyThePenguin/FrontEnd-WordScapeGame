import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/z0fc5qn4jjl41.jpg-8kMGT20OVci9E5ub3SeOQ644GRLdBR.jpeg')",
            backgroundBlendMode: "overlay",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-purple-600/30 to-blue-700/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-2 text-white drop-shadow-lg">Word Explorer</h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
            Uncover nature's beauty through the power of words
          </p>
        </div>

        {/* Main buttons */}
        <div className="flex flex-col gap-4 mb-12 w-full max-w-xs">
          <Link
            href="/login"
            className="text-lg py-6 rounded-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 border-0 shadow-lg group text-center"
          >
            Start Game
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Card 1 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-2">Multiplayer Excitement</h3>
              <p className="text-white/80">Engage in turn-based word battles with friends or random opponents</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-2">Visual Storytelling</h3>
              <p className="text-white/80">Reveal stunning nature scenes as you solve word puzzles</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-2">Strategic Gameplay</h3>
              <p className="text-white/80">Combine word skills with puzzle-solving for an immersive experience</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-white/70 text-sm">
        © 2025 Word Explorer. All rights reserved.
      </footer>
    </main>
  )
}
