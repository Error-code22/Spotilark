"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex touch-none select-none items-center group",
      props.orientation === 'vertical' ? 'flex-col h-full w-1.5' : 'w-full h-1.5',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative grow overflow-hidden rounded-full bg-secondary/50",
      props.orientation === 'vertical' ? 'w-full h-full' : 'h-full w-full'
    )}>
      <SliderPrimitive.Range className={cn(
        "absolute bg-foreground",
        props.orientation === 'vertical' ? 'w-full bottom-0' : 'h-full'
      )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="hidden h-3 w-3 rounded-full border border-primary/50 bg-background ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 group-hover:block hover:scale-125 transition-transform" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
