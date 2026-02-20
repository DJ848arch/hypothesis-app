'use client'

import { motion } from 'framer-motion'
import React from 'react'

export interface FadeInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  className?: string
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  (
    {
      children,
      delay = 0,
      duration = 0.5,
      direction = 'up',
      className,
    },
    ref
  ) => {
    const directionVariants = {
      up: { y: 20 },
      down: { y: -20 },
      left: { x: 20 },
      right: { x: -20 },
      none: {},
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...directionVariants[direction] }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        transition={{
          duration,
          delay,
          ease: 'easeOut',
        }}
        viewport={{ once: true, margin: '-100px' }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)

FadeIn.displayName = 'FadeIn'

export default FadeIn
