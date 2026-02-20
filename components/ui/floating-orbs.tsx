'use client'

import { motion } from 'framer-motion'
import React from 'react'

export interface FloatingOrbsProps {
  count?: number
  className?: string
}

export const FloatingOrbs = ({ count = 3, className = '' }: FloatingOrbsProps) => {
  const orbs = Array.from({ length: count }, (_, i) => i)

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {orbs.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20 blur-3xl"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)`,
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, 50, -30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}
    </div>
  )
}

export default FloatingOrbs
