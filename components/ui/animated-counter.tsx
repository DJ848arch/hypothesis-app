'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

export interface AnimatedCounterProps {
  from?: number
  to: number
  duration?: number
  suffix?: string
  prefix?: string
  decimalPlaces?: number
  className?: string
}

export const AnimatedCounter = ({
  from = 0,
  to,
  duration = 2,
  suffix = '',
  prefix = '',
  decimalPlaces = 0,
  className,
}: AnimatedCounterProps) => {
  const count = useMotionValue(from)
  const rounded = useTransform(count, (latest) => {
    const isFloatingPoint = decimalPlaces > 0
    const multiplier = Math.pow(10, decimalPlaces)
    return isFloatingPoint
      ? (Math.round(latest * multiplier) / multiplier).toFixed(decimalPlaces)
      : Math.round(latest).toString()
  })

  useEffect(() => {
    const animation = animate(count, to, {
      duration,
      ease: 'easeOut',
    })

    return animation.stop
  }, [count, to, duration])

  return (
    <span className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

export default AnimatedCounter
