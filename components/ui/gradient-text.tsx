'use client'

import { motion } from 'framer-motion'
import React from 'react'

export interface GradientTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  colors: string[]
  animationDuration?: number
}

export const GradientText = React.forwardRef<
  HTMLSpanElement,
  GradientTextProps
>(({ className, colors = ['#3b82f6', '#ec4899'], animationDuration = 3, ...props }, ref) => {
  return (
    <motion.span
      ref={ref}
      className={className}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: animationDuration,
        repeat: Infinity,
        ease: 'ease-in-out',
      }}
      {...(props as any)}
    />
  )
})

GradientText.displayName = 'GradientText'

export default GradientText
