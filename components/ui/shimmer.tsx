'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '@/lib/utils'

export interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  duration?: number
}

export const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, children, duration = 2, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        {...(props as any)}
      >
        {children}
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['100%', '100%'],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>
    )
  }
)

Shimmer.displayName = 'Shimmer'

export default Shimmer
