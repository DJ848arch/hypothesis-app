import React from 'react'

export default function WaveformVisualizer({ playing = false, color = '#8346ff' }) {
  return (
    <div className="flex items-center gap-0.5 h-6">
      {Array.from({ length: 20 }).map((_, i) => {
        const heights = [40, 70, 55, 90, 65, 80, 45, 95, 60, 75, 50, 85, 40, 70, 55, 90, 65, 80, 45, 60]
        return (
          <div
            key={i}
            style={{
              height: `${heights[i]}%`,
              backgroundColor: color,
              opacity: playing ? 1 : 0.35,
              animationPlayState: playing ? 'running' : 'paused',
              animationDelay: `${(i % 5) * 0.15}s`,
            }}
            className={`w-1 rounded-full wave-bar`}
          />
        )
      })}
    </div>
  )
}
