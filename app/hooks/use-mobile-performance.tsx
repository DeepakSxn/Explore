"use client"

import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from './use-mobile'

interface PerformanceSettings {
  reducedAnimations: boolean
  lowQualityImages: boolean
  reducedVideoQuality: boolean
  disableBackgroundEffects: boolean
  limitConcurrentRequests: boolean
  enableLazyLoading: boolean
}

export function useMobilePerformance() {
  const isMobile = useIsMobile()
  const [settings, setSettings] = useState<PerformanceSettings>({
    reducedAnimations: false,
    lowQualityImages: false,
    reducedVideoQuality: false,
    disableBackgroundEffects: false,
    limitConcurrentRequests: false,
    enableLazyLoading: false,
  })

  const [deviceCapabilities, setDeviceCapabilities] = useState({
    memory: 4, // GB
    cores: 4,
    connection: '4g',
    isLowEnd: false,
  })

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = () => {
      const memory = (navigator as any).deviceMemory || 4
      const cores = (navigator as any).hardwareConcurrency || 4
      const connection = (navigator as any).connection?.effectiveType || '4g'
      
      // Determine if device is low-end
      const isLowEnd = memory < 4 || cores < 4 || ['2g', 'slow-2g', '3g'].includes(connection)
      
      setDeviceCapabilities({
        memory,
        cores,
        connection,
        isLowEnd,
      })

      // Auto-apply performance settings for low-end devices
      if (isLowEnd || isMobile) {
        setSettings({
          reducedAnimations: true,
          lowQualityImages: true,
          reducedVideoQuality: true,
          disableBackgroundEffects: true,
          limitConcurrentRequests: true,
          enableLazyLoading: true,
        })
      }
    }

    detectCapabilities()

    // Listen for connection changes
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', detectCapabilities)
      return () => {
        (navigator as any).connection.removeEventListener('change', detectCapabilities)
      }
    }
  }, [isMobile])

  // Optimize animations for mobile
  const getAnimationSettings = useCallback(() => {
    if (settings.reducedAnimations) {
      return {
        duration: '0.2s',
        easing: 'ease-out',
        reducedMotion: true,
      }
    }
    return {
      duration: '0.3s',
      easing: 'ease-in-out',
      reducedMotion: false,
    }
  }, [settings.reducedAnimations])

  // Get optimized image settings
  const getImageSettings = useCallback(() => {
    if (settings.lowQualityImages) {
      return {
        quality: 60,
        format: 'webp',
        maxWidth: 320,
        maxHeight: 240,
      }
    }
    return {
      quality: 85,
      format: 'auto',
      maxWidth: 1920,
      maxHeight: 1080,
    }
  }, [settings.lowQualityImages])

  // Get optimized video settings
  const getVideoSettings = useCallback(() => {
    if (settings.reducedVideoQuality) {
      return {
        quality: 'medium',
        resolution: '720p',
        bitrate: '1000k',
        preload: 'metadata',
      }
    }
    return {
      quality: 'high',
      resolution: '1080p',
      bitrate: '2000k',
      preload: 'auto',
    }
  }, [settings.reducedVideoQuality])

  // Limit concurrent requests
  const limitRequests = useCallback(async <T>(
    requests: (() => Promise<T>)[],
    maxConcurrent: number = settings.limitConcurrentRequests ? 2 : 5
  ): Promise<T[]> => {
    const results: T[] = []
    const chunks = []
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      chunks.push(requests.slice(i, i + maxConcurrent))
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(req => req()))
      results.push(...chunkResults)
    }
    
    return results
  }, [settings.limitConcurrentRequests])

  // Debounce function for mobile
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number = settings.reducedAnimations ? 100 : 300
  ) => {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }, [settings.reducedAnimations])

  // Throttle function for mobile
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number = settings.reducedAnimations ? 100 : 200
  ) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }, [settings.reducedAnimations])

  // Memory management
  const clearMemory = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear image cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('image')) {
              caches.delete(name)
            }
          })
        })
      }
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc()
      }
    }
  }, [])

  // Monitor memory usage
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576)
      
      // Clear memory if usage is high
      if (usedMB > totalMB * 0.8) {
        clearMemory()
      }
      
      return { usedMB, totalMB }
    }
    return null
  }, [clearMemory])

  return {
    settings,
    deviceCapabilities,
    getAnimationSettings,
    getImageSettings,
    getVideoSettings,
    limitRequests,
    debounce,
    throttle,
    clearMemory,
    monitorMemory,
    updateSettings: setSettings,
  }
}

// CSS utility for reduced motion
export const reducedMotionStyles = {
  '@media (prefers-reduced-motion: reduce)': {
    '*': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
    },
  },
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    loadTime: 0,
    errors: 0,
  })

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let errors = 0

    // Monitor FPS
    const monitorFPS = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        setMetrics(prev => ({ ...prev, fps }))
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(monitorFPS)
    }

    // Monitor memory
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
        setMetrics(prev => ({ ...prev, memory: usedMB }))
      }
    }

    // Monitor errors
    const handleError = () => {
      setMetrics(prev => ({ ...prev, errors: prev.errors + 1 }))
    }

    // Start monitoring
    monitorFPS()
    const memoryInterval = setInterval(monitorMemory, 5000)
    window.addEventListener('error', handleError)

    return () => {
      clearInterval(memoryInterval)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return metrics
}
