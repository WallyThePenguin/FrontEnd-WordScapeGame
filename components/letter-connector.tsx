"use client"

import { useEffect, useRef } from "react"

interface LetterConnectorProps {
    selectedPositions: Array<{ x: number; y: number }>
    containerSize: { width: number; height: number }
}

export default function LetterConnector({ selectedPositions, containerSize }: LetterConnectorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set canvas dimensions to match container
        canvas.width = containerSize.width
        canvas.height = containerSize.height

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw connections between selected letters
        if (selectedPositions.length > 1) {
            ctx.beginPath()

            // Calculate the center of the first letter
            const firstX = (selectedPositions[0].x / 100) * canvas.width
            const firstY = (selectedPositions[0].y / 100) * canvas.height

            ctx.moveTo(firstX, firstY)

            // Draw lines to each subsequent letter
            for (let i = 1; i < selectedPositions.length; i++) {
                const x = (selectedPositions[i].x / 100) * canvas.width
                const y = (selectedPositions[i].y / 100) * canvas.height
                ctx.lineTo(x, y)
            }

            // Style the line
            ctx.strokeStyle = "#F59E0B" // Amber/orange color
            ctx.lineWidth = 6
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.stroke()
        }
    }, [selectedPositions, containerSize])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ touchAction: "none" }}
        />
    )
}
