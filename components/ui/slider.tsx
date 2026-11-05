'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

interface SliderProps {
  min?: number
  max?: number
  step?: number
  value?: number | [number, number]
  onValueChange?: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  className?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value = [0, 100], onValueChange, onValueCommit, ...props }, ref) => {
    const sliderRef = React.useRef<HTMLDivElement>(null)
    const [localValue, setLocalValue] = React.useState<[number, number]>(
      Array.isArray(value) ? value : [min, value as number]
    )
    const [dragging, setDragging] = React.useState<number | null>(null)

    React.useEffect(() => {
      if (Array.isArray(value)) {
        setLocalValue(value)
      }
    }, [value])

    const getPercentage = (val: number) => ((val - min) / (max - min)) * 100

    const handleMouseDown = (e: React.MouseEvent, thumb: number) => {
      e.preventDefault()
      setDragging(thumb)
    }

    const updateValue = (clientX: number) => {
      if (!sliderRef.current || dragging === null) return

      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      const newValue = Math.round((percentage * (max - min)) / 100 / step) * step + min

      const newLocalValue: [number, number] = [...localValue]
      newLocalValue[dragging] = newValue

      // Ensure min is always less than max
      if (dragging === 0 && newValue > localValue[1]) {
        return
      }
      if (dragging === 1 && newValue < localValue[0]) {
        return
      }

      setLocalValue(newLocalValue)
      onValueChange?.(newLocalValue)
    }

    React.useEffect(() => {
      if (dragging === null) return

      const handleMouseMove = (e: MouseEvent) => {
        updateValue(e.clientX)
      }

      const handleMouseUp = () => {
        setDragging(null)
        onValueCommit?.(localValue)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }, [dragging, localValue])

    return (
      <div
        ref={sliderRef}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-border">
          <div
            className="absolute h-full bg-primary transition-all duration-150"
            style={{
              left: `${getPercentage(localValue[0])}%`,
              right: `${100 - getPercentage(localValue[1])}%`,
            }}
          />
        </div>
        {localValue.map((val, index) => (
          <div
            key={index}
            className="absolute block h-5 w-5 rounded-full border-2 border-primary bg-white shadow-md ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:scale-125 hover:shadow-lg"
            style={{
              left: `calc(${getPercentage(val)}% - 10px)`,
            }}
            onMouseDown={(e) => handleMouseDown(e, index)}
          />
        ))}
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
