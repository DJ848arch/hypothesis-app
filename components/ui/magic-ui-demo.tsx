/**
 * Magic UI Components Documentation
 * Subtle, scientific-grade animations for the Hypothesis platform
 *
 * These components add premium polish without crypto-startup vibes
 */

'use client'

import {
  AnimatedCard,
  AnimatedCounter,
  BlurFade,
  FadeIn,
  FloatingOrbs,
  GradientText,
  HoverCard,
  Pulse,
  Shimmer,
} from '@/components/ui'

export default function MagicUIDemo() {
  return (
    <div className="space-y-12 p-8">
      {/* Animated Cards */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Animated Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <AnimatedCard key={i} delay={i * 0.1} className="p-6">
              <h3 className="font-semibold">Card {i + 1}</h3>
              <p className="text-sm text-muted-foreground">
                Smooth fade-in with staggered delay
              </p>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* Gradient Text */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Gradient Text</h2>
        <div className="text-4xl font-bold">
          <GradientText
            colors={['#3b82f6', '#ec4899', '#8b5cf6']}
            animationDuration={3}
            className="inline"
          >
            Animated Gradient Text
          </GradientText>
        </div>
      </section>

      {/* Animated Counter */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Animated Counter</h2>
        <p className="text-4xl font-bold">
          <AnimatedCounter to={1234} duration={2} suffix=" hypotheses" />
        </p>
      </section>

      {/* Hover Card */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Hover Card</h2>
        <HoverCard className="max-w-md p-6">
          <h3 className="font-semibold mb-2">Hover me!</h3>
          <p className="text-sm text-muted-foreground">
            Lifts and shows gradient on hover - perfect for hypothesis cards
          </p>
        </HoverCard>
      </section>

      {/* Shimmer Effect */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Shimmer Loading</h2>
        <Shimmer className="h-12 rounded-md bg-muted" />
      </section>

      {/* Pulse */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Pulse</h2>
        <div className="space-y-4">
          <Pulse intensity="subtle" className="text-center p-4 bg-muted rounded">
            Subtle Pulse
          </Pulse>
          <Pulse intensity="medium" className="text-center p-4 bg-muted rounded">
            Medium Pulse
          </Pulse>
        </div>
      </section>

      {/* Fade In */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Fade In</h2>
        <FadeIn direction="up" delay={0.2} className="p-6 bg-muted rounded">
          <p className="text-sm">Fades in from bottom</p>
        </FadeIn>
      </section>

      {/* Blur Fade */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Blur Fade</h2>
        <BlurFade duration={0.8} className="p-6 bg-muted rounded max-w-md">
          <p className="text-sm">Fades in with blur effect</p>
        </BlurFade>
      </section>

      {/* Floating Orbs Background */}
      <section>
        <div className="relative h-64 rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted">
          <FloatingOrbs count={3} />
          <div className="relative z-10 flex items-center justify-center h-full">
            <h2 className="text-2xl font-bold">Floating Orbs Background</h2>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * USAGE EXAMPLES
 *
 * // Animated hypothesis cards
 * import { AnimatedCard } from '@/components/ui'
 * {hypotheses.map((h, i) => (
 *   <AnimatedCard key={h.id} delay={i * 0.1} className="p-6">
 *     <h3>{h.title}</h3>
 *   </AnimatedCard>
 * ))}
 *
 * // Counter stats
 * import { AnimatedCounter } from '@/components/ui'
 * <AnimatedCounter to={user.hypothesesCount} duration={1.5} />
 *
 * // Hero gradient text
 * import { GradientText } from '@/components/ui'
 * <h1>
 *   <GradientText colors={['#3b82f6', '#8b5cf6']}>
 *     Scientific Hypothesis Testing
 *   </GradientText>
 * </h1>
 *
 * // Loading states
 * import { Shimmer } from '@/components/ui'
 * <Shimmer className="h-12 rounded bg-muted" />
 *
 * // Hover effects on research cards
 * import { HoverCard } from '@/components/ui'
 * <HoverCard className="p-6">
 *   <p>{hypothesis.description}</p>
 * </HoverCard>
 */
