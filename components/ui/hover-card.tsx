'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '@/lib/utils'

export interface HoverCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const HoverCard = React.forwardRef<HTMLDivElement, HoverCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          'rounded-lg border border-input/40 bg-gradient-to-br from-background to-background/95 p-6 transition-all duration-300',
          className
        )}
        {...(props as any)}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    )
  }
)

HoverCard.displayName = 'HoverCard'

export default HoverCard
