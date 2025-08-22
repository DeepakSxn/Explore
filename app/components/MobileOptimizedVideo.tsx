"use client"

import React, { useRef, useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLowEndDevice } from './MobileOptimizedImage'

interface MobileOptimizedVideoProps {
  src: string
  poster?: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  playsInline?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void
  onLoadedMetadata?: () => void
  onError?: (event: React.SyntheticEvent<HTMLVideoElement>) => void
  style?: React.CSSProperties
}

export default function MobileOptimizedVideo({
  src,
  poster,
  className = "",
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = true,
  preload = 'metadata',
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onLoadedMetadata,
  onError,
  style,
  ...props
}: MobileOptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isMobile = useIsMobile()
  const isLowEnd = useLowEndDevice()
  const [videoSrc, setVideoSrc] = useState(src)
  const [videoPoster, setVideoPoster] = useState(poster)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Optimize video source for mobile devices
    const optimizeVideoForMobile = () => {
      try {
        const url = new URL(src, window.location.origin)
        
        if (isMobile || isLowEnd) {
          // Add mobile-specific parameters to reduce video quality
          url.searchParams.set('mobile', 'true')
          
          if (isLowEnd) {
            // Ultra-low quality for low-end devices
            url.searchParams.set('quality', 'low')
            url.searchParams.set('resolution', '480p')
            url.searchParams.set('bitrate', '500k')
          } else {
            // Standard mobile optimization
            url.searchParams.set('quality', 'medium')
            url.searchParams.set('resolution', '720p')
            url.searchParams.set('bitrate', '1000k')
          }
          
          setVideoSrc(url.toString())
        } else {
          setVideoSrc(src)
        }
      } catch {
        // If URL parsing fails, use original src
        setVideoSrc(src)
      }
    }

    optimizeVideoForMobile()
  }, [src, isMobile, isLowEnd])

  useEffect(() => {
    // Optimize poster image for mobile
    if (poster) {
      try {
        const url = new URL(poster, window.location.origin)
        
        if (isMobile || isLowEnd) {
          url.searchParams.set('mobile', 'true')
          url.searchParams.set('quality', isLowEnd ? '40' : '60')
          url.searchParams.set('w', isLowEnd ? '240' : '320')
          url.searchParams.set('format', 'webp')
          setVideoPoster(url.toString())
        } else {
          setVideoPoster(poster)
        }
      } catch {
        setVideoPoster(poster)
      }
    }
  }, [poster, isMobile, isLowEnd])

  // Handle video loading
  const handleLoadedMetadata = () => {
    setIsLoading(false)
    onLoadedMetadata?.()
  }

  // Handle video errors
  const handleError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.warn('Video loading error:', event)
    setIsLoading(false)
    onError?.(event)
  }

  // Mobile-specific video settings
  const mobileVideoSettings = {
    playsInline: true, // Required for iOS
    preload: isMobile ? 'metadata' : preload, // Reduce preloading on mobile
    controlsList: 'nodownload', // Prevent download on mobile
    disablePictureInPicture: isMobile, // Disable PiP on mobile
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      )}
      
      <video
        ref={videoRef}
        src={videoSrc}
        poster={videoPoster}
        className={`w-full h-auto ${className}`}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload={preload}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        style={{
          ...style,
          maxWidth: '100%',
          height: 'auto',
          // Reduce video quality on mobile
          ...(isMobile && {
            maxHeight: '50vh', // Limit height on mobile
          }),
          ...(isLowEnd && {
            maxHeight: '40vh', // Further limit height on low-end devices
          }),
        }}
        {...mobileVideoSettings}
        {...props}
      />
    </div>
  )
}

// Hook for video performance monitoring
export function useVideoPerformance() {
  const [performance, setPerformance] = useState({
    fps: 0,
    droppedFrames: 0,
    buffering: false,
  })

  const monitorPerformance = (videoElement: HTMLVideoElement) => {
    let frameCount = 0
    let lastTime = performance.now()
    let droppedFrames = 0

    const checkPerformance = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      
      if (deltaTime >= 1000) { // Check every second
        const fps = Math.round((frameCount * 1000) / deltaTime)
        setPerformance(prev => ({
          ...prev,
          fps,
          droppedFrames,
        }))
        
        frameCount = 0
        droppedFrames = 0
        lastTime = currentTime
      }
      
      frameCount++
      requestAnimationFrame(checkPerformance)
    }

    checkPerformance()
  }

  return { performance, monitorPerformance }
}

// Utility function to get optimized video URL
export function getOptimizedVideoUrl(src: string, isMobile: boolean = false, isLowEnd: boolean = false) {
  try {
    const url = new URL(src, window.location.origin)
    
    if (isMobile || isLowEnd) {
      url.searchParams.set('mobile', 'true')
      
      if (isLowEnd) {
        url.searchParams.set('quality', 'low')
        url.searchParams.set('resolution', '480p')
        url.searchParams.set('bitrate', '500k')
      } else {
        url.searchParams.set('quality', 'medium')
        url.searchParams.set('resolution', '720p')
        url.searchParams.set('bitrate', '1000k')
      }
    }
    
    return url.toString()
  } catch {
    return src
  }
}
