"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  LogOut,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageSquare,
  Info,
  ArrowLeft,
  Lock,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Logo } from "../components/logo"
import { auth, db } from "@/firebase"
import { useAuth } from "../context/AuthContext"
import { useGamification } from "../context/GamificationContext"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Video {
  id: string
  title: string
  duration: string
  thumbnail?: string
  publicId?: string
  videoUrl?: string
  description?: string
  category?: string
  tags?: string[]
}

interface VideoWatchEvent {
  videoId: string;
  playlistId?: string;
  userId: string;
  userEmail: string;
  lastWatchedAt: any;
  progress: number;
  completed: boolean;
  watchDuration: number;
  milestones: number[];
  category?: string;
  tags?: string[];
  videoTitle?: string;
}

export default function CleanVideoPlayer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData } = useAuth()
  const { userProgress } = useGamification()
  
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [lastPosition, setLastPosition] = useState(0)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  const videoId = searchParams.get('videoId')
  const autoplayParam = searchParams.get('autoplay')

  useEffect(() => {
    if (autoplayParam === 'true') {
      setAutoplay(true)
    }
  }, [autoplayParam])

  useEffect(() => {
    if (!videoId) {
      setError("No video ID provided")
      setLoading(false)
      return
    }

    const fetchVideo = async () => {
      try {
        setLoading(true)
        
        // 1) Try treating the id as a Firestore document id
        const videoDocRef = doc(db, "videos", videoId)
        const videoSnap = await getDoc(videoDocRef)
        
        let videoData: any = null
        let docId: string = videoId
        
        if (videoSnap.exists()) {
          videoData = videoSnap.data()
        } else {
          // 2) Fallback: treat the id as a Cloudinary publicId
          const videosCollectionRef = collection(db, "videos")
          const q = query(videosCollectionRef, where("publicId", "==", videoId))
          const querySnap = await getDocs(q)
          
          if (!querySnap.empty) {
            const matchedDoc = querySnap.docs[0]
            videoData = matchedDoc.data()
            docId = matchedDoc.id
          }
        }
        
        if (videoData) {
          const video: Video = {
            id: docId,
            title: videoData.title || "Untitled Video",
            duration: videoData.duration || "0:00",
            thumbnail: videoData.thumbnailUrl || (videoData.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${videoData.publicId}.jpg` : "/placeholder.svg?height=180&width=320"),
            publicId: videoData.publicId,
            videoUrl: videoData.videoUrl,
            description: videoData.description || "",
            category: videoData.category || "",
            tags: videoData.tags || []
          }
          setCurrentVideo(video)
          
          // Load saved progress
          if (userData?.userId) {
            const savedPosition = await loadVideoProgress(video.id)
            if (savedPosition > 0 && !autoplay) {
              setLastPosition(savedPosition)
              setShowResumeDialog(true)
            }
          }
        } else {
          setError("Video not found")
        }
      } catch (err) {
        console.error("Error fetching video:", err)
        setError("Failed to load video")
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [videoId, userData?.userId, autoplay])

  const loadVideoProgress = async (videoId: string): Promise<number> => {
    if (!userData?.userId) return 0
    
    try {
      const watchEventsRef = collection(db, "watchEvents")
      const q = query(
        watchEventsRef,
        where("videoId", "==", videoId),
        where("userId", "==", userData.userId),
        orderBy("lastWatchedAt", "desc"),
        where("lastWatchedAt", ">", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const lastEvent = querySnapshot.docs[0].data()
        return lastEvent.progress || 0
      }
    } catch (error) {
      console.error("Error loading video progress:", error)
    }
    return 0
  }

  const saveVideoProgress = async (progress: number) => {
    if (!userData?.userId || !currentVideo) return
    
    try {
      const watchEventsRef = collection(db, "watchEvents")
      const q = query(
        watchEventsRef,
        where("videoId", "==", currentVideo.id),
        where("userId", "==", userData.userId)
      )
      const querySnapshot = await getDocs(q)
      
      const eventData = {
        lastWatchedAt: serverTimestamp(),
        progress: progress,
        completed: progress >= 90,
        watchDuration: Math.floor(currentTime),
        videoTitle: currentVideo.title,
        category: currentVideo.category,
        tags: currentVideo.tags
      }
      
      if (!querySnapshot.empty) {
        const docRef = doc(db, "watchEvents", querySnapshot.docs[0].id)
        await updateDoc(docRef, eventData)
      } else {
        const newDocData = {
          videoId: currentVideo.id,
          userId: userData.userId,
          userEmail: userData.email || "Unknown User",
          ...eventData
        }
        await addDoc(watchEventsRef, newDocData)
      }
    } catch (error) {
      console.error("Error saving video progress:", error)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      setCurrentTime(current)
      setDuration(total)
      
      // Save progress every 5 seconds
      if (Math.floor(current) % 5 === 0) {
        const progress = (current / total) * 100
        saveVideoProgress(progress)
      }
    }
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true)
        }).catch((error) => {
          console.error("Error playing video:", error)
          setIsPlaying(false)
        })
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const handleMuteToggle = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleFullscreen = async () => {
    if (!playerContainerRef.current) return
    
    try {
      if (!isFullscreen) {
        await playerContainerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleResume = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = lastPosition
      videoRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch((error) => {
        console.error("Error resuming video:", error)
        setIsPlaying(false)
      })
    }
    setShowResumeDialog(false)
  }

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch((error) => {
        console.error("Error starting video:", error)
        setIsPlaying(false)
      })
    }
    setShowResumeDialog(false)
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !userData?.userId || !currentVideo) return
    
    setSubmittingFeedback(true)
    try {
      await addDoc(collection(db, "feedback"), {
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        userId: userData.userId,
        userEmail: userData.email || "Unknown User",
        feedback: feedback.trim(),
        timestamp: serverTimestamp(),
        type: "general"
      })
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      })
      
      setFeedback("")
      setShowFeedbackDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    )
  }

  if (error || !currentVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-xl mb-4">{error || "Video not found"}</p>
          <Button onClick={() => window.close()}>
            Close
          </Button>
        </div>
      </div>
    )
  }

     return (
     <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white light flex items-center justify-center relative">
      {/* Back to Dashboard Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Video Player Section */}
        <div className="p-6">
          <div 
            ref={playerContainerRef}
            className="relative w-full max-w-4xl mx-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
                                      <video
               ref={videoRef}
               className="w-full aspect-video bg-black rounded-lg"
               poster={currentVideo.thumbnail ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${currentVideo.thumbnail}.jpg` : undefined}
               onTimeUpdate={handleTimeUpdate}
               onLoadedMetadata={() => {
                 // Always start paused, only autoplay if explicitly requested
                 if (autoplay && videoRef.current) {
                   videoRef.current.play().then(() => {
                     setIsPlaying(true)
                   }).catch(() => {
                     // If autoplay fails, keep it paused
                     setIsPlaying(false)
                   })
                 } else {
                   setIsPlaying(false)
                 }
               }}
               onPlay={() => setIsPlaying(true)}
               onPause={() => setIsPlaying(false)}
               onEnded={() => {
                 setIsPlaying(false)
                 saveVideoProgress(100)
               }}
             >
               <source src={currentVideo.videoUrl} type="video/mp4" />
               Your browser does not support the video tag.
             </video>

             {/* Clickable overlay for video interaction */}
             <div 
               className="absolute inset-0 cursor-pointer z-10"
               onClick={handlePlayPause}
               style={{ pointerEvents: isPlaying ? 'auto' : 'auto' }}
             />

                         {/* Video Controls Overlay */}
             <div 
               className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg transition-opacity duration-300 z-20 ${
                 showControls ? 'opacity-100' : 'opacity-0'
               }`}
             >
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-white text-sm mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                                     <Button
                     variant="ghost"
                     size="sm"
                     onClick={(e) => {
                       e.stopPropagation()
                       handlePlayPause()
                     }}
                     className="text-white hover:bg-white/10"
                   >
                     {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                   </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(-5)}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(5)}
                    className="text-white hover:bg-white/10"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMuteToggle}
                      className="text-white hover:bg-white/10"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/10"
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>

                         {/* Play Button Overlay */}
             {!isPlaying && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <Button
                   onClick={(e) => {
                     e.stopPropagation()
                     handlePlayPause()
                   }}
                   className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                 >
                   <Play className="h-8 w-8 text-white ml-1" />
                 </Button>
               </div>
             )}
          </div>

          {/* Video Info and Actions */}
          <div className="mt-6 max-w-4xl mx-auto">
            <div className="text-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentVideo.title}
                </h2>
                {currentVideo.description && (
                  <p className="text-gray-600 mt-2">
                    {currentVideo.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resume Video?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You were watching this video at {formatTime(lastPosition)}. Would you like to resume from where you left off?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleStartFromBeginning}>
              Start from Beginning
            </Button>
            <Button onClick={handleResume}>
              Resume from {formatTime(lastPosition)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate & Review: {currentVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="What did you think about this video? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || submittingFeedback}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom CSS for slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
