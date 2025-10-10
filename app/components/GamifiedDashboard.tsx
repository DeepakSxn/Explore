"use client"

import React, { useState, useEffect, useRef } from "react"
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
  RefreshCw,
  MessageCircle,
  Bot,
  Loader2,
  Send,
  User
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useGamification, XP_CONFIG } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore"
import { getAllModuleVideoOrders } from "../firestore-utils"
import { auth, db } from "@/firebase"

import ChallengeMode from "./ChallengeMode"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  thumbnail?: string
  publicId?: string
  videoUrl?: string
  duration: string
  category: string
  tags?: string[]
  createdAt: any
  watched?: boolean
  company?: string
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

// ViewMyProgress Component
interface ViewMyProgressProps {
  userProgress: any
}

function ViewMyProgress({ userProgress }: ViewMyProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { getCurrentLevel, getXPToNextLevel, getLevelProgress, loading } = useGamification()

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

  const getLevelIcon = (level: number) => {
    if (level <= 3) return <BookOpen className="h-5 w-5" />
    if (level <= 6) return <Target className="h-5 w-5" />
    if (level <= 9) return <Trophy className="h-5 w-5" />
    return <Crown className="h-5 w-5" />
  }

  // Show loading state instead of hiding completely
  const isLoading = loading || !userProgress

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardContent className="p-0">
        {/* Clickable Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => !isLoading && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <BarChart3 className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">View my progress</h3>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                Loading...
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Level {userProgress.currentLevel}
              </Badge>
            )}
            {!isLoading && (isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            ))}
          </div>
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && !isLoading && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Level Progress Card */}
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white/20 p-2 rounded-full">
                          {getLevelIcon(userProgress.currentLevel)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{getLevelTitle(userProgress.currentLevel)}</h3>
                          <p className="text-sm text-white">Level {userProgress.currentLevel}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-white">Progress to Level {userProgress.currentLevel + 1}</span>
                          <span className="text-white">{Math.round(getLevelProgress())}%</span>
                        </div>
                        <Progress 
                          value={getLevelProgress()} 
                          className="h-2 bg-white/20 [&>div]:bg-white"
                        />
                        <p className="text-xs text-white">
                          {getXPToNextLevel()} XP needed for next level
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Card */}
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                            <Play className="h-4 w-4" />
                          </div>
                          <p className="text-xl font-bold text-white">{userProgress.totalVideosWatched}</p>
                          <p className="text-xs text-white">Videos</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                            <span className="text-[10px] font-bold text-white">XP</span>
                          </div>
                          <p className="text-xl font-bold text-white">{userProgress.totalXP}</p>
                          <p className="text-xs text-white">Total XP</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Streak Card */}
                  {userProgress.currentStreak >= 0 && (
                    <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-full">
                            <Flame className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-white">Streak!</h3>
                            <p className="text-xs text-white">
                              {Math.max(1, userProgress.currentStreak)} day{Math.max(1, userProgress.currentStreak) !== 1 ? 's' : ''}
                            </p>
                            {userProgress.currentStreak >= 7 && (
                              <p className="text-xs text-white">
                                🎉 Week Warrior!
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-white">{Math.max(1, userProgress.currentStreak)}</p>
                            <p className="text-xs text-white">days</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default function GamifiedDashboard() {
  console.log("🎮 GamifiedDashboard component rendered - BUTTON VERSION v3.0 - WIDER LAYOUT")
  const router = useRouter()
  
  // Force gamified dashboard to stay active and clear problematic URL parameters
  useEffect(() => {
    // Lock the dashboard view
    localStorage.setItem('dashboardView', 'gamified')
    
    const url = new URL(window.location.href)
    let hasChanges = false
    
    // Remove problematic parameters
    if (url.searchParams.has('view')) {
      url.searchParams.delete('view')
      hasChanges = true
    }
    if (url.searchParams.has('module')) {
      url.searchParams.delete('module')
      hasChanges = true
    }
    
    if (hasChanges) {
      console.log("🧹 Clearing URL parameters that could switch to classic view")
      window.history.replaceState({}, '', url.toString())
    }
    
    console.log("🔒 Dashboard locked in gamified mode with wider layout")
  }, [])
  const { userProgress, loading, getCurrentLevel, getXPToNextLevel, getLevelProgress } = useGamification()
  const { userData } = useAuth()
  const [showConfetti, setShowConfetti] = useState(false)
  const [moduleSuggestions, setModuleSuggestions] = useState<any[]>([])
  const [topVideos, setTopVideos] = useState<Video[]>([])
  const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({})
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({})
  const completedVideoIdsRef = useRef<Set<string>>(new Set())

  const [showChallengeMode, setShowChallengeMode] = useState(false)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [isRefreshingPath, setIsRefreshingPath] = useState(false)
  
  // Chat state
  type ChatMessage = { id: string; role: "user" | "assistant"; content: string; videoReferences?: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> }
  const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [chatStarted, setChatStarted] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Banner messages that rotate
  const bannerMessages = [
    {
      text: "Try the Processing module",
      icon: Clock
    },
    {
      text: "Master the Sales module",
      icon: Target
    },
    {
      text: "Complete the QA module",
      icon: CheckCircle
    },
    {
      text: "Explore the AI tools",
      icon: Sparkles
    },
    {
      text: "Learn Contact Management",
      icon: Users
    }
  ]

  // Function to switch to classic dashboard view
  const switchToClassicView = () => {
    // Dispatch a custom event to communicate with the parent dashboard component
    window.dispatchEvent(new CustomEvent('switchToClassicView'))
  }

  // Rotate banner messages every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerMessages.length)
    }, 60000)

    return () => clearInterval(interval)
  }, [bannerMessages.length])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatStarted && chatEndRef.current) {
      // Only scroll within the chat container, not the entire page
      chatEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end",
        inline: "nearest"
      })
    }
  }, [chatMessages, chatStarted])

  // Initialize chat with welcome message
  useEffect(() => {
    if (!chatStarted && chatMessages.length === 0) {
      setChatMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi ${userData?.name || 'there'}! I'm Ryan, How can I help you?`,
          videoReferences: [],
        },
      ])
    }
  }, [userData?.name, chatStarted, chatMessages.length])

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const text = chatInput.trim()
    setChatInput("")
    setChatMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: text }])
    setChatLoading(true)
    
    // Prevent auto-scroll by maintaining scroll position
    const scrollY = window.scrollY
    setChatStarted(true)
    
    // Restore scroll position after state change
    setTimeout(() => {
      window.scrollTo(0, scrollY)
    }, 0)

    try {
      const newCount = messageCount + 1
      setMessageCount(newCount)
      sessionStorage.setItem("sparky_message_count", String(newCount))
      let currentThread = threadId
      if (newCount >= 20) {
        currentThread = null
        setThreadId(null)
        setMessageCount(0)
        sessionStorage.removeItem("sparky_thread_id")
        sessionStorage.setItem("sparky_message_count", "0")
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: currentThread }),
      })
      const data = await res.json()
      if (data.threadId && data.threadId !== currentThread) {
        setThreadId(data.threadId)
        sessionStorage.setItem("sparky_thread_id", data.threadId)
      }
      const replyText: string = data.reply || "I had trouble replying."
      const aiMessageId = (Date.now() + 1).toString()
      const refs = extractVideoReferences(replyText)
      setChatMessages((m) => [
        ...m,
        { id: aiMessageId, role: "assistant", content: replyText, videoReferences: refs },
      ])

      if (refs.length > 0) {
        resolveVideoReferencesForMessage(aiMessageId, refs)
      }
    } catch (e) {
      setChatMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error. Please try again." }])
    } finally {
      setChatLoading(false)
    }
  }

  // Extract probable video IDs from text
  const extractVideoReferences = (content: string): Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> => {
    const videoRefs: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> = []
    const videoIdRegex = /([a-zA-Z0-9]{20,})/g
    const matches = content.match(videoIdRegex)
    if (matches) {
      matches.forEach((match) => {
        if (match.length >= 20 && /^[a-zA-Z0-9]+$/.test(match)) {
          videoRefs.push({ videoId: match, thumbnail: `/placeholder.svg?height=120&width=200` })
        }
      })
    }
    return videoRefs
  }

  // Resolve video details from Firestore
  const fetchVideoDetails = async (videoId: string): Promise<{ videoId: string; title?: string; thumbnail?: string; duration?: string } | null> => {
    try {
      const byDocRef = doc(db, "videos", videoId)
      const byDocSnap = await getDoc(byDocRef)
      if (byDocSnap.exists()) {
        const d: any = byDocSnap.data()
        return {
          videoId,
          title: d.title || undefined,
          thumbnail: d.thumbnailUrl || (d.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.publicId}.jpg` : `/placeholder.svg?height=120&width=200`),
          duration: d.duration || "",
        }
      }
      const videosCol = collection(db, "videos")
      const qByPublicId = query(videosCol, where("publicId", "==", videoId))
      const qSnap = await getDocs(qByPublicId)
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data() as any
        return {
          videoId,
          title: d.title || undefined,
          thumbnail: d.thumbnailUrl || (d.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.publicId}.jpg` : `/placeholder.svg?height=120&width=200`),
          duration: d.duration || "",
        }
      }
      return null
    } catch (e) {
      return null
    }
  }

  const resolveVideoReferencesForMessage = async (messageId: string, refs: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }>) => {
    const updated = await Promise.all(
      refs.map(async (r) => {
        const details = await fetchVideoDetails(r.videoId)
        return details ? { ...r, ...details } : r
      })
    )
    setChatMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, videoReferences: updated } : m)))
  }

  const openVideo = (videoId: string) => {
    const url = `/video-player-clean?videoId=${videoId}&autoplay=true`
    try {
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      window.location.href = url
    }
  }


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

      // Get user's watch history (match the collection used by the video player)
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser.uid)
      )
      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchHistory = watchHistorySnapshot.docs.map(doc => doc.data()) as Array<{ videoId: string; progress?: number; completed?: boolean }>

      // Build a set of definitively completed videos for quick membership tests
      const completedIds = new Set<string>()
      watchHistory.forEach(e => {
        if (e.videoId && (e.completed || (typeof e.progress === 'number' && e.progress >= 90))) {
          completedIds.add(e.videoId)
        }
      })
      completedVideoIdsRef.current = completedIds

      // Build quick lookup for progress/completion by videoId
      const progressByVideoId: { [key: string]: { progress: number; completed: boolean } } = {}
      watchHistory.forEach(e => {
        const p = typeof e.progress === 'number' ? e.progress : 0
        const c = Boolean(e.completed)
        progressByVideoId[e.videoId] = { progress: p, completed: c }
      })

      // Calculate progress mapping for all videos using stored percent/completed
      const progressData: { [key: string]: number } = {}
      allVideos.forEach(video => {
        const entry = progressByVideoId[video.id]
        progressData[video.id] = entry ? Math.min(100, Math.max(entry.progress, entry.completed ? 100 : entry.progress)) : 0
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
        thumbnail: v.thumbnail || v.thumbnailUrl || (v.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${(v as any).publicId}.jpg` : undefined),
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
        {/* Animated Learning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                {/* Left side - Content with animations */}
                <div className="flex items-center gap-3">
                  <motion.div
                    key={`icon-${currentBannerIndex}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
                    className="bg-white/20 p-2 rounded-full"
                  >
                    {React.createElement(bannerMessages[currentBannerIndex].icon, {
                      className: "h-5 w-5 text-white"
                    })}
                  </motion.div>
                  
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`text-${currentBannerIndex}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="text-base font-semibold text-white"
                    >
                      {bannerMessages[currentBannerIndex].text}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Right side - Actions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <div className="flex items-center gap-2">
                   

                  <Button 
                    variant="secondary" 
                    size="lg"
                      onClick={switchToClassicView}
                    className="bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 transition-all duration-300 shadow-md hover:shadow-lg px-5 py-3 text-base"
                  >
                    <span className="hidden sm:inline">Start Learning</span>
                    <ArrowRight className="h-5 w-5 sm:ml-2" />
                  </Button>
                  </div>
                </motion.div>
              </div>
              
              {/* Animated background elements */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
                transition={{ duration: 2, delay: 1 }}
                className="absolute inset-0 overflow-hidden pointer-events-none"
              >
                <motion.div
                  animate={{ 
                    x: [0, 100, 0],
                    opacity: [0.1, 0.3, 0.1]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="absolute -top-4 -right-4 w-32 h-32 bg-white rounded-full"
                />
                <motion.div
                  animate={{ 
                    x: [0, -50, 0],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: 1
                  }}
                  className="absolute -bottom-2 -left-2 w-24 h-24 bg-white rounded-full"
                />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Single Column Layout - Chat Button Only */}
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Chat Section */}
          <Card className="w-full h-[500px] flex flex-col overflow-hidden">
            <CardHeader className="pb-3  pl-6 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-l from-blue-800 to-pink-400 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                Chat with Ryan
              </CardTitle>
            </CardHeader>
            
            {/* Chat Messages Area */}
            <CardContent className="flex-1 flex flex-col p-2 overflow-hidden">
              {!chatStarted ? (
                // Initial state - welcome message in center with input below
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 flex items-center justify-center px-8 py-6">
                    <div className="text-center space-y-6 max-w-2xl w-full">
                      <div className="space-y-2">
                        <p className="text-black-600 text-2xl font-medium ">
                          Got a question about a video?
                        </p>
                      </div>
                      
                      {/* Chat Input - Below the message for initial state */}
                      <div className="flex gap-2 mt-6 w-full ">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              sendChatMessage()
                            }
                          }}
                          placeholder="Ask me anything..."
                            className="flex-1 min-w-0 rounded-3xl border-2 border-gray-300"
                        />
                       
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Chat conversation with input at bottom
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "assistant" ? (
                          <div className="max-w-[85%]">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gradient-to-l from-blue-800 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                              <div className="bg-gray-100 rounded-lg p-3 flex-1">
                                <div className="whitespace-pre-line leading-relaxed text-gray-800">{message.content}</div>
                              </div>
                            </div>
                            {message.videoReferences && message.videoReferences.length > 0 && (
                              <div className="mt-3 ml-11 pt-3 border-t border-gray-100">
                                <div className="text-xs text-gray-500 mb-2">Referenced Videos:</div>
                                <div className="space-y-2">
                                  {message.videoReferences.map((v, i) => (
                                    <div key={`${v.videoId}-${i}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200" onClick={() => openVideo(v.videoId)}>
                                      <div className="w-16 h-12 bg-gradient-to-br from-green-100 to-green-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        <span className="text-2xl">🎥</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">{v.title || "Video Content"}</div>
                                        <div className="text-xs text-green-600 font-medium">Click to watch →</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="max-w-[85%] flex items-end gap-2">
                            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                              <div className="whitespace-pre-line leading-relaxed">{message.content}</div>
                            </div>
                            <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-800 to-pink-400 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Ryan is thinking...
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* Chat Input - At bottom during conversation */}
                  <div className="border-t bg-white p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendChatMessage()
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1"
                      />
                <Button
                        onClick={sendChatMessage} 
                        disabled={!chatInput.trim() || chatLoading}
                        size="icon"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <Send className="h-4 w-4" />
                </Button>
              </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* View My Progress - Collapsible Section */}
          <ViewMyProgress userProgress={userProgress} />
          
          {/* Learning Path Section - HIDDEN */}
          <Card data-learning-path className="hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Learning Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-blue-600">📚 Most Active Modules</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => {
                      try {
                        setIsRefreshingPath(true)
                        await fetchTopVideos()
                        toast({ title: "Learning path refreshed" })
                      } finally {
                        setIsRefreshingPath(false)
                      }
                    }}
                    disabled={isRefreshingPath}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshingPath ? 'animate-spin' : ''}`} />
                    {isRefreshingPath ? 'Refreshing…' : 'Refresh'}
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
                      
                      // Count as watched if explicitly completed in watch history or progress >= 90%
                      if (completedVideoIdsRef.current.has(video.id) || (videoProgress[video.id] || 0) >= 90) {
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
                      topModules.map(([category, module], index) => (
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
                          <Progress 
                            value={module.progress} 
                            className="h-2 bg-blue-200"
                          />
                        </motion.div>
                      ))
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
            </CardContent>
          </Card>
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