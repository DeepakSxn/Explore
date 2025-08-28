"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Trophy, Star, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface XPRewardPopupProps {
  isVisible: boolean
  onClose: () => void
  xpAmount: number
  reason: string
  type: 'video' | 'module' | 'achievement' | 'streak'
  videoTitle?: string
  moduleName?: string
  showConfetti?: boolean
}

export default function XPRewardPopup({
  isVisible,
  onClose,
  xpAmount,
  reason,
  type,
  videoTitle,
  moduleName,
  showConfetti = true
}: XPRewardPopupProps) {
  const [showReward, setShowReward] = useState(false)
  const [showConfettiEffect, setShowConfettiEffect] = useState(false)

  useEffect(() => {
    if (isVisible) {
      // Delay the reward animation
      const timer = setTimeout(() => {
        setShowReward(true)
        if (showConfetti) {
          setShowConfettiEffect(true)
        }
      }, 300)

      return () => clearTimeout(timer)
    } else {
      setShowReward(false)
      setShowConfettiEffect(false)
    }
  }, [isVisible, showConfetti])

  const getIcon = () => {
    switch (type) {
      case 'video':
        return <CheckCircle className="h-8 w-8" />
      case 'module':
        return <Trophy className="h-8 w-8" />
      case 'achievement':
        return <Star className="h-8 w-8" />
      case 'streak':
        return <Zap className="h-8 w-8" />
      default:
        return <Zap className="h-8 w-8" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'video':
        return 'Video Completed! 🎉'
      case 'module':
        return 'Module Completed! 🏆'
      case 'achievement':
        return 'Achievement Unlocked! ⭐'
      case 'streak':
        return 'Streak Extended! 🔥'
      default:
        return 'XP Earned! 🎉'
    }
  }

  const getSubtitle = () => {
    switch (type) {
      case 'video':
        return videoTitle ? `You completed "${videoTitle}"` : 'You completed a video'
      case 'module':
        return moduleName ? `You completed the "${moduleName}" module` : 'You completed a module'
      case 'achievement':
        return reason
      case 'streak':
        return 'You maintained your learning streak'
      default:
        return reason
    }
  }

  const getBackgroundGradient = () => {
    // Return white background for all types
    return 'from-white to-gray-50'
  }

  const getTextColor = () => {
    // Return dark text colors for white background
    switch (type) {
      case 'video':
        return 'text-green-600'
      case 'module':
        // Use brand color for module completion heading
        return 'text-[#080838]'
      case 'achievement':
        return 'text-purple-600'
      case 'streak':
        return 'text-orange-600'
      default:
        return 'text-blue-600'
    }
  }

  const getIconColor = () => {
    // Return appropriate icon colors for white background
    switch (type) {
      case 'video':
        return 'text-green-500'
      case 'module':
        return 'text-yellow-500'
      case 'achievement':
        return 'text-purple-500'
      case 'streak':
        return 'text-orange-500'
      default:
        return 'text-blue-500'
    }
  }

  // Confetti effect
  const Confetti = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: -10,
            opacity: 1,
          }}
          animate={{
            y: window.innerHeight + 10,
            opacity: 0,
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            ease: "easeOut",
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  )

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          {showConfettiEffect && <Confetti />}
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className={`bg-gradient-to-br ${getBackgroundGradient()} border border-gray-200 shadow-2xl overflow-hidden`}>
              <CardContent className="p-6 relative">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Top-left accent icon (use electric/Zap for module completion) */}
                {type === 'module' && (
                  <div className="absolute top-2 left-2 text-green-500">
                    <Zap className="h-5 w-5" />
                  </div>
                )}

                {/* Main content */}
                <div className="text-center">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", damping: 15 }}
                    className="mb-4"
                  >
                    <div className={getIconColor()}>
                      {getIcon()}
                    </div>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-2xl font-bold mb-2 ${getTextColor()}`}
                  >
                    {getTitle()}
                  </motion.h2>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-600 mb-6"
                  >
                    {getSubtitle()}
                  </motion.p>

                  {/* XP Reward */}
                  <AnimatePresence>
                    {showReward && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                          type: "spring", 
                          damping: 15, 
                          stiffness: 300,
                          delay: 0.5 
                        }}
                        className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 10, -10, 0]
                            }}
                            transition={{ 
                              duration: 0.6,
                              repeat: 2,
                              repeatDelay: 0.5
                            }}
                          >
                            <Zap className="h-6 w-6 text-green-500" />
                          </motion.div>
                          <div>
                            <div className="text-3xl font-bold text-green-600">
                              +50
                            </div>
                            <div className="text-sm text-gray-600">
                              Experience Points
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-3"
                  >
                    <Button
                      onClick={onClose}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      Continue Learning
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
