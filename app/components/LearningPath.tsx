"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Lock, 
  Unlock, 
  CheckCircle, 
  Play, 
  Star, 
  Zap,
  ArrowRight,
  Target,
  BookOpen,
  Trophy,
  Crown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useGamification } from "../context/GamificationContext"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

interface LearningModule {
  id: string
  name: string
  description: string
  icon: string
  requiredLevel: number
  requiredXP: number
  xpReward: number
  videoCount: number
  estimatedTime: string
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  dependencies: string[]
}

interface LearningPathProps {
  modules: LearningModule[]
  onModuleClick: (module: LearningModule) => void
}

export default function LearningPath({ modules, onModuleClick }: LearningPathProps) {
  const { userProgress } = useGamification()
  const router = useRouter()
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null)

  const getModuleStatus = (module: LearningModule) => {
    if (module.isCompleted) return 'completed'
    if (module.isUnlocked) return 'unlocked'
    return 'locked'
  }

  const getModuleIcon = (module: LearningModule) => {
    const status = getModuleStatus(module)
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'unlocked':
        return <Play className="h-6 w-6 text-blue-500" />
      case 'locked':
        return <Lock className="h-6 w-6 text-gray-400" />
    }
  }

  const getModuleColor = (module: LearningModule) => {
    const status = getModuleStatus(module)
    
    switch (status) {
      case 'completed':
        return 'from-green-500 to-green-600'
      case 'unlocked':
        return 'from-blue-500 to-blue-600'
      case 'locked':
        return 'from-gray-400 to-gray-500'
    }
  }

  const getModuleBorder = (module: LearningModule) => {
    const status = getModuleStatus(module)
    
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'unlocked':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100'
      case 'locked':
        return 'border-gray-200 bg-gray-50 opacity-60'
    }
  }

  const handleModuleClick = (module: LearningModule) => {
    if (module.isUnlocked) {
      setSelectedModule(module)
      onModuleClick(module)
    } else {
      const requirements = []
      if (userProgress && userProgress.currentLevel < module.requiredLevel) {
        requirements.push(`Level ${module.requiredLevel}`)
      }
      if (userProgress && userProgress.totalXP < module.requiredXP) {
        requirements.push(`${module.requiredXP} XP`)
      }
      
      toast({
        title: "Module Locked",
        description: `Complete previous modules and reach ${requirements.join(' and ')} to unlock this module.`,
        variant: "destructive"
      })
    }
  }

  const getLevelTitle = (level: number) => {
    const titles = [
      "Beginner",
      "Apprentice", 
      "Learner",
      "Student",
      "Practitioner",
      "Specialist",
      "Expert",
      "Master",
      "Grandmaster",
      "Legend"
    ]
    return titles[Math.min(level - 1, titles.length - 1)]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Your Learning Journey</h2>
        <p className="text-muted-foreground">
          Progress through modules to unlock new content and earn rewards
        </p>
      </div>

      {/* Current Progress */}
      {userProgress && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {getLevelTitle(userProgress.currentLevel)} - Level {userProgress.currentLevel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userProgress.totalXP} XP • {userProgress.currentStreak} day streak
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {userProgress.totalVideosWatched}
                </div>
                <div className="text-sm text-muted-foreground">Videos Watched</div>
              </div>
            </div>
            <Progress value={userProgress.totalVideosWatched / 50 * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Learning Path Tree */}
      <div className="relative">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {modules.map((module, index) => {
            if (index < modules.length - 1) {
              return (
                <line
                  key={`line-${index}`}
                  x1="50%"
                  y1={`${((index + 0.5) / modules.length) * 100}%`}
                  x2="50%"
                  y2={`${((index + 1.5) / modules.length) * 100}%`}
                  stroke={module.isUnlocked ? "#3b82f6" : "#d1d5db"}
                  strokeWidth="2"
                  strokeDasharray={module.isUnlocked ? "none" : "5,5"}
                />
              )
            }
            return null
          })}
        </svg>

        {/* Modules */}
        <div className="relative space-y-8">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex justify-center"
            >
              <Card 
                className={`w-80 cursor-pointer transition-all duration-200 ${getModuleBorder(module)}`}
                onClick={() => handleModuleClick(module)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getModuleColor(module)} flex items-center justify-center text-white`}>
                      <span className="text-xl">{module.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{module.name}</h3>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    {getModuleIcon(module)}
                  </div>

                  {/* Module Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{module.videoCount}</div>
                      <div className="text-xs text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{module.estimatedTime}</div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {module.isUnlocked && !module.isCompleted && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{Math.round(module.progress)}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </div>
                  )}

                  {/* Requirements */}
                  {!module.isUnlocked && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>Requires Level {module.requiredLevel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>{module.requiredXP} XP needed</span>
                      </div>
                    </div>
                  )}

                  {/* Rewards */}
                  {module.isUnlocked && (
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        <Zap className="h-3 w-3 mr-1" />
                        +{module.xpReward} XP
                      </Badge>
                      {module.isCompleted && (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Module Details Modal */}
      <AnimatePresence>
        {selectedModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedModule(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{selectedModule.icon}</span>
                    {selectedModule.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{selectedModule.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{selectedModule.videoCount}</div>
                      <div className="text-sm text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{selectedModule.estimatedTime}</div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Complete to earn {selectedModule.xpReward} XP</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setSelectedModule(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        router.push(`/dashboard?module=${selectedModule.name}`)
                        setSelectedModule(null)
                      }}
                    >
                      Start Learning
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 