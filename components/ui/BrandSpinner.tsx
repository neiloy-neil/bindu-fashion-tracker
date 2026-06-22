import React from 'react'

export function BrandSpinner({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      style={{ animationDuration: '1s', transformOrigin: 'center' }}
    >
      {/* 
        This path represents a simplified dynamic swirl, thicker on one side, 
        tapering off on the other, using the primary brand orange.
      */}
      <path 
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C16.84 22 20.86 18.55 21.8 14H19.74C18.84 17.43 15.7 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C14.7 4 17.08 5.34 18.5 7.4L15 7.4V9.4H22V2.4H20V5.13C18.17 2.58 15.26 1 12 2V2Z" 
        fill="var(--brand-orange)"
      />
      {/* A small offset dot to echo the "one dot" in the logo */}
      <circle cx="12" cy="12" r="2" fill="var(--brand-orange)" opacity="0.8" />
      <path 
        d="M12 22C17.5228 22 22 17.5228 22 12H20C20 16.4183 16.4183 20 12 20V22Z" 
        fill="var(--brand-orange)" 
        opacity="0.3"
      />
    </svg>
  )
}
