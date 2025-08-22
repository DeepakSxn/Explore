"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGamification } from "../context/GamificationContext"
import XPRewardPopup from "./XPRewardPopup"

export default function XPTestComponent() {
  const { addXP, checkModuleCompletion } = useGamification()
  const [showXPReward, setShowXPReward] = useState(false)
  const [xpRewardData, setXpRewardData] = useState<{
    xpAmount: number
    reason: string
    type: 'video' | 'module' | 'achievement' | 'streak'
    videoTitle?: string
    moduleName?: string
  } | null>(null)

  const triggerVideoXP = async () => {
    await addXP(50, "Test video completion")
    setXpRewardData({
      xpAmount: 50,
      reason: "Video completion",
      type: 'video',
      videoTitle: "Test Video"
    })
    setShowXPReward(true)
  }

  const triggerModuleXP = async () => {
    await addXP(500, "Test module completion")
    setXpRewardData({
      xpAmount: 500,
      reason: "Module completion",
      type: 'module',
      moduleName: "Test Module"
    })
    setShowXPReward(true)
  }

  const triggerAchievementXP = async () => {
    await addXP(100, "Test achievement")
    setXpRewardData({
      xpAmount: 100,
      reason: "Achievement unlocked",
      type: 'achievement'
    })
    setShowXPReward(true)
  }

  const triggerStreakXP = async () => {
    await addXP(25, "Test streak")
    setXpRewardData({
      xpAmount: 25,
      reason: "Streak extended",
      type: 'streak'
    })
    setShowXPReward(true)
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>XP Reward Test Component</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={triggerVideoXP} className="bg-green-600 hover:bg-green-700">
              Test Video XP (50)
            </Button>
            <Button onClick={triggerModuleXP} className="bg-yellow-600 hover:bg-yellow-700">
              Test Module XP (500)
            </Button>
            <Button onClick={triggerAchievementXP} className="bg-purple-600 hover:bg-purple-700">
              Test Achievement XP (100)
            </Button>
            <Button onClick={triggerStreakXP} className="bg-orange-600 hover:bg-orange-700">
              Test Streak XP (25)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* XP Reward Popup */}
      {xpRewardData && (
        <XPRewardPopup
          isVisible={showXPReward}
          onClose={() => {
            setShowXPReward(false);
            setXpRewardData(null);
          }}
          xpAmount={xpRewardData.xpAmount}
          reason={xpRewardData.reason}
          type={xpRewardData.type}
          videoTitle={xpRewardData.videoTitle}
          moduleName={xpRewardData.moduleName}
          showConfetti={true}
        />
      )}
    </div>
  )
}
