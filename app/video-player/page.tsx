"use client"

/**
 * Video Player Page with Per-Module Progressive Video Unlocking System
 * 
 * Video Locking Logic:
 * - First video of EACH module is unlocked by default (false = unlocked but not watched)
 * - Subsequent videos within each module start locked (null = locked)
 * - Videos unlock (null → false) only after completing the previous video in the SAME module
 * - Completed videos are marked as true
 * - Users can only play videos that are unlocked
 * - Different modules can have their first videos unlocked independently
 * 
 * Video States:
 * - null: Locked (cannot be played)
 * - false: Unlocked but not watched (can be played)
 * - true: Completed (can be replayed)
 * 
 * Module Independence:
 * - Users can start any module without completing previous modules
 * - Each module maintains its own progression
 * - Video unlocking is contained within each module
 */

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore"
import { getAllModuleVideoOrders, getAllModuleOrders } from "../firestore-utils"

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
  RefreshCw,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Logo } from "../components/logo"
import { auth, db } from "@/firebase"
import { ThemeToggle } from "../theme-toggle"
import { useAuth } from "../context/AuthContext"
import { useGamification } from "../context/GamificationContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import InteractiveGuide from "../components/InteractiveGuide"
import XPRewardPopup from "../components/XPRewardPopup"
// import VideoQuiz from "../components/VideoQuiz"

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
  lastWatchedAt: any; // Firebase timestamp
  progress: number; // Percentage of video watched (0-100)
  completed: boolean;
  watchDuration: number; // Total time spent watching in seconds
  milestones: number[]; // Array of reached milestones (25, 50, 75, 100)
  category?: string;
  tags?: string[];
  videoTitle?: string;
}


interface Module {
  name: string
  category: string
  videos: Video[]
}

interface Playlist {
  id: string
  createdAt: { seconds: number; nanoseconds: number }
  videos: Video[]
  userId?: string
  userEmail?: string
}

// Define an interface for the document data
interface VideoWatchEvent {
  videoId: string
  playlistId?: string
  watchedAt: any
  // Add other properties as needed
}

// Define VIDEO_ORDER constant for expected video titles
const VIDEO_ORDER: Record<string, string[]> = {
  Sales: [
    "Sales Module Overview",
    "Sales Order for Coils",
    "Sales Order for Plates",
    "Sales Order for Tubing & Pipes",
    "Sales order for Structural Steel",
    "Sales Orders for Bars",
    "Handling Backorder and Partial Delivery",
    "How does Buyout work in the system",
  ],
  Processing: [
    "Processing Module Overview",
    "Applying Processing Cost to Materials",
    "Toll Processing Purchase Orders",
    "Work Order Status and Tracking for Multiple Processing Lines",
  ],
  "Inventory Management": [
    "Inventory Module Overview",
    "Inventory for Plate and Sheet Products",
    "Material Traceability (Heat Numbers, Mill Certificates)",
    "Inventory Valuation (FIFO, Average & Actual Costing)",
    "Scrap Management",
    "Additional Cost",
  ],
  "Purchase": [
    "Creating Purchase Order for Coils",
    "Creating Purchase Orders for Plate and sheets",
    "Creating Purchase Orders for Long Products",
    "Freight Cost on PO's",
  ],
  "Finance and Accounting": [
    "Finance Module Overview",
    "Creating Customer Invoice",
    "Creating Vendor Bills",
    "Managing Accounts Payable and Receivable",
    "Multi-Stage Invoicing for Complex Orders",
    "Financial Reporting_ P&L and Balance sheets",
    "Tax Compliance and Reporting",
    "Payment Terms",
    "Handling Customer Credits",
    "Managing Multiple Entities or Divisions",
    "Multi currency Transactions",
    "Partner Aging",
  ],
  "Shipping and Receiving": ["Purchase Return", "Generating Packing List"],
  "CRM": ["CRM Module Overview", "Sales Pipeline and Leads Pipeline"],
  "IT & Security": ["User Access Control and Role-Based Permissions"],
  "Advanced Analytics & Reporting": [
    "Real-Time Dashboards for Sales, Inventory, and Processing Operations",
    "Custom Reports for Processing",
    "Tracking Lead Times for Processing & Delivery",
  ],
  "Master Data Management": [
    "Product Master Creation and Management",
    "Warehouse Master and Location Managment",
    "Unit of Measure Setup (Pounds, Kg, Foot, Inches, CWT, etc.)",
  ],
  "Contact Management": [
    "Contacts Module Overview",
    "Managing Customer Contacts",
    "Managing Supplier & Vendor Contacts",
    "Configuring Custom Fields and Grouping Contacts",
    "Maps Feature",
    "Days Feature",
    "Email",
    "Credit Management",
  ],
  "QA": ["Mill Certs"],
}

