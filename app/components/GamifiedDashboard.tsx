"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Star, 
  Target, 
  BookOpen, 
  Play, 
  Lock, 
  CheckCircle, 
  TrendingUp,
  Award,
  Flame,
  Crown,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Medal,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useGamification, XP_CONFIG } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { getAllModuleVideoOrders } from "../firestore-utils"
import { auth, db } from "@/firebase"

import ChallengeMode from "./ChallengeMode"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl?: string
  duration: string
  category: string
  tags?: string[]
  createdAt: any
  watched?: boolean
  company?: string
  thumbnail?: string
  publicId?: string
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

export default function GamifiedDashboard() {
  const router = useRouter()
  const { userProgress, loading, getCurrentLevel, getXPToNextLevel, getLevelProgress } = useGamification()
  const { userData } = useAuth()
  const [showConfetti, setShowConfetti] = useState(false)
  const [dailyReminder, setDailyReminder] = useState("")
  const [moduleSuggestions, setModuleSuggestions] = useState<any[]>([])
  const [topVideos, setTopVideos] = useState<Video[]>([])
  const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({})
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({})

  const [showChallengeMode, setShowChallengeMode] = useState(false)

  // Function to switch to classic dashboard view
  const switchToClassicView = () => {
    // Dispatch a custom event to communicate with the parent dashboard component
    window.dispatchEvent(new CustomEvent('switchToClassicView'))
  }

  // Generate daily reminder based on user progress
  useEffect(() => {
    if (userProgress) {
      const suggestions = [
        "Just 5 minutes to finish the Inventory module!",
        "Keep your streak alive - watch one video today!",
        "You're close to leveling up - complete a quiz!",
        "Try the Processing module for 50 XP!",
        "Your streak is impressive - maintain it today!"
      ]
      setDailyReminder(suggestions[Math.floor(Math.random() * suggestions.length)])
    }
  }, [userProgress])

  // Generate module suggestions
  useEffect(() => {
    if (userProgress) {
      const suggestions = [
        {
          name: "Sales",
          xpReward: 50,
          description: "Learn about sales operations",
          icon: "💰",
          isUnlocked: userProgress.unlockedModules.includes("Sales")
        },
        {
          name: "QA",
          xpReward: 75,
          description: "Master quality assurance",
          icon: "🔍",
          isUnlocked: userProgress.unlockedModules.includes("QA")
        },
        {
          name: "Processing",
          xpReward: 50,
          description: "Learn about processing operations",
          icon: "⚙️",
          isUnlocked: userProgress.unlockedModules.includes("Processing")
        },
        {
          name: "Inventory",
          xpReward: 75,
          description: "Master inventory management",
          icon: "📦",
          isUnlocked: userProgress.unlockedModules.includes("Inventory")
        },
        {
          name: "Finance",
          xpReward: 100,
          description: "Understand financial operations",
          icon: "💳",
          isUnlocked: userProgress.unlockedModules.includes("Finance and Accounting")
        }
      ]
      setModuleSuggestions(suggestions)
    }
  }, [userProgress])

  // Fetch top videos and their progress
  const fetchTopVideos = async () => {
    if (!auth.currentUser) return
    
    try {
      // Get all videos
      const videosQuery = query(collection(db, "videos"), orderBy("createdAt", "asc"))
      const videosSnapshot = await getDocs(videosQuery)
      const allVideos = videosSnapshot.docs.map(doc => {
        const data = doc.data() as any
        const thumbnailFromPublicId = data?.publicId
          ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${data.publicId}.jpg`
          : undefined
        return {
          id: doc.id,
          ...data,
          // Normalize thumbnail field so the player poster always renders
          thumbnail: data?.thumbnailUrl || thumbnailFromPublicId,
        } as Video
      })

      // Get user's watch history
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser.uid)
      )
      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchHistory = watchHistorySnapshot.docs.map(doc => doc.data())

      // Calculate progress for each video
      const progressData: {[key: string]: number} = {}
      allVideos.forEach(video => {
        const watchEvent = watchHistory.find(event => event.videoId === video.id)
        if (watchEvent) {
          // Calculate progress based on watch position vs duration
          const duration = parseInt(video.duration.match(/\d+/)?.[0] || "0")
          const position = watchEvent.lastPosition || 0
          progressData[video.id] = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
        } else {
          progressData[video.id] = 0
        }
      })

      // Get top 3 videos by progress (most watched)
      const sortedVideos = allVideos
        .sort((a, b) => (progressData[b.id] || 0) - (progressData[a.id] || 0))
        .slice(0, 3)

      setTopVideos(sortedVideos)
      setVideoProgress(progressData)
      setAllVideos(allVideos) // Store all videos for module counting

      // Fetch saved per-module orders
      const orders = await getAllModuleVideoOrders()
      setCategoryOrders(orders)
    } catch (error) {
      console.error("Error fetching top videos:", error)
    }
  }

  // Fetch top videos when component mounts
  useEffect(() => {
    fetchTopVideos()
  }, [])

  const handleModuleClick = (module: any) => {
    if (module.isUnlocked) {
      router.push(`/dashboard?module=${module.name}`)
    } else {
      toast({
        title: "Module Locked",
        description: `Complete previous modules to unlock ${module.name}`,
        variant: "destructive"
      })
    }
  }

  // Open the module directly in the video player by creating a temporary playlist
  const startModuleFromCategory = (category: string) => {
    try {
      console.log(`🎯 Starting module from category: "${category}"`)
      
      // Get all videos for the selected category
      let moduleVideos = allVideos.filter((v) => v.category === category)
      const moduleOrder = categoryOrders[category]
      if (moduleOrder && moduleOrder.length > 0) {
        moduleVideos = [...moduleVideos].sort((a, b) => {
          const ia = moduleOrder.indexOf(a.id)
          const ib = moduleOrder.indexOf(b.id)
          const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
          const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
          return aPos - bPos
        })
      }
      console.log(`📹 Found ${moduleVideos.length} videos for category "${category}":`, moduleVideos.map(v => v.title))
      
      if (moduleVideos.length === 0) {
        console.log(`❌ No videos found for category "${category}"`)
        toast({
          title: "No Videos Found",
          description: `No videos found for the ${category} module. Please try another module.`,
          variant: "destructive"
        })
        return
      }

      // Get compulsory videos (Company Introduction, Additional Features, AI tools)
      let companyIntroVideos = allVideos.filter((v) => v.category === "Company Introduction")
      let additionalFeaturesVideos = allVideos.filter((v) => v.category === "Additional Features")
      let aiToolsVideos = allVideos.filter((v) => 
        v.category === "AI tools" || 
        v.category === "AI Tools" || 
        v.category === "ai tools" ||
        v.category === "Artificial Intelligence" ||
        v.category === "artificial intelligence"
      )

      // Apply saved order to compulsory categories as well
      const applyOrder = (list: Video[], key: string) => {
        const ord = categoryOrders[key]
        if (!ord || ord.length === 0) return list
        return [...list].sort((a, b) => {
          const ia = ord.indexOf(a.id)
          const ib = ord.indexOf(b.id)
          const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
          const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
          return aPos - bPos
        })
      }

      companyIntroVideos = applyOrder(companyIntroVideos, "Company Introduction")
      additionalFeaturesVideos = applyOrder(additionalFeaturesVideos, "Additional Features")
      aiToolsVideos = applyOrder(aiToolsVideos, "AI tools")

      console.log(`📹 Compulsory videos found:`)
      console.log(`   - Company Introduction: ${companyIntroVideos.length} videos`)
      console.log(`   - Additional Features: ${additionalFeaturesVideos.length} videos`)
      console.log(`   - AI tools: ${aiToolsVideos.length} videos`)

      // Combine all videos in the proper order: Company Intro + Selected Module + Additional Features + AI Tools
      const allPlaylistVideos = [
        ...companyIntroVideos,
        ...moduleVideos,
        ...additionalFeaturesVideos,
        ...aiToolsVideos,
      ].map(v => ({
        ...v,
        // Ensure thumbnail field is populated for the video player poster
        thumbnail: v.thumbnailUrl || ((v as any).publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${(v as any).publicId}.jpg` : undefined),
      }))

      console.log(`📋 Total playlist videos: ${allPlaylistVideos.length}`)
      console.log(`📋 Playlist structure:`, allPlaylistVideos.map(v => `${v.category}: ${v.title}`))

      // Find the first video of the selected module to start with
      const firstModuleVideo = moduleVideos[0]
      if (!firstModuleVideo) {
        console.log(`❌ No first video found for module "${category}"`)
        return
      }

      console.log(`🎬 Starting with video: "${firstModuleVideo.title}" (ID: ${firstModuleVideo.id})`)

      // Create the playlist with all videos
      const updatedPlaylist = {
        id: "custom-playlist",
        videos: allPlaylistVideos,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      }
      localStorage.setItem("currentPlaylist", JSON.stringify(updatedPlaylist))

      // Store the user's selection to show only the selected module + compulsory modules
      const selectedVideoIds = moduleVideos.map(v => v.id)
      localStorage.setItem("selectedVideos", JSON.stringify(selectedVideoIds))

      console.log(`💾 Stored selected video IDs:`, selectedVideoIds)
      console.log(`💾 Selected videos details:`, moduleVideos.map(v => ({ id: v.id, title: v.title, category: v.category })))
      console.log(`💾 Category being stored: "${category}"`)

      const activePlaylist = {
        id: "custom-playlist",
        title: `${category} Module`,
        lastAccessed: new Date().toISOString(),
        completionPercentage: 0,
      }
      localStorage.setItem("activePlaylist", JSON.stringify(activePlaylist))

      // Navigate to video player starting with the first video of the selected module
      const videoPlayerUrl = `/video-player?videoId=${firstModuleVideo.id}&playlistId=custom-playlist`
      console.log(`🚀 Navigating to: ${videoPlayerUrl}`)
      router.push(videoPlayerUrl)
    } catch (error) {
      console.error("Error starting module from category:", error)
      toast({
        title: "Error",
        description: "Failed to start the module. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleContinueLearning = async () => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log("No authenticated user, redirecting to login");
      router.push("/login");
      return;
    }

    const userId = auth.currentUser.uid;
    if (!userId) {
      console.log("No user ID available, redirecting to dashboard");
      router.push("/dashboard");
      return;
    }

    if (!userData) {
      console.log("No user data available, redirecting to dashboard");
      router.push("/dashboard");
      return;
    }

    try {
      console.log("Finding last watched video for user:", userId);
      
      // Query for all watch events for this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId)
      );

      const watchHistorySnapshot = await getDocs(watchHistoryQuery);

      if (watchHistorySnapshot.empty) {
        console.log("No watch history found, redirecting to dashboard");
        // No watch history, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      // Sort by lastWatchedAt manually to find the most recent
      const events = watchHistorySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as any)).sort((a: any, b: any) => {
        // Handle different timestamp formats
        const aTime = a.lastWatchedAt?.seconds || a.lastWatchedAt || a.watchedAt?.seconds || a.watchedAt || 0;
        const bTime = b.lastWatchedAt?.seconds || b.lastWatchedAt || b.watchedAt?.seconds || b.watchedAt || 0;
        return bTime - aTime;
      });

      const lastWatchedEvent = events[0] as any;
      const lastVideoId = lastWatchedEvent.videoId;
      const lastPosition = lastWatchedEvent.lastPosition || 0;

      console.log("Found last watched video:", { lastVideoId, lastPosition });

      // Check if the video is part of a playlist
      let playlistId = "custom-playlist";
      if (lastWatchedEvent.playlistId) {
        playlistId = lastWatchedEvent.playlistId;
      }

      // Redirect to the video player with the last watched video and position
      const videoPlayerUrl = `/video-player?videoId=${lastVideoId}&playlistId=${playlistId}&resume=true&position=${lastPosition}`;
      console.log("Redirecting to:", videoPlayerUrl);
      router.push(videoPlayerUrl);
    } catch (error) {
      console.error("Error finding last watched video:", error);
      // Fallback to dashboard
      router.push("/dashboard");
    }
  };

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

  const getLevelColor = (level: number) => {
    if (level <= 3) return "text-blue-600"
    if (level <= 6) return "text-green-600"
    if (level <= 9) return "text-purple-600"
    return "text-orange-600"
  }

  const getLevelIcon = (level: number) => {
    if (level <= 3) return <BookOpen className="h-6 w-6" />
    if (level <= 6) return <Target className="h-6 w-6" />
    if (level <= 9) return <Trophy className="h-6 w-6" />
    return <Crown className="h-6 w-6" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Progress...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Daily Reminder Banner */}
        <AnimatePresence>
          {dailyReminder && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-white">{dailyReminder}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={switchToClassicView}
                      className="hidden sm:flex items-center gap-2"
                    >
                      <span className="hidden sm:inline">Start Learning</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={switchToClassicView}
                      className="sm:hidden p-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Level Progress Card */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    {getLevelIcon(userProgress.currentLevel)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{getLevelTitle(userProgress.currentLevel)}</h2>
                    <p className="text-white">Level {userProgress.currentLevel}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Progress to Level {userProgress.currentLevel + 1}</span>
                    <span className="text-white">{Math.round(getLevelProgress())}%</span>
                  </div>
                  <Progress 
                    value={getLevelProgress()} 
                    className="h-2 bg-white/20 [&>div]:bg-white"
                  />
                  <p className="text-sm text-white">
                    {getXPToNextLevel()} XP needed for next level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                    <Play className="h-4 w-4" />
                  </div>
                  <p className="text-3xl font-normal text-white">{userProgress.totalVideosWatched}</p>
                  <p className="text-sm text-white">Videos Watched</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-[10px] font-bold text-white">XP</span>
                  </div>
                  <p className="text-3xl font-normal text-white">{userProgress.totalXP}</p>
                  <p className="text-sm text-white">Total XP</p>
                </CardContent>
              </Card>
            </div>

            {/* Day Streak Card - Moved from right side */}
            {userProgress.currentStreak > 0 && (
              <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Amazing Streak!</h3>
                      <p className="text-white">
                        You've been learning for {userProgress.currentStreak} day{userProgress.currentStreak !== 1 ? 's' : ''} in a row!
                      </p>
                      {userProgress.currentStreak >= 7 && (
                        <p className="text-sm text-white mt-1">
                          🎉 You've earned the "Week Warrior" badge!
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{userProgress.currentStreak}</p>
                      <p className="text-sm text-white">days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Badges */}
            {userProgress.badges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userProgress.badges.slice(-3).reverse().map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border"
                      >
                        <div className="text-2xl">{badge.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Learning Path & Suggestions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning Path */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-6 h-full">
                  {/* Top 3 Modules with Progress */}
                  <div className="h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-600">📚 Most Active Modules</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          fetchTopVideos()
                          // Also refresh module suggestions if needed
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    <p className="text-sm text-blue-600 mb-4">Shows your top 3 modules based on videos watched</p>
                    <div className="space-y-3">
                      {(() => {
                        // Calculate module progress based on videos watched
                        const moduleProgress: {[key: string]: {progress: number, videoCount: number, watchedCount: number, totalVideos: number}} = {}
                        
                        // Define compulsory modules to exclude
                        const compulsoryModules = ["Company Introduction", "Additional Features", "AI tools", "AI Tools", "ai tools", "Artificial Intelligence", "artificial intelligence"]
                        
                        // Calculate progress for all videos across all modules
                        allVideos.forEach(video => {
                          if (!moduleProgress[video.category]) {
                            moduleProgress[video.category] = {progress: 0, videoCount: 0, watchedCount: 0, totalVideos: 0}
                          }
                          moduleProgress[video.category].totalVideos++
                          
                          // Count videos that have been watched (any progress > 0)
                          if ((videoProgress[video.id] || 0) > 0) {
                            moduleProgress[video.category].watchedCount++
                          }
                        })
                        
                        // Calculate percentage based on videos watched vs total videos in module
                        Object.keys(moduleProgress).forEach(category => {
                          const module = moduleProgress[category]
                          // Progress is based on how many videos from this module the user has watched
                          module.progress = module.totalVideos > 0 ? (module.watchedCount / module.totalVideos) * 100 : 0
                        })
                        
                        // Get top 3 modules by videos watched (most active modules), excluding compulsory modules
                        const topModules = Object.entries(moduleProgress)
                          .filter(([category]) => !compulsoryModules.includes(category)) // Exclude compulsory modules
                          .sort(([,a], [,b]) => b.watchedCount - a.watchedCount) // Sort by videos watched
                          .slice(0, 3)
                        
                        return topModules.length > 0 ? (
                          topModules.map(([category, module], index) => {
                            // Get videos for this category to display thumbnails
                            const categoryVideos = allVideos.filter(v => v.category === category).slice(0, 3)
                            
                            return (
                              <motion.div
                                key={category}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                                onClick={() => startModuleFromCategory(category)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-base">{category}</h4>
                                      <p className="text-sm text-blue-700">
                                        {module.watchedCount} of {module.totalVideos} videos watched
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-blue-700">
                                      {Math.round(module.progress)}%
                                    </div>
                                    <div className="text-xs text-blue-500">Videos Watched</div>
                                  </div>
                                </div>
                                
                                {/* Video Thumbnails with Duration Overlays */}
                                <div className="flex gap-2 mb-3">
                                  {categoryVideos.map((video, videoIndex) => (
                                    <div key={video.id} className="relative">
                                      <img
                                        src={video.thumbnailUrl || `https://res.cloudinary.com/dnx1sl0nq/video/upload/${video.publicId}.jpg`}
                                        alt={video.title}
                                        className="w-16 h-12 object-cover rounded-md"
                                      />
                                      {/* Duration Overlay */}
                                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                                        {video.duration}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <Progress 
                                  value={module.progress} 
                                  className="h-2 bg-blue-200"
                                />
                              </motion.div>
                            )
                          })
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <div className="text-4xl mb-2">📚</div>
                            <p className="text-sm">No modules in progress yet</p>
                            <p className="text-xs">Start watching videos to see module progress here</p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  rotate: 0
                }}
                animate={{
                  y: window.innerHeight + 10,
                  rotate: 360,
                  x: Math.random() * window.innerWidth
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  ease: "easeOut"
                }}
                onAnimationComplete={() => {
                  if (i === 49) {
                    setTimeout(() => setShowConfetti(false), 1000)
                  }
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge Mode */}
      <ChallengeMode 
        isVisible={showChallengeMode} 
        onClose={() => setShowChallengeMode(false)}
      />
    </div>
  )
} 