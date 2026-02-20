'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '@/lib/utils'

export interface PulseProps {
  children: React.ReactNode
  intensity?: 'subtle' | 'medium' | 'strong'
  className?: string
}

export const Pulse = React.forwardRef<HTMLDivElement, PulseProps>(
  ({ className, children, intensity = 'subtle' }, ref) => {
    const scales = {
      subtle: { scale: [1, 1.02, 1] },
      medium: { scale: [1, 1.05, 1] },
      strong: { scale: [1, 1.1, 1] },
    }

    return (
      <motion.div
        ref={ref}
        animate={scales[intensity]}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)

Pulse.displayName = 'Pulse'

export default Pulse
