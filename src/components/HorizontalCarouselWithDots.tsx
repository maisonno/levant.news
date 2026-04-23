'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  children: React.ReactNode
  count: number
  className?: string
}

export default function HorizontalCarouselWithDots({ children, count, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 0) return
    const index = Math.round((el.scrollLeft / max) * (count - 1))
    setActiveIndex(index)
  }, [count])

  return (
    <div>
      <div
        ref={ref}
        onScroll={handleScroll}
        className={`flex items-start gap-3 overflow-x-auto snap-x snap-mandatory ${className}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>
      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? 'w-4 h-1.5 bg-blue-500'
                  : 'w-1.5 h-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
