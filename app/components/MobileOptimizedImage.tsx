"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileOptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  style?: React.CSSProperties
}

export default function MobileOptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = "",
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  style,
  ...props
}: MobileOptimizedImageProps) {
  const isMobile = useIsMobile()
  const [imageSrc, setImageSrc] = useState(src)
  const [imageQuality, setImageQuality] = useState(quality)
  const [imageWidth, setImageWidth] = useState(width)
  const [imageHeight, setImageHeight] = useState(height)

  useEffect(() => {
    // Reduce quality and size for mobile devices
    if (isMobile) {
      setImageQuality(Math.min(quality, 60)) // Max 60% quality on mobile
      setImageWidth(Math.min(width, 320)) // Max 320px width on mobile
      setImageHeight(Math.min(height, 240)) // Max 240px height on mobile
      
      // Add mobile-specific query parameters to reduce texture size
      const url = new URL(src, window.location.origin)
      url.searchParams.set('mobile', 'true')
      url.searchParams.set('quality', '60')
      url.searchParams.set('w', '320')
      setImageSrc(url.toString())
    } else {
      setImageQuality(quality)
      setImageWidth(width)
      setImageHeight(height)
      setImageSrc(src)
    }
  }, [isMobile, src, quality, width, height])

  // Fallback for failed images
  const handleImageError = () => {
    console.warn(`Failed to load image: ${src}`)
    // Use a placeholder or smaller image
    setImageSrc('/placeholder.svg?height=180&width=320')
  }

  // Generate responsive sizes for mobile
  const responsiveSizes = isMobile 
    ? "(max-width: 768px) 100vw, 50vw"
    : sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : imageWidth}
        height={fill ? undefined : imageHeight}
        className={className}
        priority={priority}
        quality={imageQuality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={responsiveSizes}
        fill={fill}
        style={{
          ...style,
          objectFit: 'cover',
          maxWidth: '100%',
          height: 'auto',
        }}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        {...props}
      />
    </div>
  )
}

// Hook for detecting low-end devices
export function useLowEndDevice() {
  const [isLowEnd, setIsLowEnd] = useState(false)

  useEffect(() => {
    const checkDeviceCapabilities = () => {
      // Check for low memory devices
      const memory = (navigator as any).deviceMemory || 4
      const cores = (navigator as any).hardwareConcurrency || 4
      const connection = (navigator as any).connection?.effectiveType || '4g'
      
      // Consider device low-end if:
      // - Memory < 4GB
      // - CPU cores < 4
      // - Slow connection (2g, slow-2g, 3g)
      const isLowEndDevice = memory < 4 || cores < 4 || ['2g', 'slow-2g', '3g'].includes(connection)
      
      setIsLowEnd(isLowEndDevice)
    }

    checkDeviceCapabilities()
    
    // Listen for connection changes
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', checkDeviceCapabilities)
      return () => {
        (navigator as any).connection.removeEventListener('change', checkDeviceCapabilities)
      }
    }
  }, [])

  return isLowEnd
}

// Utility function to get optimized image URL
export function getOptimizedImageUrl(src: string, isMobile: boolean = false, isLowEnd: boolean = false) {
  try {
    const url = new URL(src, window.location.origin)
    
    if (isMobile || isLowEnd) {
      url.searchParams.set('mobile', 'true')
      url.searchParams.set('quality', isLowEnd ? '40' : '60')
      url.searchParams.set('w', isLowEnd ? '240' : '320')
      url.searchParams.set('format', 'webp')
    }
    
    return url.toString()
  } catch {
    // If URL parsing fails, return original src
    return src
  }
}
