'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '@/lib/utils'

export const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    delay?: number
  }
>(({ className, delay = 0, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.5,
      delay,
      ease: 'easeOut',
    }}
    viewport={{ once: true, margin: '-100px' }}
    className={cn(
      'rounded-lg border border-input/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm',
      className
    )}
    {...(props as any)}
  />
))

AnimatedCard.displayName = 'AnimatedCard'

export default AnimatedCard
