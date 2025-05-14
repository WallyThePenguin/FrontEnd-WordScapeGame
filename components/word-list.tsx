"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface WordListProps {
    title: string
    count: number
    words: string[]
    highlightColor: string
}

export default function WordList({ title, count, words, highlightColor }: WordListProps) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-lg font-medium mb-2 flex justify-between">
                <span>
                    {title} <span className="font-bold">{count} words:</span>
                </span>
            </h3>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {words.map((word, index) => (
                    <motion.div
                        key={index}
                        className={cn("border-b pb-1 text-lg font-medium tracking-wide", highlightColor)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                    >
                        {word}
                    </motion.div>
                ))}
            </div>
        </div>
    )
}