export default function VideoPlayerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Normalize query params to avoid values like "null" or "undefined"
  const rawVideoId = searchParams.get("videoId") || searchParams.get("videold")
  const videoId = rawVideoId && rawVideoId !== "null" && rawVideoId !== "undefined" && rawVideoId.trim() !== "" ? rawVideoId : null
  const rawPlaylistId = searchParams.get("playlistId")
  const playlistId = rawPlaylistId && rawPlaylistId !== "null" && rawPlaylistId !== "undefined" && rawPlaylistId.trim() !== "" ? rawPlaylistId : null
  const resume = searchParams.get("resume")
  const position = searchParams.get("position")
  const autoplay = searchParams.get("autoplay")

  const { userData } = useAuth()
  const { completeVideo, checkModuleCompletion } = useGamification()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [videoInfoOpen, setVideoInfoOpen] = useState(false)
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null)
  const [videoWatchEvents, setVideoWatchEvents] = useState<Record<string, boolean | null>>({})
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({})
  const [videoProgressMilestones, setVideoProgressMilestones] = useState<Record<string, number[]>>({})
  const [modules, setModules] = useState<Module[]>([])
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null)
  const [lastWatchedVideoId, setLastWatchedVideoId] = useState<string | null>(null)

  const [videoRating, setVideoRating] = useState<number | null>(null)
  const [videoFeedback, setVideoFeedback] = useState("")
  const [videoFeedbackOpen, setVideoFeedbackOpen] = useState(false)
  const [submittingVideoFeedback, setSubmittingVideoFeedback] = useState(false)
  const [videoFeedbacks, setVideoFeedbacks] = useState<any[]>([])
  const [showVideoFeedbacks, setShowVideoFeedbacks] = useState(false)
  
  // Add state to track if current video has been completed (for scrubbing restrictions)
  const [isVideoCompleted, setIsVideoCompleted] = useState(false)
  // Show forward-seek restriction toast only once per video
  const [forwardRestrictionShown, setForwardRestrictionShown] = useState(false)
  // Brief on-screen banner for restriction (5s, once per video)
  const [showForwardRestrictionBanner, setShowForwardRestrictionBanner] = useState(false)

  // XP Reward Popup states
  const [showXPReward, setShowXPReward] = useState(false)
  const [xpRewardData, setXpRewardData] = useState<{
    xpAmount: number
    reason: string
    type: 'video' | 'module' | 'achievement' | 'streak'
    videoTitle?: string
    moduleName?: string
  } | null>(null)

  // Add playbackRate state and handlers
  const [playbackRate, setPlaybackRate] = useState(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)

  const [volume, setVolume] = useState(100)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeSliderRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoChangeRef = useRef<boolean>(false)
  const [isHovered, setIsHovered] = useState(false)

  // Suspension warning banner visibility (per-login, dismissible)
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(true)

  // Add these state variables at the top with other state declarations
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [lastPosition, setLastPosition] = useState(0);
  const [moduleOrders, setModuleOrders] = useState<Record<string, number>>({});
  // const [showQuiz, setShowQuiz] = useState(false);
  // const [currentQuiz, setCurrentQuiz] = useState<any>(null);

  // Initialize volume and mute state from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem("videoPlayerVolume")
    const savedMuted = localStorage.getItem("videoPlayerMuted")
    if (savedVolume !== null) {
      setVolume(Number(savedVolume))
    }
    if (savedMuted !== null) {
      setIsMuted(savedMuted === "true")
    }
  }, [])

  // Persist volume to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("videoPlayerVolume", String(volume))
  }, [volume])

  // Persist mute state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("videoPlayerMuted", String(isMuted))
  }, [isMuted])

  // When volume or mute changes, update the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  // When a new video loads, apply the persisted volume/mute state
  useEffect(() => {
    if (videoRef.current) {
      const savedVolume = localStorage.getItem("videoPlayerVolume")
      const savedMuted = localStorage.getItem("videoPlayerMuted")
      videoRef.current.volume = savedVolume !== null ? Number(savedVolume) / 100 : volume / 100
      videoRef.current.muted = savedMuted !== null ? savedMuted === "true" : isMuted
    }
  }, [currentVideo])

  // Close resume dialog when quiz becomes active
  // useEffect(() => {
  //   if (showQuiz) {
  //     setShowResumeDialog(false);
  //   }
  // }, [showQuiz]);

  // 5-second rewind handler
  const handleRewind5Seconds = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  // 5-second forward handler
  const handleForward5Seconds = () => {
    if (videoRef.current) {
      // Check if this is a rewatch (video has been completed before)
      const isRewatch = videoWatchEvents[currentVideo?.id || ''] === true;
      
      console.log(`🔍 Forward 5s: Video ${currentVideo?.id}, isRewatch: ${isRewatch}`);
      
      // Only allow forward scrubbing if video has been completed (rewatch)
      if (!isRewatch) {
        if (!forwardRestrictionShown) {
          toast({
            title: "Forward seeking disabled",
            description: "You must complete watching this video before you can skip forward.",
            variant: "destructive",
            duration: 5000,
          });
          setForwardRestrictionShown(true)
        }
        return;
      }
      
      console.log(`✅ Forward 5s allowed for rewatch of video: ${currentVideo?.id}`);
      const newTime = videoRef.current.currentTime + 5;
      videoRef.current.currentTime = Math.min(newTime, videoRef.current.duration);
    }
  };

  // Progress bar click handler with scrubbing restrictions
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !currentVideo) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    const newTime = clickPercentage * videoRef.current.duration;
    
    // Check if user is trying to skip forward
    if (newTime > videoRef.current.currentTime) {
      // Check if this is a rewatch (video has been completed before)
      const isRewatch = videoWatchEvents[currentVideo.id] === true;
      
      // Only allow forward seeking if video has been completed (rewatch)
      if (!isRewatch) {
        if (!forwardRestrictionShown) {
          toast({
            title: "Forward seeking disabled",
            description: "You must complete watching this video before you can skip forward.",
            variant: "destructive",
            duration: 5000,
          });
          setForwardRestrictionShown(true)
        }
        return;
      }
    }
    
    // Allow backward seeking (rewinding) at any time
    videoRef.current.currentTime = newTime;
  };

  // Keyboard shortcuts for video controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts when video player is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleRewind5Seconds();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleForward5Seconds();
          break;
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            handleVideoPause();
          } else {
            handleVideoPlay();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Reset suspension banner dismissal on each login (show again)
        try {
          sessionStorage.removeItem(`dismiss_suspension_${currentUser.uid}`)
        } catch {}

        // Debug: Check all categories in database
        await debugCategories()

        // Load module orders from admin settings
        try {
          const orders = await getAllModuleOrders()
          setModuleOrders(orders)
        } catch (error) {
          console.error("Error loading module orders:", error)
        }

        // Fetch last watched video if no specific videoId is provided
        if (!videoId) {
          const lastWatched = await fetchLastWatchedVideo(currentUser.uid)
          if (lastWatched) {
            setLastWatchedVideoId(lastWatched.videoId)
            // If we have a playlistId, use it, otherwise fetch the video directly
            if (playlistId) {
              fetchPlaylist(playlistId, lastWatched.videoId)
              fetchWatchHistory()
            } else {
              // Redirect to the video player with the last watched video
              router.push(
                `/video-player?videoId=${lastWatched.videoId}${playlistId ? `&playlistId=${playlistId}` : ""}`,
              )
            }
          } else if (playlistId) {
            // If no last watched video but we have a playlistId, fetch the playlist
            fetchPlaylist(playlistId)
            fetchWatchHistory()
          }
        } else if (playlistId) {
          // If we have both videoId and playlistId, fetch the playlist
          fetchPlaylist(playlistId, videoId)
        } else if (videoId) {
          // If only videoId is present, fetch that single video
          await fetchVideoById(videoId)
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router, playlistId, videoId])

  // Check for suspension status
  useEffect(() => {
    if (userData && (userData.isSuspended || userData.manuallySuspended)) {
      // User is suspended, redirect to suspension page
      router.push("/suspended")
    }
    // Initialize warning visibility per login session
    if (user) {
      try {
        const dismissed = sessionStorage.getItem(`dismiss_suspension_${user.uid}`) === 'true'
        setShowSuspensionWarning(!dismissed)
      } catch {
        setShowSuspensionWarning(true)
      }
    }
  }, [userData, router, user])

  useEffect(() => {
    if (playlist && user) {
      fetchWatchHistory()
    }
  }, [playlist, user])

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      unlockNextVideoIfNeeded(currentVideo.id)
    }
  }, [videoWatchEvents, currentVideo])

  // Fetch the last watched video for a user
  const fetchLastWatchedVideo = async (userId: string) => {
    try {
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId)
      );
  
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
  
      if (watchHistorySnapshot.empty) return null;
  
      // Explicitly type the mapped data
      const sortedEvents = watchHistorySnapshot.docs
        .map((doc) => ({
          ...(doc.data() as VideoWatchEvent),
          id: doc.id,
          lastWatchedAt: doc.data().lastWatchedAt?.toDate() || new Date(0),
        }))
        .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
  
      if (sortedEvents.length > 0) {
        return {
          videoId: sortedEvents[0].videoId,
          playlistId: sortedEvents[0].playlistId,
        };
      }
  
      return null;
    } catch (error) {
      console.error("Error fetching last watched video:", error);
      return null;
    }
  };
  

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      // Reset completion status for new video
      setIsVideoCompleted(false);
      setForwardRestrictionShown(false);
      
      // Check if this is a rewatch (video has been completed before)
      const isRewatch = videoWatchEvents[currentVideo.id] === true;
      
      // Only show the restriction banner if this is NOT a rewatch
      if (!isRewatch) {
        setShowForwardRestrictionBanner(true);
        const hideTimer = setTimeout(() => setShowForwardRestrictionBanner(false), 5000)
        checkAndSetVideoWatched(currentVideo.id)
        return () => clearTimeout(hideTimer)
      } else {
        // For rewatches, don't show the restriction banner
        setShowForwardRestrictionBanner(false);
        checkAndSetVideoWatched(currentVideo.id)
      }
    }
  }, [currentVideo])

  // Hide banner if video gets completed early
  useEffect(() => {
    if (isVideoCompleted) {
      setShowForwardRestrictionBanner(false)
    }
  }, [isVideoCompleted])

  useEffect(() => {
    // Set up fullscreen change event listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    // Initialize current video only when necessary
    if (playlist?.videos && Array.isArray(playlist.videos) && playlist.videos.length > 0 && videoId) {
      const index = playlist.videos.findIndex((v) => v.id === videoId)

      // Guard against invalid videoId
      if (index === -1) {
        // If videoId not found, start with the first video
        videoChangeRef.current = true
        setCurrentVideoIndex(0)
        setCurrentVideo(playlist.videos[0])

        // Update URL to reflect the first video
        const newUrl = `/video-player?videoId=${playlist.videos[0].id}&playlistId=${playlistId}`
        window.history.pushState({}, "", newUrl)
      } else if (currentVideo?.id !== videoId || currentVideoIndex !== index) {
        // Only update state if video changed
        videoChangeRef.current = true
        setCurrentVideoIndex(index)
        setCurrentVideo(playlist.videos[index])
      }
    }
  }, [playlist, videoId, currentVideo?.id, currentVideoIndex, router, playlistId])

  // Add cleanup for safety
  useEffect(() => {
    return () => {
      // Reset video states on unmount
      setCurrentVideoIndex(0)
      setCurrentVideo(null)
    }
  }, [])

  // Modify the loadVideoProgress function
  const loadVideoProgress = async (videoId: string) => {
    if (!user || !videoId) return 0;

    try {
      console.log('Loading video progress for:', videoId);
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", videoId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log('Found saved progress:', data);
        return data.lastPosition || 0;
      }
      console.log('No saved progress found');
      return 0;
    } catch (error) {
      console.error("Error loading video progress:", error);
      return 0;
    }
  };

  // Add these new functions
  const handleResume = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = lastPosition;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setWatchStartTime(Date.now() / 1000);
          videoChangeRef.current = false;
        })
        .catch((error) => {
          console.error("Error playing video:", error);
        });
    }
    setShowResumeDialog(false);
  };

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setWatchStartTime(Date.now() / 1000);
          videoChangeRef.current = false;
        })
        .catch((error) => {
          console.error("Error playing video:", error);
        });
    }
    setShowResumeDialog(false);
  };

  // Modify the useEffect that handles video changes
  useEffect(() => {
    if (currentVideo && videoRef.current && videoChangeRef.current) {
      console.log('Video changed, loading progress...');
      // Reset video state
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Reset mute state
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
      
      // Reset playback rate
      setPlaybackRate(1);
      if (videoRef.current) {
        videoRef.current.playbackRate = 1;
      }

      // Load and restore video progress
      const loadProgress = async () => {
        try {
          let savedPosition = await loadVideoProgress(currentVideo.id);
          console.log('Loaded saved position:', savedPosition);
          
          // Check if resume parameters are present in URL
          if (resume === "true" && position) {
            const resumePosition = parseFloat(position);
            if (!isNaN(resumePosition) && resumePosition > 0) {
              savedPosition = resumePosition;
              console.log('Using resume position from URL:', savedPosition);
            }
          }
          
          if (savedPosition > 0 /* && !showQuiz && !currentQuiz */) {
            setLastPosition(savedPosition);
            // Always auto-resume from the last saved position without showing a dialog
              const attemptResume = () => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  console.log('Video ready, setting currentTime to:', savedPosition);
                  videoRef.current.currentTime = savedPosition;
                  videoRef.current.play()
                    .then(() => {
                      setIsPlaying(true);
                      setWatchStartTime(Date.now() / 1000);
                      videoChangeRef.current = false;
                      console.log('Successfully resumed video from position:', savedPosition);
                    })
                    .catch((error) => {
                      console.error("Error playing video:", error);
                    });
                } else {
                  // Video not ready yet, try again in a moment
                  console.log('Video not ready yet, retrying...');
                  setTimeout(attemptResume, 100);
                }
              };
              
              // Start attempting to resume
              attemptResume();
          } else {
            // If no saved position or quiz is active, just show the video
            videoRef.current?.load();
          }
          
          videoChangeRef.current = false;
        } catch (error) {
          console.error("Error loading video progress:", error);
          videoRef.current?.load();
        }
      };

      loadProgress();
    }
  }, [currentVideo /* , showQuiz, currentQuiz */]);

  // Autoplay handler when opened with ?autoplay=true
  useEffect(() => {
    if (autoplay === "true" && resume !== "true" && currentVideo) {
      const attemptPlay = () => {
        if (!videoRef.current) return
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true)
          })
          .catch(() => {
            if (!videoRef.current) return
            const previousMuted = videoRef.current.muted
            videoRef.current.muted = true
            videoRef.current.play()
              .then(() => {
                setIsPlaying(true)
              })
              .catch(() => {
                // restore previous mute state if still blocked
                if (videoRef.current) videoRef.current.muted = previousMuted
              })
          })
      }

      if (videoRef.current && videoRef.current.readyState >= 2) {
        attemptPlay()
      } else if (videoRef.current) {
        const onCanPlay = () => attemptPlay()
        videoRef.current.addEventListener("canplay", onCanPlay, { once: true } as any)
        return () => videoRef.current?.removeEventListener("canplay", onCanPlay)
      }
    }
  }, [autoplay, resume, currentVideo])

  // Add this new function to fetch videos directly from Firestore
  const fetchCategoryVideos = async (category: string): Promise<Video[]> => {
    if (!user) return []

    try {
      console.log(`Fetching videos for category: "${category}"`)
      
      // Get all videos first to search through them
      const videosCollection = collection(db, "videos")
      const allVideosQuery = query(videosCollection)
      const allVideosSnapshot = await getDocs(allVideosQuery)
      
      // First, try to find videos by exact category name
      const exactCategoryVideos = allVideosSnapshot.docs.filter((doc) => {
        const videoCategory = doc.data().category
        return videoCategory === category
      }).map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "Untitled",
          duration: data.duration || "0 minutes",
                      thumbnail: (() => {
              let thumbnailUrl = data.thumbnailUrl || (data.publicId
                ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${data.publicId}.jpg`
                : "/placeholder.svg?height=180&width=320")
              if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                const separator = thumbnailUrl.includes('?') ? '&' : '?'
                const randomId = Math.random().toString(36).substring(7)
                const version = Math.floor(Math.random() * 1000)
                thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}&v=${version}&r=${randomId}&cb=${Math.random()}`
              }
              return thumbnailUrl
            })(),
          description: data.description || "No description available",
          category: data.category || "Uncategorized",
          videoUrl: data.videoUrl || "",
          publicId: data.publicId || "",
          tags: data.tags || []
        } as Video
      })

      console.log(`Found ${exactCategoryVideos.length} videos with exact category: ${category}`)
      
      if (exactCategoryVideos.length > 0) {
        return exactCategoryVideos
      }
      
      // If no exact category matches, try to find videos with similar category names
      const similarCategories = new Set<string>()
      allVideosSnapshot.docs.forEach((doc) => {
        const videoCategory = doc.data().category
        if (videoCategory && videoCategory.toLowerCase().includes(category.toLowerCase())) {
          similarCategories.add(videoCategory)
        }
      })
      
      console.log(`Found similar categories for "${category}":`, Array.from(similarCategories))
      
      if (similarCategories.size > 0) {
        const firstSimilarCategory = Array.from(similarCategories)[0]
        console.log(`Trying to fetch videos for similar category: "${firstSimilarCategory}"`)
        
        const similarVideos = allVideosSnapshot.docs.filter((doc) => {
          const videoCategory = doc.data().category
          return videoCategory === firstSimilarCategory
        }).map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || "Untitled",
            duration: data.duration || "0 minutes",
            thumbnail: (() => {
              let thumbnailUrl = data.thumbnailUrl || (data.publicId
                ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${data.publicId}.jpg`
                : "/placeholder.svg?height=180&width=320")
              if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                const separator = thumbnailUrl.includes('?') ? '&' : '?'
                const randomId = Math.random().toString(36).substring(7)
                const version = Math.floor(Math.random() * 1000)
                thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}&v=${version}&r=${randomId}&cb=${Math.random()}`
              }
              return thumbnailUrl
            })(),
            description: data.description || "No description available",
            category: data.category || "Uncategorized",
            videoUrl: data.videoUrl || "",
            publicId: data.publicId || "",
            tags: data.tags || []
          } as Video
        })
        
        console.log(`Fetched ${similarVideos.length} videos for similar category: ${firstSimilarCategory}`)
        return similarVideos
      }
      
      // If still no videos found, try to find videos by title that match the expected titles
      console.log(`No similar categories found, trying to find videos by title for category: "${category}"`)
      
      const expectedTitles = VIDEO_ORDER[category] || []
      console.log(`Expected titles for ${category}:`, expectedTitles)
      
      const videosByTitle: Video[] = []
      allVideosSnapshot.docs.forEach((doc) => {
        const videoData = doc.data()
        const videoTitle = videoData.title
        
        if (videoTitle && expectedTitles.some(expectedTitle => {
          const titleLower = videoTitle.toLowerCase()
          const expectedLower = expectedTitle.toLowerCase()
          return titleLower.includes(expectedLower) || expectedLower.includes(titleLower)
        })) {
          videosByTitle.push({
            id: doc.id,
            title: videoData.title || "Untitled",
            duration: videoData.duration || "0 minutes",
            thumbnail: (() => {
              let thumbnailUrl = videoData.thumbnailUrl || (videoData.publicId
                ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${videoData.publicId}.jpg`
                : "/placeholder.svg?height=180&width=320")
              if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                const separator = thumbnailUrl.includes('?') ? '&' : '?'
                const randomId = Math.random().toString(36).substring(7)
                const version = Math.floor(Math.random() * 1000)
                thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}&v=${version}&r=${randomId}&cb=${Math.random()}`
              }
              return thumbnailUrl
            })(),
            description: videoData.description || "No description available",
            category: videoData.category || "Uncategorized",
            videoUrl: videoData.videoUrl || "",
            publicId: videoData.publicId || "",
            tags: videoData.tags || []
          })
        }
      })
      
      console.log(`Found ${videosByTitle.length} videos by title for category: ${category}`)
      
      // If we found videos by title, return them
      if (videosByTitle.length > 0) {
        return videosByTitle
      }
      
      // If still no videos found, try a broader search for any videos that might be related
      console.log(`No videos found by title, trying broader search for category: "${category}"`)
      
      const broaderSearchVideos: Video[] = []
      allVideosSnapshot.docs.forEach((doc) => {
        const videoData = doc.data()
        const videoTitle = videoData.title || ""
        const videoCategory = videoData.category || ""
        const videoDescription = videoData.description || ""
        
        // Search in title, category, and description
        const searchText = `${videoTitle} ${videoCategory} ${videoDescription}`.toLowerCase()
        const categoryLower = category.toLowerCase()
        
        if (searchText.includes(categoryLower) || categoryLower.includes(searchText)) {
          broaderSearchVideos.push({
            id: doc.id,
            title: videoData.title || "Untitled",
            duration: videoData.duration || "0 minutes",
            thumbnail: (() => {
              let thumbnailUrl = videoData.thumbnailUrl || (videoData.publicId
                ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${videoData.publicId}.jpg`
                : "/placeholder.svg?height=180&width=320")
              if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                const separator = thumbnailUrl.includes('?') ? '&' : '?'
                const randomId = Math.random().toString(36).substring(7)
                const version = Math.floor(Math.random() * 1000)
                thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}&v=${version}&r=${randomId}&cb=${Math.random()}`
              }
              return thumbnailUrl
            })(),
            description: videoData.description || "No description available",
            category: videoData.category || "Uncategorized",
            videoUrl: videoData.videoUrl || "",
            publicId: videoData.publicId || "",
            tags: videoData.tags || []
          })
        }
      })
      
      console.log(`Found ${broaderSearchVideos.length} videos by broader search for category: ${category}`)
      return broaderSearchVideos
      
    } catch (error) {
      console.error(`Error fetching ${category} videos:`, error)
      return []
    }
  }

  // Fetch a single video by its document ID and initialize a minimal playlist
  const fetchVideoById = async (id: string) => {
    try {
      setLoading(true)
      // 1) Try treating the id as a Firestore document id
      const videoDocRef = doc(db, "videos", id)
      const videoSnap = await getDoc(videoDocRef)

      // Helper to initialize state from a Firestore document
      const initializeFromData = (docId: string, data: any) => {
        const video: Video = {
          id: docId,
          title: data.title || "Untitled",
          duration: data.duration || "0 minutes",
          thumbnail: (() => {
            let thumbnailUrl = data.thumbnailUrl || (data.publicId
              ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${data.publicId}.jpg`
              : "/placeholder.svg?height=180&width=320")
            if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
              const separator = thumbnailUrl.includes('?') ? '&' : '?'
              const randomId = Math.random().toString(36).substring(7)
              const version = Math.floor(Math.random() * 1000)
              thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}&v=${version}&r=${randomId}&cb=${Math.random()}`
            }
            return thumbnailUrl
          })(),
          description: data.description || "",
          category: data.category || "",
          videoUrl: data.videoUrl || "",
          publicId: data.publicId || "",
          tags: data.tags || []
        }

        const singlePlaylist: Playlist = {
          id: `single-${docId}`,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          videos: [video]
        }

        videoChangeRef.current = true
        setPlaylist(singlePlaylist)
        setCurrentVideoIndex(0)
        setCurrentVideo(video)
      }

      if (videoSnap.exists()) {
        initializeFromData(id, videoSnap.data())
      } else {
        // 2) Fallback: treat the id as a Cloudinary publicId
        const videosCollectionRef = collection(db, "videos")
        const q = query(videosCollectionRef, where("publicId", "==", id))
        const querySnap = await getDocs(q)

        if (!querySnap.empty) {
          const matchedDoc = querySnap.docs[0]
          initializeFromData(matchedDoc.id, matchedDoc.data())
        } else {
          setPlaylist(null)
          setCurrentVideo(null)
        }
      }
    } catch (error) {
      console.error("Failed to fetch video by id:", error)
      setPlaylist(null)
      setCurrentVideo(null)
    } finally {
      setLoading(false)
    }
  }

  // Debug function to check all available categories
  const debugCategories = async () => {
    if (!user) return

    try {
      const videosCollection = collection(db, "videos")
      const videoSnapshot = await getDocs(videosCollection)
      
      const categories = new Set<string>()
      videoSnapshot.docs.forEach((doc) => {
        const category = doc.data().category
        if (category) {
          categories.add(category)
        }
      })
      
      console.log("All available categories in database:", Array.from(categories))
      
      // Check for AI tools specifically
      const aiToolsVideos = videoSnapshot.docs.filter((doc) => {
        const category = doc.data().category
        return category && (category.toLowerCase().includes('ai') || category.toLowerCase().includes('artificial'))
      })
      
      console.log("Videos with AI-related categories:", aiToolsVideos.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        category: doc.data().category
      })))
    } catch (error) {
      console.error("Error debugging categories:", error)
    }
  }

  // Helper function to sort videos according to VIDEO_ORDER
  const sortVideosByOrder = (videos: Video[], moduleName: string): Video[] => {
    const expectedTitles = VIDEO_ORDER[moduleName] || []
    return [...videos].sort((a, b) => {
      // Try exact match first
      let orderA = expectedTitles.indexOf(a.title)
      let orderB = expectedTitles.indexOf(b.title)
      
      // If exact match not found, try partial match
      if (orderA === -1) {
        orderA = expectedTitles.findIndex(expectedTitle => 
          a.title.toLowerCase().includes(expectedTitle.toLowerCase()) || 
          expectedTitle.toLowerCase().includes(a.title.toLowerCase())
        )
      }
      
      if (orderB === -1) {
        orderB = expectedTitles.findIndex(expectedTitle => 
          b.title.toLowerCase().includes(expectedTitle.toLowerCase()) || 
          expectedTitle.toLowerCase().includes(b.title.toLowerCase())
        )
      }
      
      // If both videos are found in the expected order
      if (orderA !== -1 && orderB !== -1) {
        return orderA - orderB
      }
      
      // If only one video is found in the expected order, prioritize it
      if (orderA !== -1) return -1
      if (orderB !== -1) return 1
      
      // If neither video is in the expected order, sort alphabetically
      return a.title.localeCompare(b.title)
    })
  }

  // Add this function to reorder videos according to the expected module sequence
  // IMPORTANT: This function ONLY reorders videos that are in the current playlist
  // It does NOT add videos from previous selections or unfinished modules
  const reorderVideosByModuleSequence = async (videos: Video[]): Promise<Video[]> => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) return videos

    // Fetch admin-defined per-category order
    let categoryOrders: Record<string, string[]> = {}
    try {
      categoryOrders = await getAllModuleVideoOrders()
      console.log("🎯 Player loaded admin orders:", categoryOrders)
    } catch (e) {
      console.warn("Could not load moduleVideoOrders in player", e)
    }

    // Get all unique categories from the videos in the playlist
    const allCategoriesInPlaylist = [...new Set(
      videos.map(v => v.category).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    )]
    
    console.log("🎯 All categories found in playlist for reordering:", allCategoriesInPlaylist);

    // Group videos by category
    const videosByCategory = videos.reduce((acc, video) => {
      const category = video.category || "Uncategorized"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(video)
      return acc
    }, {} as Record<string, Video[]>)

    // Create ordered videos array
    const orderedVideos: Video[] = []

    // Add videos in the order they appear in the playlist categories
    for (const category of allCategoriesInPlaylist) {
      let categoryVideos = videosByCategory[category] || []
      
      // Debug: Log what's happening with each module
      console.log(`🔍 Processing module for reordering: "${category}"`)
      console.log(`  - Videos found: ${categoryVideos.length}`)
      console.log(`  - Video titles: ${categoryVideos.map(v => v.title).join(', ')}`)
      
      if (categoryVideos.length > 0) {
        // Apply saved order if present for this category; otherwise keep original order
        const saved = categoryOrders[category]
        let sortedCategoryVideos = categoryVideos
        if (saved && saved.length > 0) {
          sortedCategoryVideos = [...categoryVideos].sort((a, b) => {
            const ia = saved.indexOf(a.id)
            const ib = saved.indexOf(b.id)
            const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
            const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
            return aPos - bPos
          })
        }
        orderedVideos.push(...sortedCategoryVideos)
        console.log(`✅ Added ${sortedCategoryVideos.length} videos for module: "${category}"`)
      }
    }

    console.log("Reordered videos:", orderedVideos.map(v => `${v.category}: ${v.title}`))
    return orderedVideos
  }

  // Function to unlock the first video of each module
  const unlockFirstVideoOfEachModule = (moduleArray: Module[]) => {
    if (!moduleArray || moduleArray.length === 0) return
    
    const updatedWatchEvents = { ...videoWatchEvents }
    let unlockedCount = 0
    
    moduleArray.forEach((module) => {
      if (module.videos && module.videos.length > 0) {
        const firstVideoId = module.videos[0].id
        if (updatedWatchEvents[firstVideoId] === null) {
          updatedWatchEvents[firstVideoId] = false // Unlock first video of each module
          unlockedCount++
          console.log(`🔓 Unlocked first video of module "${module.name}": ${firstVideoId}`)
        } else {
          console.log(`ℹ️ First video of module "${module.name}" already unlocked: ${firstVideoId}`)
        }
      }
    })
    
    if (unlockedCount > 0) {
      setVideoWatchEvents(updatedWatchEvents)
      console.log(`🎯 Unlocked ${unlockedCount} module starter videos`)
    }
  }

  const organizeIntoModules = async (videos: Video[]) => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) return

    // IMPORTANT: This function ONLY shows:
            // 1. Compulsory modules (Company Introduction, Additional Features, AI tools)
    // 2. User-selected modules from the current playlist
    // 3. NO previous unfinished modules or other categories

    // Create modules array
    const moduleArray: Module[] = []
    
    // Track which categories have already been added to prevent duplicates
    const addedCategories = new Set<string>()

    // Group videos by category
    const videosByCategory = videos.reduce(
      (acc, video) => {
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>,
    )

    // Debug: Log all categories found
    console.log("Available categories:", Object.keys(videosByCategory))
    console.log("Sales videos:", videosByCategory["Sales"] || [])
    console.log("QA videos:", videosByCategory["QA"] || [])
    console.log("AI tools videos:", videosByCategory["AI tools"] || [])
    console.log("Total videos in playlist:", videos.length)
    
    // Debug: Check for any videos with similar category names
    const allCategories = new Set(videos.map(v => v.category))
    console.log("🔍 All unique categories in videos:", Array.from(allCategories))
    console.log(
      "🔍 Looking for Sales-like categories:",
      Array.from(allCategories).filter((cat): cat is string => typeof cat === 'string' && cat.toLowerCase().includes('sales'))
    )
    console.log(
      "🔍 Looking for QA-like categories:",
      Array.from(allCategories).filter((cat): cat is string => typeof cat === 'string' && cat.toLowerCase().includes('qa'))
    )

    // Get all unique categories from the videos in the playlist
    // This makes it fully dynamic based on what comes from the dashboard
    const allCategoriesInPlaylist = [...new Set(
      videos.map(v => v.category).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    )]
    
    console.log("🎯 All categories found in playlist:", allCategoriesInPlaylist);
    console.log("📋 Total videos in playlist:", videos.length);
    
    // Create a set of all categories for easy lookup
    const playlistCategories = new Set(allCategoriesInPlaylist)

    // 1. ALWAYS add Company Introduction module first (COMPULSORY)
    if (videosByCategory["Company Introduction"] && videosByCategory["Company Introduction"].length > 0) {
      moduleArray.push({
        name: "Company Introduction",
        category: "Company Introduction",
        videos: videosByCategory["Company Introduction"],
      })
      addedCategories.add("Company Introduction")
      console.log("Added compulsory Company Introduction module")
    }

    // 2. Add ALL modules found in the playlist (dynamic from dashboard)
    allCategoriesInPlaylist.forEach((category) => {
      console.log(`🔍 Processing category from playlist: "${category}"`)
      
      const moduleVideos = videosByCategory[category]
      
      if (moduleVideos && moduleVideos.length > 0 && !addedCategories.has(category)) {
        // Use the category name as-is from the playlist
        let moduleName = category
        
        // Sort videos if it's a known module type
        let sortedModuleVideos = moduleVideos
        if (category.toLowerCase().includes('sales') || category.toLowerCase().includes('qa')) {
          sortedModuleVideos = sortVideosByOrder(moduleVideos, category)
        }
        
        moduleArray.push({
          name: moduleName,
          category: category,
          videos: sortedModuleVideos,
        })
        addedCategories.add(category)
        console.log(`✅ Added module from playlist: ${category} (${sortedModuleVideos.length} videos)`)
      } else if (moduleVideos && moduleVideos.length > 0) {
        console.log(`ℹ️ Module ${category} already added`)
      } else {
        console.log(`⚠️ No videos found for category: "${category}"`)
      }
    })

    // 5. ONLY add modules from playlist - NO other categories from previous selections
    // This ensures only the modules that are actually in the current playlist are shown
            // along with the compulsory modules (Company Introduction, Additional Features, AI tools)

    // 6. ALWAYS add Additional Features module before AI tools (COMPULSORY)
    if (!addedCategories.has("Additional Features")) {
      moduleArray.push({
        name: "Additional Features",
        category: "Additional Features",
        videos: videosByCategory["Additional Features"] || [],
      })
      addedCategories.add("Additional Features")
      console.log("Added compulsory Additional Features module")
    }

    // 7. ALWAYS add AI tools module last (COMPULSORY)
    const aiToolsVideos = videosByCategory["AI tools"] || 
                         videosByCategory["AI Tools"] || 
                         videosByCategory["ai tools"] ||
                         videosByCategory["Artificial Intelligence"] ||
                         videosByCategory["artificial intelligence"] ||
                         []
    
    if (!addedCategories.has("AI tools")) {
      moduleArray.push({
        name: "AI tools",
        category: "AI tools",
        videos: aiToolsVideos,
      })
      addedCategories.add("AI tools")
      console.log("Added compulsory AI tools module")
    }
    
    if (aiToolsVideos.length > 0) {
      console.log("AI tools module created with", aiToolsVideos.length, "videos")
    } else {
      console.log("AI tools module created with 0 videos (compulsory module)")
    }

    setModules(moduleArray)

    // Unlock the first video of each module
    unlockFirstVideoOfEachModule(moduleArray)

    // Debug: Log all modules being created
    console.log("=== MODULES BEING CREATED ===")
    console.log("📋 ONLY showing: Compulsory modules + Modules from playlist")
    console.log("❌ NOT showing: Previous unfinished modules or other categories")
    console.log("🎯 All modules found in playlist:", allCategoriesInPlaylist);
    moduleArray.forEach((module, index) => {
      const isCompulsory = module.category === "Company Introduction" || 
                           module.category === "Additional Features" || 
                           module.category === "AI tools"
      const moduleType = isCompulsory ? "COMPULSORY" : "FROM PLAYLIST"
      console.log(`${index + 1}. ${module.name} (${module.category}) - ${module.videos.length} videos [${moduleType}]`)
    })
    console.log("=== END MODULES ===")

    // Set active module based on current video
    if (currentVideo) {
      const moduleIndex = moduleArray.findIndex((module) => module.videos.some((video) => video.id === currentVideo.id))

      if (moduleIndex !== -1) {
        setActiveModuleIndex(moduleIndex)
      }
    }
  }

  // Update the fetchPlaylist function to use the async organizeIntoModules
  const fetchPlaylist = async (id: string, initialVideoId?: string) => {
    try {
      setLoading(true)

      // Check if this is a special "all-videos" playlist from localStorage
      if (id === "custom-playlist") {
        const storedPlaylist = localStorage.getItem("currentPlaylist")
        if (storedPlaylist) {
          try {
            const playlistData = JSON.parse(storedPlaylist) as Playlist

            // Validate the playlist data
            if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
              throw new Error("Invalid playlist data: missing or empty videos array")
            }

            // Reorder videos according to module sequence
            const reorderedVideos = await reorderVideosByModuleSequence(playlistData.videos)
            const updatedPlaylistData: Playlist = {
              ...playlistData,
              videos: reorderedVideos
            }

            setPlaylist(updatedPlaylistData)

            // Debug: Log playlist data
            console.log("Playlist data:", updatedPlaylistData)
            console.log("Videos in playlist:", updatedPlaylistData.videos)

            // Organize videos into modules (now async)
            await organizeIntoModules(updatedPlaylistData.videos)

            // Initialize watch events
            await initializeWatchEvents(updatedPlaylistData, initialVideoId)
            return
          } catch (error) {
            console.error("Error parsing playlist from localStorage:", error)
            toast({
              title: "Error",
              description: "Invalid playlist data. Redirecting to dashboard.",
              variant: "destructive",
            })
            router.push("/dashboard")
            return
          }
        }
      }

      // Regular Firestore playlist fetch
      const docRef = doc(db, "playlists", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const playlistData = { id: docSnap.id, ...docSnap.data() } as Playlist

        // Validate the playlist data
        if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
          throw new Error("Invalid playlist data: missing or empty videos array")
        }

        // Reorder videos according to module sequence
        const reorderedVideos = await reorderVideosByModuleSequence(playlistData.videos)
        const updatedPlaylistData: Playlist = {
          ...playlistData,
          videos: reorderedVideos
        }

        setPlaylist(updatedPlaylistData)

        // Debug: Log playlist data
        console.log("Playlist data:", updatedPlaylistData)
        console.log("Videos in playlist:", updatedPlaylistData.videos)

        // Organize videos into modules (now async)
        await organizeIntoModules(updatedPlaylistData.videos)

        // Initialize watch events
        await initializeWatchEvents(updatedPlaylistData, initialVideoId)
      } else {
        toast({
          title: "Error",
          description: "Playlist not found",
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error fetching playlist:", error)
      toast({
        title: "Error",
        description: "Failed to load playlist",
        variant: "destructive",
      })
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const initializeWatchEvents = async (playlistData: Playlist, initialVideoId?: string) => {
    if (!user || !playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) return

    const watchEvents: Record<string, boolean | null> = {}

    // Initialize all videos as locked (null = locked)
    playlistData.videos.forEach((video) => {
      watchEvents[video.id] = null
    })
    
    // We'll unlock the first video of each module after modules are loaded
    // This function will be called again from organizeIntoModules

    try {
      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      // Mark watched videos as true; leave others as false (unlocked)
      if (watchedVideoIds.size > 0) {
        playlistData.videos.forEach((video) => {
          if (watchedVideoIds.has(video.id)) {
            watchEvents[video.id] = true
          }
        })
      }

      // Apply the computed watch events (all unlocked; watched are true)
      setVideoWatchEvents(watchEvents)
      
      // Debug: Log initial video states
      console.log("🔍 Initial Video States After Loading History:")
      playlistData.videos.forEach((video, index) => {
        const state = watchEvents[video.id]
        const status = state === null ? "🔒 LOCKED" : state === false ? "🔓 UNLOCKED" : "✅ COMPLETED"
        console.log(`${index + 1}. ${video.title}: ${status}`)
      })

      // Set current video based on initialVideoId or find the first unlocked/unwatched video
      if (initialVideoId) {
        const index = playlistData.videos.findIndex((v) => v.id === initialVideoId)
        if (index !== -1 && (watchEvents[initialVideoId] === true || watchEvents[initialVideoId] === false)) {
          setCurrentVideoIndex(index)
          setCurrentVideo(playlistData.videos[index])
        } else {
          findAndSetFirstPlayableVideo(playlistData.videos, watchEvents)
        }
      } else {
        findAndSetFirstPlayableVideo(playlistData.videos, watchEvents)
      }
    } catch (error) {
      console.error("Error initializing watch events:", error)
    }
  }

  const findAndSetFirstPlayableVideo = (videos: Video[], watchEvents: Record<string, boolean | null>) => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) return

    // First try to find an unlocked but unwatched video
    const unwatchedIndex = videos.findIndex((v) => watchEvents[v.id] === false)
    if (unwatchedIndex !== -1) {
      setCurrentVideoIndex(unwatchedIndex)
      setCurrentVideo(videos[unwatchedIndex])
      return
    }

    // If no unwatched videos, find the first watched video
    const watchedIndex = videos.findIndex((v) => watchEvents[v.id] === true)
    if (watchedIndex !== -1) {
      setCurrentVideoIndex(watchedIndex)
      setCurrentVideo(videos[watchedIndex])
      return
    }

    // If all videos are locked except the first one, start with the first one
    if (watchEvents[videos[0].id] === false) {
      setCurrentVideoIndex(0)
      setCurrentVideo(videos[0])
    }
  }

  const handleVideoPlay = () => {
    if (videoRef.current && currentVideo) {
      videoRef.current.play()
      setIsPlaying(true)

      // Record start time for analytics
      setWatchStartTime(Date.now() / 1000)

      // Only log play event if this is the first play in this session
      // or if the video was previously completed (rewatch)
      const isRewatch = videoWatchEvents[currentVideo.id] === true

      // Check if we've already logged a play event for this video in this session
      const sessionKey = `played_${currentVideo.id}`
      const alreadyPlayed = sessionStorage.getItem(sessionKey)

      if (!alreadyPlayed) {
        // Log play event to Firestore
        logVideoEvent("play", isRewatch)

        // Mark this video as played in this session
        sessionStorage.setItem(sessionKey, "true")
      }
    }
  }

  const handleVideoPause = () => {
    if (videoRef.current && currentVideo) {
      videoRef.current.pause()
      setIsPlaying(false)

      // Calculate watch duration for analytics
      if (watchStartTime) {
        const watchDuration = Date.now() / 1000 - watchStartTime

        // Log pause event to Firestore
        logVideoEvent("pause", false, watchDuration)

        // Reset watch start time
        setWatchStartTime(null)

        // Track video pause in Google Analytics
      }
    }
  }

  const handleVideoEnded = async () => {
    if (!currentVideo || !playlist || !playlist.videos || !Array.isArray(playlist.videos)) return;
  
    setIsPlaying(false);
  
    // Calculate final watch duration for analytics
    if (watchStartTime) {
      const watchDuration = Date.now() / 1000 - watchStartTime;
  
      // Mark current video as watched
      const updatedWatchEvents = { ...videoWatchEvents };
      updatedWatchEvents[currentVideo.id] = true;
      
      // Mark video as completed for scrubbing restrictions
      setIsVideoCompleted(true);
  
      // Unlock the next video in the same module if it exists and is currently locked
      const moduleIndex = modules.findIndex(module => 
        module.videos.some(v => v.id === currentVideo.id)
      )
      
      if (moduleIndex !== -1) {
        const module = modules[moduleIndex]
        const moduleVideoIndex = module.videos.findIndex(v => v.id === currentVideo.id)
        
        if (moduleVideoIndex !== -1 && moduleVideoIndex < module.videos.length - 1) {
          const nextModuleVideo = module.videos[moduleVideoIndex + 1]
          const nextVideoId = nextModuleVideo.id
          
          if (updatedWatchEvents[nextVideoId] === null) {
            updatedWatchEvents[nextVideoId] = false; // Unlock but not watched
            console.log(`🔓 Video completed! Unlocking next video in module "${module.name}": ${nextVideoId}`);
          } else {
            console.log(`ℹ️ Next video ${nextVideoId} in module "${module.name}" is already unlocked or watched`);
          }
        } else {
          console.log(`🎉 Congratulations! You've completed all videos in module "${module.name}"!`);
        }
      }
  
      setVideoWatchEvents(updatedWatchEvents);
  
      // Check if we've already logged a completion event for this video in this session
      const sessionKey = `completed_${currentVideo.id}`;
      const alreadyCompleted = sessionStorage.getItem(sessionKey);
  
      if (!alreadyCompleted) {
        // Log completion event to Firestore
        logVideoEvent("completion", false, watchDuration, true, 100);
  
        // Mark this video as completed in this session
        sessionStorage.setItem(sessionKey, "true");
        
        // Complete video in gamification system
        await completeVideo(currentVideo.id, watchDuration);
        
        // Show XP reward for video completion
        setXpRewardData({
          xpAmount: 50, // From XP_CONFIG.VIDEO_COMPLETION
          reason: "Video completion",
          type: 'video',
          videoTitle: currentVideo.title
        });
        setShowXPReward(true);
        
        // Check for module completion
        if (currentVideo.category) {
          const moduleCompletion = await checkModuleCompletion(currentVideo.id, currentVideo.category);
          if (moduleCompletion.completed && moduleCompletion.moduleName) {
            // Show module completion reward after a short delay
            setTimeout(() => {
              setXpRewardData({
                xpAmount: 500, // From XP_CONFIG.MODULE_COMPLETION
                reason: "Module completion",
                type: 'module',
                moduleName: moduleCompletion.moduleName
              });
              setShowXPReward(true);
            }, 2000); // Show module reward 2 seconds after video reward
          }
        }
        
        // Show quiz after video completion (always)
        // const quiz = generateQuizForVideo(currentVideo);
        // setCurrentQuiz(quiz);
        // setShowQuiz(true);
        // Close resume dialog if it's open when quiz starts
        // setShowResumeDialog(false);
      }
  
      // Reset watch start time
      setWatchStartTime(null);
  
      // Auto play next video if available
      if (currentVideoIndex + 1 < playlist.videos.length) {
        const nextIndex = currentVideoIndex + 1;
        const nextVideoId = playlist.videos[nextIndex].id;
  
        if (updatedWatchEvents[nextVideoId] !== null) {
          videoChangeRef.current = true;
          setCurrentVideoIndex(nextIndex);
          setCurrentVideo(playlist.videos[nextIndex]);
  
          // Clear session storage for the previous video to allow a fresh document
          // for the next video when it's watched
          sessionStorage.removeItem(`played_${currentVideo.id}`);
          sessionStorage.removeItem(`completed_${currentVideo.id}`);
          
          // Update URL without refreshing the page
          const newUrl = `/video-player?videoId=${nextVideoId}&playlistId=${playlist.id}`;
          window.history.pushState({}, "", newUrl);
  
          // Update active module if needed
          if (modules.length > 0) {
            const moduleIndex = modules.findIndex((module) =>
              module.videos.some((video) => video.id === playlist.videos[nextIndex].id)
            );
  
            if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
              setActiveModuleIndex(moduleIndex);
            }
          }
        } else {
          // Show feedback dialog when playlist is completed
          setFeedbackOpen(true);
        }
      } else {
        // Show feedback dialog when playlist is completed
        setFeedbackOpen(true);
      }
    }
  };
  
  

  const checkAndSetVideoWatched = async (videoId: string) => {
    if (!user || !playlist || !videoId) return

    try {
      // Query Firestore for watch history of the current video
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("videoId", "==", videoId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)

      if (!watchHistorySnapshot.empty) {
        // If the video has been watched, update its status
        const updatedWatchEvents = { ...videoWatchEvents }
        updatedWatchEvents[videoId] = true

        // Find the current video index in the playlist
        const currentIndex = playlist.videos.findIndex((v) => v.id === videoId)

              // Unlock the next video in the same module if it exists and is currently locked
      if (modules) {
        const moduleIndex = modules.findIndex(module => 
          module.videos.some(v => v.id === videoId)
        )
        
        if (moduleIndex !== -1) {
          const module = modules[moduleIndex]
          const moduleVideoIndex = module.videos.findIndex(v => v.id === videoId)
          
          if (moduleVideoIndex !== -1 && moduleVideoIndex < module.videos.length - 1) {
            const nextModuleVideo = module.videos[moduleVideoIndex + 1]
            const nextVideoId = nextModuleVideo.id
            
            if (updatedWatchEvents[nextVideoId] === null) {
              updatedWatchEvents[nextVideoId] = false // Unlock but not watched
              console.log(`🔓 From checkAndSetVideoWatched: Unlocked next video in module "${module.name}": ${nextVideoId}`);
            } else {
              console.log(`ℹ️ From checkAndSetVideoWatched: Next video ${nextVideoId} in module "${module.name}" is already unlocked or watched`);
            }
          } else {
            console.log(`🎉 From checkAndSetVideoWatched: Completed all videos in module "${module.name}"!`);
          }
        }
      }

        setVideoWatchEvents(updatedWatchEvents)
        
        // Mark video as completed for scrubbing restrictions
        setIsVideoCompleted(true);

        // Don't log rewatch event here - it will be logged on play if needed
      }
    } catch (error) {
      console.error("Error checking watch status:", error)
    }
  }

  // Fetch watch history for all videos
  const fetchWatchHistory = async () => {
    if (!user || !playlist || !playlist.videos || !Array.isArray(playlist.videos)) return;
  
    try {
      // Query Firestore for all video watch events by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid)
      );
  
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
      
      if (watchHistorySnapshot.empty) return;
      
      // Create a map of videoId to completion status
      const videoCompletionMap: { [videoId: string]: boolean } = {};
      watchHistorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        videoCompletionMap[data.videoId] = data.completed || data.progress >= 100;
      });
  
      // Create a new watch events object
      const updatedWatchEvents = { ...videoWatchEvents };
  
      // Mark all watched videos
      playlist.videos.forEach((video) => {
        if (videoCompletionMap[video.id]) {
          updatedWatchEvents[video.id] = true;
        }
      });
  
      // Unlock videos after watched ones within each module
      if (modules && modules.length > 0) {
        modules.forEach((module) => {
          let lastUnlockedIndex = 0;
          
          for (let i = 0; i < module.videos.length; i++) {
            const videoId = module.videos[i].id;
            
            // If this video is watched, update lastUnlockedIndex
            if (updatedWatchEvents[videoId] === true) {
              lastUnlockedIndex = i + 1;
            }
            
            // Unlock videos up to lastUnlockedIndex within this module (only if they were previously locked)
            if (i <= lastUnlockedIndex && updatedWatchEvents[videoId] === null) {
              updatedWatchEvents[videoId] = false; // Unlocked but not watched
            }
          }
        });
      }
  
      // Update state
      setVideoWatchEvents(updatedWatchEvents);
    } catch (error) {
      console.error("Error fetching watch history:", error);
    }
  };
  
 

  const fetchVideoFeedbacks = async (videoId: string) => {
    if (!user || !videoId) return

    try {
      const feedbackQuery = query(
        collection(db, "videoFeedbacks"),
        where("videoId", "==", videoId),
        orderBy("createdAt", "desc"),
      )

      const feedbackSnapshot = await getDocs(feedbackQuery)
      const feedbacks = feedbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))

      setVideoFeedbacks(feedbacks)
    } catch (error) {
      console.error("Error fetching video feedbacks:", error)
    }
  }

  // Add this to the useEffect that runs when playlist is loaded
  useEffect(() => {
    if (playlist && user) {
      fetchWatchHistory()
    }
  }, [playlist, user])

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      fetchVideoFeedbacks(currentVideo.id)
    }
  }, [currentVideo])

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentVideo) {
      const current = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;
  
      // Update progress state
      setCurrentTime(current);
      setDuration(videoDuration);
      const currentProgressPercentage = Math.floor((current / videoDuration) * 100);
      setProgress(currentProgressPercentage);
  
      // Save progress every 2 seconds instead of 5
      if (current % 2 < 0.1) { // Save roughly every 2 seconds
        saveVideoProgress(current);
      }
  
      // Update video progress for this specific video
      setVideoProgress((prev) => ({
        ...prev,
        [currentVideo.id]: currentProgressPercentage,
      }));
  
      // Track progress milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      const currentMilestone = Math.floor(currentProgressPercentage / 25) * 25;
  
      if (
        milestones.includes(currentMilestone) &&
        (!videoProgressMilestones[currentVideo.id] ||
          !videoProgressMilestones[currentVideo.id].includes(currentMilestone))
      ) {
        // Update tracked milestones
        setVideoProgressMilestones((prev) => {
          const updatedMilestones = { ...prev };
          if (!updatedMilestones[currentVideo.id]) {
            updatedMilestones[currentVideo.id] = [];
          }
          updatedMilestones[currentVideo.id] = [...updatedMilestones[currentVideo.id], currentMilestone];
          return updatedMilestones;
        });
  
        // Check if we've already logged this milestone in this session
        const sessionKey = `milestone_${currentVideo.id}_${currentMilestone}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);
  
        if (!alreadyTracked) {
          // Log milestone event with a valid progressPercentage
          logVideoEvent("milestone", false, current, currentMilestone === 100, currentMilestone);
  
          // Mark this milestone as tracked in this session
          sessionStorage.setItem(sessionKey, "true");
          
          // If this is 100% completion, create a new document for the next watch
          if (currentMilestone === 100) {
            sessionStorage.removeItem(`completed_${currentVideo.id}`);
          }
        }
      }
    }
  };
  
  const logVideoEvent = async (
    eventType: string,
    isRewatch: boolean,
    watchDuration?: number,
    completed?: boolean,
    progressPercentage?: number,
  ) => {
    if (!currentVideo || !user || !playlist) return;
  
    try {
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", currentVideo.id)
      );
      const querySnapshot = await getDocs(q);
      const docExists = !querySnapshot.empty;
  
      // Always update these fields
      const eventData: any = {
        lastWatchedAt: serverTimestamp(),
        eventType,
        videoTitle: currentVideo.title || "Unknown Video",
        category: currentVideo.category || "Uncategorized",
        tags: currentVideo.tags || [],
      };
  
      // Handle watch duration - accumulate if document exists
      if (watchDuration) {
        eventData.watchDuration = watchDuration + (docExists ? (querySnapshot.docs[0].data().watchDuration || 0) : 0);
      }
  
      // Handle progress - only update if it's higher than existing
      if (progressPercentage !== undefined) {
        eventData.progress = Math.max(
          progressPercentage,
          docExists ? (querySnapshot.docs[0].data().progress || 0) : 0
        );
      }
  
      // Handle completion
      if (completed) {
        eventData.completed = true;
        eventData.progress = 100;
        // DO NOT set endTime here for updates!
      }
  
      // Handle milestones - add new ones without duplicating
      if (progressPercentage !== undefined && progressPercentage % 25 === 0) {
        const currentMilestones = docExists ? (querySnapshot.docs[0].data().milestones || []) : [];
        if (!currentMilestones.includes(progressPercentage)) {
          eventData.milestones = [...currentMilestones, progressPercentage];
        }
      }
  
      if (docExists) {
        const docRef = doc(db, "videoWatchEvents", querySnapshot.docs[0].id);
        // Only set endTime if it was not set before and this is the first completion
        if (completed && !querySnapshot.docs[0].data().endTime) {
          eventData.endTime = serverTimestamp();
        }
        await updateDoc(docRef, eventData);
        console.log(`Updated existing document for video ${currentVideo.id}, event type: ${eventType}`);
      } else {
        // Only set startTime, endTime, and other initial fields on creation
        const newDocData = {
          videoId: currentVideo.id,
          userId: user.uid,
          userEmail: user.email || "Unknown User",
          playlistId: playlist.id,
          progress: progressPercentage || 0,
          completed: completed || false,
          isRewatch: isRewatch,
          milestones: progressPercentage && progressPercentage % 25 === 0 ? [progressPercentage] : [],
          startTime: serverTimestamp(), // Only set on creation
          endTime: completed ? serverTimestamp() : null, // Only set on creation if completed
          firstWatchedAt: serverTimestamp(), // Only set on creation
          watchDuration: watchDuration || 0,
          ...eventData
        };
        await addDoc(watchEventsRef, newDocData);
        console.log(`Created new document for video ${currentVideo.id}, event type: ${eventType}`);
      }
    } catch (error) {
      console.error("Error logging video event:", error);
    }
  };
  
  // Also update the saveVideoProgress function to avoid conflicts
  const saveVideoProgress = async (currentTime: number) => {
    if (!user || !currentVideo || !currentVideo.id) return;
  
    try {
      console.log('Saving video progress:', { currentTime, videoId: currentVideo.id });
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", currentVideo.id)
      );
      
      const querySnapshot = await getDocs(q);
      const docExists = !querySnapshot.empty;
      
      const progressData = {
        lastWatchedAt: serverTimestamp(),
        lastPosition: currentTime,
        progress: Math.max(
          Math.floor((currentTime / duration) * 100),
          docExists ? (querySnapshot.docs[0].data().progress || 0) : 0
        ),
        videoTitle: currentVideo.title,
        category: currentVideo.category,
        tags: currentVideo.tags
      };
  
      if (docExists) {
        // Update existing document - DO NOT touch startTime or endTime
        const docRef = doc(db, "videoWatchEvents", querySnapshot.docs[0].id);
        await updateDoc(docRef, progressData);
        console.log('Updated existing progress document');
      } else {
        // Create new document with all initial fields
        const newDocData = {
          videoId: currentVideo.id,
          userId: user.uid,
          userEmail: user.email || "Unknown User",
          playlistId: playlist?.id,
          completed: false,
          isRewatch: false,
          milestones: [],
          startTime: serverTimestamp(), // Only set on creation
          endTime: null,
          firstWatchedAt: serverTimestamp(), // Only set on creation
          watchDuration: 0,
          ...progressData
        };
        await addDoc(watchEventsRef, newDocData);
        console.log('Created new progress document');
      }
    } catch (error) {
      console.error("Error saving video progress:", error);
    }
  };
  
  

  const playNextVideo = () => {
    if (
      !playlist ||
      !playlist.videos ||
      !Array.isArray(playlist.videos) ||
      playlist.videos.length === 0 ||
      !currentVideo
    )
      return

    const nextIndex = currentVideoIndex + 1
    if (nextIndex < playlist.videos.length) {
      const nextVideo = playlist.videos[nextIndex]
      
      // Check if the next video is playable (unlocked)
      if (!isVideoPlayable(nextIndex)) {
        toast({
          title: "Video Locked",
          description: "Complete the current video to unlock the next one.",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      // Only allow moving to the next video if it's unlocked
      videoChangeRef.current = true
      setCurrentVideoIndex(nextIndex)
      setCurrentVideo(nextVideo)
      setProgress(0)
      setCurrentTime(0)

      // Update URL without refreshing the page
      const newUrl = `/video-player?videoId=${nextVideo.id}&playlistId=${playlist.id}`
      window.history.pushState({}, "", newUrl)

      // Update active module if needed
      if (modules.length > 0) {
        const moduleIndex = modules.findIndex((module) =>
          module.videos.some((video) => video.id === nextVideo.id),
        )

        if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
          setActiveModuleIndex(moduleIndex)
        }
      }
    }
  }

  const unlockNextVideoIfNeeded = (videoId: string) => {
    if (!playlist || !playlist.videos || !modules) return

    // Find which module this video belongs to
    const moduleIndex = modules.findIndex(module => 
      module.videos.some(v => v.id === videoId)
    )
    
    if (moduleIndex === -1) return
    
    const module = modules[moduleIndex]
    const moduleVideoIndex = module.videos.findIndex(v => v.id === videoId)
    
    // Check if there's a next video in the same module
    if (moduleVideoIndex === -1 || moduleVideoIndex >= module.videos.length - 1) return
    
    const nextModuleVideo = module.videos[moduleVideoIndex + 1]
    const nextVideoId = nextModuleVideo.id

    // Only update if the current video is watched and next video is locked
    if (videoWatchEvents[videoId] === true && videoWatchEvents[nextVideoId] === null) {
      const updatedWatchEvents = { ...videoWatchEvents }
      updatedWatchEvents[nextVideoId] = false // Unlock but not watched
      setVideoWatchEvents(updatedWatchEvents)
      console.log(`🔓 Unlocked next video in module "${module.name}": ${nextVideoId}`)
    }
  }

  // Debug function to show current video states
  const debugVideoStates = () => {
    if (!playlist || !playlist.videos) return
    
    console.log("🔍 Current Video States:")
    playlist.videos.forEach((video, index) => {
      const state = videoWatchEvents[video.id]
      const status = state === null ? "🔒 LOCKED" : state === false ? "🔓 UNLOCKED" : "✅ COMPLETED"
      console.log(`${index + 1}. ${video.title}: ${status}`)
    })
  }

  // Helper function to check if there's a previous video in the current module
  const hasPreviousVideoInModule = () => {
    if (!currentVideo || !modules) return false
    
    const currentModuleIndex = modules.findIndex(module => 
      module.videos.some(v => v.id === currentVideo.id)
    )
    
    if (currentModuleIndex === -1) return false
    
    const currentModule = modules[currentModuleIndex]
    const currentModuleVideoIndex = currentModule.videos.findIndex(v => v.id === currentVideo.id)
    
    return currentModuleVideoIndex > 0
  }

  // Helper function to check if there's a next video in the current module
  const hasNextVideoInModule = () => {
    if (!currentVideo || !modules) return false
    
    const currentModuleIndex = modules.findIndex(module => 
      module.videos.some(v => v.id === currentVideo.id)
    )
    
    if (currentModuleIndex === -1) return false
    
    const currentModule = modules[currentModuleIndex]
    const currentModuleVideoIndex = currentModule.videos.findIndex(v => v.id === currentVideo.id)
    
    return currentModuleVideoIndex < currentModule.videos.length - 1
  }

  const playPreviousVideo = () => {
    if (!playlist || !playlist.videos || !Array.isArray(playlist.videos) || !currentVideo || !modules) return

    // Find which module the current video belongs to
    const currentModuleIndex = modules.findIndex(module => 
      module.videos.some(v => v.id === currentVideo.id)
    )
    
    if (currentModuleIndex === -1) return
    
    const currentModule = modules[currentModuleIndex]
    const currentModuleVideoIndex = currentModule.videos.findIndex(v => v.id === currentVideo.id)
    
    // Check if there's a previous video in the same module
    if (currentModuleVideoIndex > 0) {
      const prevModuleVideo = currentModule.videos[currentModuleVideoIndex - 1]
      const prevVideoId = prevModuleVideo.id
      
      // Find the playlist index for the previous video
      const prevPlaylistIndex = playlist.videos.findIndex(v => v.id === prevVideoId)
      
      if (prevPlaylistIndex !== -1) {
        // Navigate to the previous video in the same module
        videoChangeRef.current = true
        setCurrentVideoIndex(prevPlaylistIndex)
        setCurrentVideo(playlist.videos[prevPlaylistIndex])
        setProgress(0)
        setCurrentTime(0)

        // Update URL without refreshing the page
        const newUrl = `/video-player?videoId=${prevVideoId}&playlistId=${playlist.id}`
        window.history.pushState({}, "", newUrl)

        // Keep the same active module
        setActiveModuleIndex(currentModuleIndex)
        
        console.log(`🔙 Navigated to previous video in module "${currentModule.name}": ${prevVideoId}`)
      }
    } else {
      // This is the first video in the module, show message
      console.log(`ℹ️ Already at first video in module "${currentModule.name}"`)
      toast({
        title: "First Video in Module",
        description: `You're already at the first video in the ${currentModule.name} module.`,
        variant: "default",
        duration: 3000,
      })
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted
      videoRef.current.muted = newMuted
      setIsMuted(newMuted)
      // If unmuting and volume is 0, set to a default value (e.g., 20)
      if (!newMuted && volume === 0) {
        setVolume(20)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !user || !playlist) return

    setSubmittingFeedback(true)
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userEmail: user.email || "Unknown User",
        feedback,
        playlistId: playlist.id,
        createdAt: serverTimestamp(),
      })

      setSubmittingFeedback(false)
      setFeedback("")
      setFeedbackOpen(false)

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      })
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmittingFeedback(false)

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitVideoFeedback = async () => {
    if (!videoFeedback.trim() || !user || !currentVideo) return

    setSubmittingVideoFeedback(true)
    try {
      // Save video feedback to Firestore
      await addDoc(collection(db, "videoFeedbacks"), {
        userId: user.uid,
        userEmail: user.email || "Unknown User",
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        rating: videoRating,
        feedback: videoFeedback,
        createdAt: serverTimestamp(),
      })

      setSubmittingVideoFeedback(false)
      setVideoFeedback("")
      setVideoRating(null)
      setVideoFeedbackOpen(false)

      // Refresh feedbacks
      fetchVideoFeedbacks(currentVideo.id)

      toast({
        title: "Thank you!",
        description: "Your feedback for this video has been submitted successfully.",
      })
    } catch (error) {
      console.error("Error submitting video feedback:", error)
      setSubmittingVideoFeedback(false)

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) && !Number.isNaN(seconds) ? seconds : 0
    const mins = Math.floor(safeSeconds / 60)
    const secs = Math.floor(safeSeconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration
      if (Number.isFinite(dur) && !Number.isNaN(dur)) {
        setDuration(dur)
      } else {
        setDuration(0)
      }
      // Ensure current time display starts at 0
      setCurrentTime(videoRef.current.currentTime || 0)
    }
  }

  const isVideoPlayable = (index: number) => {
    if (
      !playlist ||
      !playlist.videos ||
      !Array.isArray(playlist.videos) ||
      index < 0 ||
      index >= playlist.videos.length
    ) {
      return false
    }

    const video = playlist.videos[index]
    
    // Find which module this video belongs to
    const moduleIndex = modules.findIndex(module => 
      module.videos.some(v => v.id === video.id)
    )
    
    if (moduleIndex === -1) return false
    
    const module = modules[moduleIndex]
    const moduleVideoIndex = module.videos.findIndex(v => v.id === video.id)
    
    // First video of each module is always unlocked
    if (moduleVideoIndex === 0) {
      return true
    }
    
    // For subsequent videos within the same module, check if the previous video has been completed
    const previousModuleVideo = module.videos[moduleVideoIndex - 1]
    const previousVideoId = previousModuleVideo.id
    
    // Video is playable only if the previous video in the same module has been completed
    return videoWatchEvents[previousVideoId] === true
  }

  const generateQuizForVideo = (video: Video) => {
    // Generate quiz questions based on video category and title
    const category = video.category?.toLowerCase() || 'general'
    const title = video.title.toLowerCase()
    
    let questions = []
    
    // Question 1: Main topic (always included)
    questions.push({
      id: '1',
      question: `What is the main topic covered in "${video.title}"?`,
      options: [
        'Sales order processing',
        'Inventory management', 
        'Financial reporting',
        'User management'
      ],
      correctAnswer: category.includes('sales') ? 0 : 
                    category.includes('inventory') ? 1 : 
                    category.includes('finance') ? 2 : 3,
      explanation: `This video focuses on ${category} and related workflows.`
    })
    
    // Question 2: Module identification
    questions.push({
      id: '2',
      question: 'Which module does this video belong to?',
      options: [
        'Processing',
        'Inventory',
        'Sales',
        'Finance'
      ],
      correctAnswer: category.includes('sales') ? 2 : 
                    category.includes('inventory') ? 1 : 
                    category.includes('finance') ? 3 : 0,
      explanation: `This video is part of the ${category.charAt(0).toUpperCase() + category.slice(1)} module.`
    })
    
    // Question 3: Specific content (based on title keywords)
    if (title.includes('introduction') || title.includes('overview')) {
      questions.push({
        id: '3',
        question: 'What type of content is this video?',
        options: [
          'Advanced tutorial',
          'Introduction/Overview',
          'Troubleshooting guide',
          'Configuration setup'
        ],
        correctAnswer: 1,
        explanation: 'This is an introductory video that provides an overview of the topic.'
      })
    } else if (title.includes('benefit') || title.includes('advantage')) {
      questions.push({
        id: '3',
        question: 'What does this video primarily discuss?',
        options: [
          'Technical implementation',
          'Benefits and advantages',
          'Common problems',
          'User interface'
        ],
        correctAnswer: 1,
        explanation: 'This video focuses on the benefits and advantages of the system.'
      })
    } else {
      questions.push({
        id: '3',
        question: 'What is the primary purpose of this video?',
        options: [
          'To demonstrate features',
          'To explain concepts',
          'To show benefits',
          'To provide training'
        ],
        correctAnswer: 1,
        explanation: 'This video explains key concepts and how they work.'
      })
    }
    
    return {
      id: `quiz_${video.id}`,
      videoId: video.id,
      title: `Quiz: ${video.title}`,
      questions,
      xpReward: 75, // Increased XP reward
      requiredScore: 60
    }
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const playVideoFromModule = (moduleIndex: number, videoIndex: number) => {
    if (
      !playlist ||
      !modules ||
      moduleIndex < 0 ||
      moduleIndex >= modules.length ||
      videoIndex < 0 ||
      videoIndex >= modules[moduleIndex].videos.length
    )
      return

    const video = modules[moduleIndex].videos[videoIndex]
    const playlistIndex = playlist.videos.findIndex((v) => v.id === video.id)

    if (playlistIndex === -1) return

    // Check if video is playable before allowing navigation
    if (!isVideoPlayable(playlistIndex)) {
      toast({
        title: "Video Locked",
        description: "Complete the previous video in this module to unlock this one.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Only allow playing unlocked videos
    videoChangeRef.current = true
    setCurrentVideoIndex(playlistIndex)
    setCurrentVideo(playlist.videos[playlistIndex])
    setProgress(0)
    setCurrentTime(0)
    setActiveModuleIndex(moduleIndex)

    // Update URL without refreshing the page
    const newUrl = `/video-player?videoId=${video.id}&playlistId=${playlist.id}`
    window.history.pushState({}, "", newUrl)

    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const playVideoFromPlaylist = (playlistIndex: number) => {
    if (
      !playlist ||
      playlistIndex < 0 ||
      playlistIndex >= playlist.videos.length
    )
      return

    const video = playlist.videos[playlistIndex]
    
    // Check if video is playable
    if (!isVideoPlayable(playlistIndex)) {
      toast({
        title: "Video Locked",
        description: "Complete the previous video to unlock this one.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Change to the selected video
    videoChangeRef.current = true
    setCurrentVideoIndex(playlistIndex)
    setCurrentVideo(video)
    setProgress(0)
    setCurrentTime(0)

    // Update URL without refreshing the page
    const newUrl = `/video-player?videoId=${video.id}&playlistId=${playlist.id}`
    window.history.pushState({}, "", newUrl)

    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Function to handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  // Add this function to clear session tracking when changing videos
  const clearVideoSessionTracking = (videoId: string) => {
    // Clear all session storage keys related to the previous video
    const keysToRemove = [
      `played_${videoId}`,
      `completed_${videoId}`,
      `milestone_${videoId}_25`,
      `milestone_${videoId}_50`,
      `milestone_${videoId}_75`,
    ]

    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  }

  // Hide the slider when clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;
    function handleClick(e: MouseEvent) {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showVolumeSlider]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!playlist || !currentVideo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested video or playlist could not be found.</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl -z-10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-3xl -z-10" />
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard">
          <img src="/Black logo.png" alt="EOXS Logo" className="h-8 w-auto" />
        </Link>
          <div className="flex items-center gap-4">

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Log out</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mt-4 mb-2">
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Suspension warning intentionally hidden on video player page */}

             <main className="flex-1 py-8 px-4">
         <div className="space-y-6 w-full">
          {/* Video Player */}
          <div className="space-y-6">
            <Card className="overflow-hidden max-w-5xl mx-auto rounded-xl shadow-lg border">
              <CardContent className="p-0">
                <div
                  ref={playerContainerRef}
                  className="relative aspect-video bg-black max-h-[500px] lg:max-h-[600px]"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    src={currentVideo.videoUrl}
                    poster={currentVideo.thumbnail || "/placeholder.svg?height=360&width=640"}
                    className="w-full h-full cursor-pointer"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onClick={() => (isPlaying ? handleVideoPause() : handleVideoPlay())}
                    onError={(e) => {
                      console.error("Video loading error:", e)
                      toast({
                        title: "Video Error",
                        description: "There was an error loading the video. Please try again later.",
                        variant: "destructive",
                      })
                    }}
                    playsInline
                    controlsList="nodownload"
                  />

                  {/* Centered Playback Controls - Only Visible on Hover */}
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                    {/* Subtle background overlay for better visibility */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/20 pointer-events-none transition-opacity duration-300" />
                    )}
                                          <div className="flex items-center gap-16 pointer-events-auto relative z-10">
                      {/* Rewind 5 Seconds Button */}
                      <div
                        role="button"
                        tabIndex={0}
                        className="text-white hover:bg-white/20 p-3 rounded-full cursor-pointer bg-black/40 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        onClick={handleRewind5Seconds}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleRewind5Seconds();
                          }
                        }}
                      >
                        <img src="/rewind-double-arrow.png" alt="Rewind 5s" width="24" height="24" style={{ display: 'inline', verticalAlign: 'middle' }} />
                        <span className="ml-1 text-sm text-white font-medium">5s</span>
                      </div>

                      {/* Play/Pause Button */}
                      <div
                        role="button"
                        tabIndex={0}
                        className="text-white hover:bg-white/20 p-4 rounded-full cursor-pointer bg-black/40 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            isPlaying ? handleVideoPause() : handleVideoPlay();
                          }
                        }}
                      >
                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                      </div>

                      {/* Forward 5 Seconds Button */}
                      <div
                        role="button"
                        tabIndex={0}
                        className={`p-3 rounded-full cursor-pointer bg-black/40 backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                          (() => {
                            // Check if this is a rewatch (video has been completed before)
                            const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                            return isRewatch 
                              ? "text-white hover:bg-white/20 hover:scale-110" 
                              : "text-white/50 cursor-not-allowed"
                          })()
                        }`}
                        onClick={(() => {
                          // Check if this is a rewatch (video has been completed before)
                          const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                          return isRewatch ? handleForward5Seconds : undefined
                        })()}
                        onKeyDown={(e) => {
                          const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                          if (e.key === 'Enter' || e.key === ' ' && isRewatch) {
                            handleForward5Seconds();
                          }
                        }}
                        title={(() => {
                          const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                          return isRewatch ? "Forward 5 seconds" : "Complete the video to enable forward seeking"
                        })()}
                      >
                        <img src="/rewind-double-arrow.png" alt="Forward 5s" width="24" height="24" style={{ display: 'inline', verticalAlign: 'middle', transform: 'scaleX(-1)' }} />
                        <span className="ml-1 text-sm text-white font-medium">5s</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Controls */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${!isHovered ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}
                  >
                    {/* Scrubbing Status Indicator (5s, once per video) */}
                    {(() => {
                      // Check if this is a rewatch (video has been completed before)
                      const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                      
                      if (showForwardRestrictionBanner && !isRewatch) {
                        return (
                          <div className="text-xs text-white/70 mb-2 text-center">
                            ⚠️ Forward seeking disabled until video completion
                          </div>
                        )
                      }
                      return null
                    })()}
                    
                    {/* Progress Bar */}
                    <div 
                      className="w-full h-1 bg-white/30 mb-4 rounded-full overflow-hidden cursor-pointer relative"
                      onClick={handleProgressBarClick}
                      title={(() => {
                        // Check if this is a rewatch (video has been completed before)
                        const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                        return isRewatch ? "Click to seek to position" : "Complete the video to enable seeking"
                      })()}
                    >
                      <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                      {(() => {
                        // Check if this is a rewatch (video has been completed before)
                        const isRewatch = currentVideo && videoWatchEvents[currentVideo.id] === true;
                        return !isRewatch && (
                          <div className="absolute inset-0 bg-black/20 rounded-full" />
                        )
                      })()}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">

                        {/* Play/Pause Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              isPlaying ? handleVideoPause() : handleVideoPlay();
                            }
                          }}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </div>

                        {/* Volume Control */}
                        <div className="relative flex items-center">
                          <div
                            role="button"
                            tabIndex={0}
                            className="focus:outline-none cursor-pointer"
                            onClick={() => setShowVolumeSlider((v) => !v)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setShowVolumeSlider((v) => !v);
                              }
                            }}
                          >
                            {volume === 0 ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                          </div>
                          {showVolumeSlider && (
                            <div
                              ref={volumeSliderRef}
                              className="absolute left-1/2 -translate-x-1/2 bottom-12 z-50 bg-black/60 px-2 py-1 rounded flex items-center shadow-lg"
                              style={{ minWidth: 90, maxWidth: 120 }}
                            >
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={e => {
                                  const newVolume = Number(e.target.value)
                                  setVolume(newVolume)
                                  if (newVolume > 0) setIsMuted(false)
                                  else setIsMuted(true)
                                }}
                                className="w-16 accent-primary h-1"
                                style={{ verticalAlign: 'middle', marginRight: 4 }}
                              />
                              <span className="text-xs text-white opacity-70" style={{ minWidth: 16, textAlign: 'right' }}>{volume}</span>
                            </div>
                          )}
                        </div>



                        {/* Time Display */}
                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Playback Speed Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              role="button"
                              tabIndex={0}
                              className="text-white hover:bg-white/20 text-sm px-3 py-2 rounded cursor-pointer"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setSpeedMenuOpen((v) => !v);
                                }
                              }}
                            >
                              {playbackRate}x
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-16">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <DropdownMenuItem
                                key={rate}
                                className={playbackRate === rate ? "bg-muted" : ""}
                                onClick={() => handlePlaybackRateChange(rate)}
                              >
                                {rate}x
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Fullscreen Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={toggleFullscreen}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              toggleFullscreen();
                            }
                          }}
                        >
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Video Title - Flush-left under the video */}
            <div className="container mx-auto max-w-5xl mb-4 px-0">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{currentVideo.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentVideo.category && <Badge variant="outline">{currentVideo.category}</Badge>}
                {currentVideo.tags &&
                  currentVideo.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
              </div>
              
              {/* Video Progress Status - HIDDEN as requested */}
              {/* 
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border-l-4 border-l-primary">
                <div className="flex items-center gap-2 text-sm">
                  {videoWatchEvents[currentVideo.id] === true ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium">Video Completed ✓</span>
                      {(() => {
                        // Check if there's a next video in the same module
                        const moduleIndex = modules.findIndex(module => 
                          module.videos.some(v => v.id === currentVideo.id)
                        )
                        if (moduleIndex !== -1) {
                          const module = modules[moduleIndex]
                          const moduleVideoIndex = module.videos.findIndex(v => v.id === currentVideo.id)
                          if (moduleVideoIndex < module.videos.length - 1) {
                            return (
                              <span className="text-muted-foreground">
                                - Next video in {module.name} unlocked!
                              </span>
                            )
                          }
                        }
                        return null
                      })()}
                    </>
                  ) : videoWatchEvents[currentVideo.id] === false ? (
                    <>
                      <Play className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-700 font-medium">Video Available</span>
                      <span className="text-muted-foreground">
                        - Watch to unlock next video in this module
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-700 font-medium">Video Locked</span>
                      <span className="text-muted-foreground">
                        - Complete previous video in this module to unlock
                      </span>
                    </>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{module.name}</span> - Video {moduleVideoIndex + 1} of {totalVideosInModule} 
                  ({completedVideosInModule} completed)
                </div>
              </div>
              */}
            </div>

            {/* Top Navigation: Previous / Start from Beginning / Next */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 mb-4 max-w-5xl mx-auto">
              {/* Previous Video Button */}
              <div className="flex-1 flex justify-start">
                {(() => {
                  if (!currentVideo || !modules) return null
                  
                  // Find which module the current video belongs to
                  const currentModuleIndex = modules.findIndex(module => 
                    module.videos.some(v => v.id === currentVideo.id)
                  )
                  
                  if (currentModuleIndex === -1) return null
                  
                  const currentModule = modules[currentModuleIndex]
                  const currentModuleVideoIndex = currentModule.videos.findIndex(v => v.id === currentVideo.id)
                  const hasPreviousInModule = currentModuleVideoIndex > 0
                  
                  if (hasPreviousInModule) {
                    const prevModuleVideo = currentModule.videos[currentModuleVideoIndex - 1]
                    const prevPlaylistIndex = playlist.videos.findIndex(v => v.id === prevModuleVideo.id)
                    
                    return (
                      <Button 
                        variant="outline" 
                        onClick={playPreviousVideo}
                        className="flex items-center gap-2 hover:bg-muted transition-colors"
                        title="Go to previous video in this module"
                      >
                        <SkipBack className="h-4 w-4" />
                        <span className="text-sm font-medium">Previous</span>
                      </Button>
                    )
                  } else {
                    return (
                      <div className="text-sm text-muted-foreground opacity-50">
                        First Video in {currentModule.name}
                      </div>
                    )
                  }
                })()}
              </div>

              {/* Center: Start from Beginning Button */}
              <div className="flex-1 flex justify-center">
                <Button variant="ghost" onClick={handleStartFromBeginning} className="flex items-center gap-2 bg-white text-foreground border">
                  <RefreshCw className="h-4 w-4" />
                  Start from Beginning
                </Button>
              </div>

              {/* Next Video Button */}
              <div className="flex-1 flex justify-end">
                {playlist?.videos && 
                 Array.isArray(playlist.videos) && 
                 currentVideoIndex < playlist.videos.length - 1 ? (
                  (() => {
                    const nextIndex = currentVideoIndex + 1
                    const nextVideo = playlist.videos[nextIndex]
                    const isNextVideoPlayable = isVideoPlayable(nextIndex)
                    
                    return (
                      <Button 
                        variant="outline" 
                        onClick={playNextVideo}
                        disabled={!isNextVideoPlayable}
                        className={`flex items-center gap-2 transition-colors ${
                          isNextVideoPlayable 
                            ? "hover:bg-muted cursor-pointer" 
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        title={isNextVideoPlayable 
                          ? "Go to next video in this module" 
                          : "Complete current video to unlock next video"
                        }
                      >
                        <span className="text-sm font-medium">Next</span>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    )
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground opacity-50">
                    Last Video
                  </div>
                )}
              </div>
            </div>

            {/* Video Description Container - below the navigation */}
            {currentVideo.description && currentVideo.description.trim() !== "" && (
              <div className="mb-4 max-w-5xl mx-auto">
                <Card className="border-l-4 border-l-primary/60 bg-gradient-to-r from-primary/5 to-transparent rounded-lg shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed text-base">
                        {currentVideo.description}
                      </p>
                      {currentVideo.tags && currentVideo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {currentVideo.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Rating Button - stays below description */}
            <div className="flex items-center justify-center gap-4 mt-4 mb-4 max-w-5xl mx-auto">
              <Button variant="outline" onClick={() => setVideoFeedbackOpen(true)} className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Rate & Review This Video
              </Button>
              
              {/* Debug Button - Only visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <Button variant="outline" onClick={debugVideoStates} className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Debug Video States
                </Button>
              )}
            </div>

            {/* Next Videos Section - Moved below description */}
            <div className="mb-4 max-w-5xl mx-auto">
              <Card className="rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-4">
                    {(() => {
                      // Find which module the current video belongs to
                      const moduleIndex = modules.findIndex(module => 
                        module.videos.some(v => v.id === currentVideo.id)
                      )
                      if (moduleIndex !== -1) {
                        const module = modules[moduleIndex]
                        return `Next Videos in ${module.name}`
                      }
                      return `Next Videos in ${currentVideo.category || "Module"}`
                    })()}
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {(() => {
                      // Find which module the current video belongs to
                      const moduleIndex = modules.findIndex(module => 
                        module.videos.some(v => v.id === currentVideo.id)
                      )
                      
                      if (moduleIndex === -1) return null
                      
                      const currentModule = modules[moduleIndex]
                      const currentModuleVideoIndex = currentModule.videos.findIndex(v => v.id === currentVideo.id)
                      
                      // Only show videos from the current module, not from other modules
                      const nextVideosInModule = currentModule.videos.slice(currentModuleVideoIndex + 1, currentModuleVideoIndex + 6)
                      
                      return nextVideosInModule.map((video, index) => {
                        // Find the playlist index for this video
                        const playlistIndex = playlist.videos.findIndex(v => v.id === video.id)
                        const isWatched = videoWatchEvents[video.id] === true
                        const isPlayable = playlistIndex !== -1 ? isVideoPlayable(playlistIndex) : false
                        const isLocked = videoWatchEvents[video.id] === null
                        
                        return (
                          <div
                            key={video.id}
                            className={`flex items-start gap-3 p-2 rounded-md border transition-colors ${
                              isPlayable
                                ? "hover:bg-muted cursor-pointer border-transparent hover:border-primary/30"
                                : "opacity-50 cursor-not-allowed border-transparent"
                            }`}
                            onClick={() => {
                              if (isPlayable && playlistIndex !== -1) {
                                playVideoFromPlaylist(playlistIndex)
                              } else {
                                toast({
                                  title: "Video Locked",
                                  description: "Complete the previous video to unlock this one.",
                                  variant: "destructive",
                                  duration: 3000,
                                })
                              }
                            }}
                          >
                            <div className="relative w-20 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                              {video.thumbnail ? (
                                <Image
                                  src={video.thumbnail || "/placeholder.svg?height=40&width=40"}
                                  width={40}
                                  height={40}
                                  alt={video.title}
                                  className="object-cover w-full h-full"
                                  onError={() => {
                                    const imgElement = document.getElementById(
                                      `next-thumb-${video.id}`,
                                    ) as HTMLImageElement
                                    if (imgElement) {
                                      imgElement.src = "/placeholder.svg?height=40&width=40"
                                    }
                                  }}
                                  id={`next-thumb-${video.id}`}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Play className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              {/* Time overlay */}
                              <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                                {video.duration}
                              </div>
                              {isWatched && (
                                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                                  <CheckCircle className="h-3 w-3" />
                                </div>
                              )}
                              {isLocked && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{video.title}</p>
                              {isLocked && (
                                <p className="text-xs text-muted-foreground">🔒 Locked - Complete previous video to unlock</p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Feedbacks Section */}
            {showVideoFeedbacks && (
              <Card className="mb-6 max-w-5xl mx-auto rounded-lg shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Video Feedback</h2>
                  {videoFeedbacks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No feedback available for this video yet.</p>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      {videoFeedbacks.map((feedback) => (
                        <div key={feedback.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{feedback.userEmail || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">
                                {feedback.createdAt.toLocaleDateString()} {feedback.createdAt.toLocaleTimeString()}
                              </p>
                            </div>
                            {feedback.rating && (
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${i < feedback.rating ? "text-yellow-400" : "text-gray-300"}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                  </svg>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm">{feedback.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          </div>

        {/* Learning Modules Section - Moved to bottom */}
        <div className="mt-8 container mx-auto max-w-5xl">
            <Card className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Learning Modules</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={activeModuleIndex !== null ? `module-${activeModuleIndex}` : undefined}
                    className="w-full"
                  >
                                        {modules.map((module, moduleIndex) => (
                      <AccordionItem key={moduleIndex} value={`module-${moduleIndex}`}>
                              <AccordionTrigger className="hover:no-underline">
                                                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{module.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {module.videos.length} videos
                                </Badge>
                              </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pl-2">
                                  {module.videos.map((video, videoIndex) => {
                                    const playlistIndex = playlist.videos.findIndex((v) => v.id === video.id)
                                    const isCurrentVideo = currentVideo.id === video.id
                                    const isWatched = videoWatchEvents[video.id] === true
                                    const isPlayable = playlistIndex !== -1 ? isVideoPlayable(playlistIndex) : false
                                    const isLocked = videoWatchEvents[video.id] === null

                                    return (
                                      <div
                                        key={video.id}
                                        className={`flex items-start gap-3 p-2 rounded-md border transition-colors ${
                                          isCurrentVideo
                                            ? "bg-primary/10 border-primary/30"
                                            : isPlayable
                                              ? "hover:bg-muted cursor-pointer border-transparent hover:border-primary/30"
                                              : "opacity-50 cursor-not-allowed border-transparent"
                                        }`}
                                        onClick={() => {
                                          if (isPlayable && !isCurrentVideo) {
                                            playVideoFromModule(moduleIndex, videoIndex)
                                          } else if (!isPlayable) {
                                            toast({
                                              title: "Video Locked",
                                              description: "Complete the previous video in this module to unlock this one.",
                                              variant: "destructive",
                                              duration: 3000,
                                            })
                                          }
                                        }}
                                      >
                                        <div className="relative w-20 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                                          {video.thumbnail ? (
                                            <Image
                                              src={video.thumbnail || "/placeholder.svg?height=40&width=40"}
                                              width={40}
                                              height={40}
                                              alt={video.title}
                                              className="object-cover w-full h-full"
                                              onError={() => {
                                                // If image fails to load, replace with placeholder
                                                const imgElement = document.getElementById(
                                                  `thumb-${video.id}`,
                                                ) as HTMLImageElement
                                                if (imgElement) {
                                                  imgElement.src = "/placeholder.svg?height=40&width=40"
                                                }
                                              }}
                                              id={`thumb-${video.id}`}
                                            />
                                          ) : (
                                            <div className="flex items-center justify-center h-full">
                                              <Play className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                          )}
                                          {/* Time overlay */}
                                          <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                                            {video.duration}
                                          </div>
                                          {isWatched && (
                                            <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                                              <CheckCircle className="h-3 w-3" />
                                            </div>
                                          )}
                                          {isLocked && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                              <Lock className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {video.title}
                                  </p>
                                          {isLocked && (
                                            <p className="text-xs text-muted-foreground">🔒 Locked - Complete previous video to unlock</p>
                                          )}
                                        </div>

                                        {isCurrentVideo && (
                                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Play className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>
        </div>
      </main>

      {/* Video Info Dialog */}
      <Dialog open={videoInfoOpen} onOpenChange={setVideoInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentVideo.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {currentVideo.thumbnail && (
              <div className="rounded-md overflow-hidden">
                <Image
                  src={currentVideo.thumbnail || "/placeholder.svg"}
                  alt={currentVideo.title}
                  width={400}
                  height={225}
                  className="w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                <p>{currentVideo.duration}</p>
              </div>

              {currentVideo.category && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{currentVideo.category}</p>
                </div>
              )}

              {currentVideo.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm">{currentVideo.description}</p>
                </div>
              )}

              {currentVideo.tags && currentVideo.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {currentVideo.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="What did you think about the videos? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
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

      {/* Video Feedback Dialog */}
      <Dialog open={videoFeedbackOpen} onOpenChange={setVideoFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate & Review: {currentVideo?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" className="p-1" onClick={() => setVideoRating(rating)}>
                  <svg
                    className={`w-8 h-8 ${
                      videoRating !== null && rating <= videoRating ? "text-yellow-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </button>
              ))}
            </div>
            <Textarea
              placeholder="What did you think about this video? Any suggestions for improvement?"
              value={videoFeedback}
              onChange={(e) => setVideoFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVideoFeedback}
              disabled={!videoFeedback.trim() || videoRating === null || submittingVideoFeedback}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingVideoFeedback ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog /* && !showQuiz */} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md z-[60]">
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

      {/* Video Quiz */}
      {/* {currentQuiz && (
        <VideoQuiz
          quiz={currentQuiz}
          isOpen={false}
          onComplete={(score, totalQuestions) => {
            // setShowQuiz(false)
            // setCurrentQuiz(null)
          }}
          onSkip={() => {
            // setShowQuiz(false)
            // setCurrentQuiz(null)
          }}
        />
      )} */}

      {/* AI Interactive Guide */}
      <InteractiveGuide />

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
