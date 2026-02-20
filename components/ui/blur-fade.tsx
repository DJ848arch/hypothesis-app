'use client'

import { motion } from 'framer-motion'
import React from 'react'

export interface BlurFadeProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  blur?: string
  className?: string
}

export const BlurFade = React.forwardRef<HTMLDivElement, BlurFadeProps>(
  (
    {
      children,
      delay = 0,
      duration = 0.5,
      blur = '12px',
      className,
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, filter: `blur(${blur})` } as any}
        animate={{ opacity: 1, filter: 'blur(0px)' } as any}
        transition={{
          duration,
          delay,
          ease: 'easeOut',
        }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)

BlurFade.displayName = 'BlurFade'

export default BlurFade
