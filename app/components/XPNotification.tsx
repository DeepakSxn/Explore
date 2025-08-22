"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap } from "lucide-react"

interface XPNotificationProps {
  xpAmount: number
  reason: string
  isVisible: boolean
  onClose: () => void
}

export default function XPNotification({
  xpAmount,
  reason,
  isVisible,
  onClose
}: XPNotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000) // Auto close after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-400/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 0.6,
                repeat: 1
              }}
            >
              <Zap className="h-5 w-5 text-yellow-300" />
            </motion.div>
            <div>
              <div className="font-bold text-lg">+{xpAmount} XP</div>
              <div className="text-sm text-green-100">{reason}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
