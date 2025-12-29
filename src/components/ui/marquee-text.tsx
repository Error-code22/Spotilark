"use client";

import React, { useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
    text: string;
    className?: string;
}

/**
 * MarqueeText component - only scrolls when text overflows its container
 */
export function MarqueeText({ text, className = "" }: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const textWidth = textRef.current.scrollWidth;
                setShouldScroll(textWidth > containerWidth);
            }
        };

        checkOverflow();
        window.addEventListener("resize", checkOverflow);
        return () => window.removeEventListener("resize", checkOverflow);
    }, [text]);

    return (
        <div ref={containerRef} className="overflow-hidden w-full">
            <span
                ref={textRef}
                className={`inline-block whitespace-nowrap ${className} ${shouldScroll ? "animate-marquee" : ""
                    }`}
            >
                {text}
            </span>
        </div>
    );
}
