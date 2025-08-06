"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, orderBy, query, where, doc, getDoc } from "firebase/firestore"

import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, LogOut, Clock, Play, CheckCircle, AlertTriangle, Trophy, Zap, Sparkles, Flame, Menu, X, User, List, Home, Info, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { auth, db } from "@/firebase"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"
import { useAuth } from "../context/AuthContext"
import { useGamification } from "../context/GamificationContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import GamifiedDashboard from "../components/GamifiedDashboard"
import InteractiveGuide from "../components/InteractiveGuide"

import ChallengeMode from "../components/ChallengeMode"

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
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

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
  Inventory: [
    "Inventory Module Overview",
    "Inventory for Plate and Sheet Products",
    "Material Traceability (Heat Numbers, Mill Certificates)",
    "Inventory Valuation (FIFO, Average & Actual Costing)",
    "Scrap Management",
    "Additional Cost",
  ],
  Purchase: [
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
  CRM: ["CRM Module Overview", "Sales Pipeline and Leads Pipeline"],
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
  QA: ["Mill Certs"],
}

const MODULE_ORDER = [
  "Sales",
  "Processing",
  "Inventory",
  "Purchase",
  "Finance and Accounting",
  "Shipping and Receiving",
  "CRM",
  "IT & Security",
  "Advanced Analytics & Reporting",
  "Master Data Management",
  "Toll Processing",
  "Contact Management",
  "QA",
]

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [modules, setModules] = useState<Module[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [showGamifiedDashboard, setShowGamifiedDashboard] = useState(true)
  const [showGuide, setShowGuide] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [showChallengeMode, setShowChallengeMode] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData } = useAuth()
  const { userProgress } = useGamification()

  const globalCheckboxRef = useRef<HTMLButtonElement>(null)
  const moduleCheckboxRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchVideos(currentUser.uid)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Check for suspension status
  useEffect(() => {
    console.log("Dashboard - userData:", userData)
    console.log("Dashboard - isSuspended:", userData?.isSuspended)
    console.log("Dashboard - manuallySuspended:", userData?.manuallySuspended)
    
    if (userData && (userData.isSuspended || userData.manuallySuspended)) {
      console.log("Dashboard - User is suspended, redirecting to /suspended")
      // User is suspended, redirect to suspension page
      router.push("/suspended")
    }
  }, [userData, router])

  useEffect(() => {
    if (user?.uid) {
      const fetchProfile = async () => {
        const q = query(collection(db, "users"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          // setProfile({
          //   name: data.name || '-',
          //   companyName: data.companyName || '-',
          // });
        }
      };
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    // Filter videos based on search query and company
    if (!searchQuery && !selectedCompany) {
      // Filter out General and Miscellaneous videos for dashboard display only
      const filteredForDisplay = videos.filter(
        (video) => video.category !== "Company Introduction" && video.category !== "Miscellaneous"
      )
      setFilteredVideos(filteredForDisplay)
      return
    }

    let filtered = videos

    // Apply company filter if selected
    if (selectedCompany) {
      filtered = filtered.filter(
        (video) => video.company === selectedCompany
      )
    }

    // Apply search query filter if entered
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(lowerCaseQuery) ||
          (video.tags && video.tags.some((tag) => tag.toLowerCase().includes(lowerCaseQuery))) ||
          (video.description && video.description.toLowerCase().includes(lowerCaseQuery))
      )
    }

    // Filter out General and Miscellaneous videos for dashboard display only
    const filteredForDisplay = filtered.filter(
      (video) => video.category !== "Company Introduction" && video.category !== "Miscellaneous"
    )

    setFilteredVideos(filteredForDisplay)
  }, [searchQuery, videos, selectedCompany])

  // Handle module parameter from URL
  useEffect(() => {
    const moduleParam = searchParams.get('module')
    if (moduleParam && modules.length > 0) {
      // Find the module that matches the parameter
      const targetModule = modules.find(module => 
        module.name.toLowerCase() === moduleParam.toLowerCase()
      )
      
      if (targetModule) {
        // Switch to classic view and expand the target module
        setShowGamifiedDashboard(false)
        setExpandedModules([targetModule.category])
        
        // Clear the URL parameter after handling it
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('module')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [searchParams, modules])

  // Handle switch to classic view event from GamifiedDashboard
  useEffect(() => {
    const handleSwitchToClassicView = () => {
      setShowGamifiedDashboard(false)
    }

    window.addEventListener('switchToClassicView', handleSwitchToClassicView)
    
    return () => {
      window.removeEventListener('switchToClassicView', handleSwitchToClassicView)
    }
  }, [])



  // Helper function to ensure valid URLs
  const getSafeUrl = (url: string | undefined): string => {
    if (!url) return "/placeholder.svg?height=180&width=320"
    try {
      // Test if it's a valid URL
      new URL(url)
      return url
    } catch (e) {
      return "/placeholder.svg?height=180&width=320"
    }
  }

  const fetchVideos = async (userId: string) => {
    try {
      setLoading(true)

      // Fetch ALL videos from Firestore with ordering by timestamp
      const videosCollection = collection(db, "videos")
      // Create a query with orderBy to sort by timestamp in ascending order
      const videosQuery = query(videosCollection, orderBy("createdAt", "asc"))
      const videoSnapshot = await getDocs(videosQuery)

      if (videoSnapshot.empty) {
        toast({
          title: "No Videos Found",
          description: "There are no videos available in the system.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Mock company data assignment - in a real app, this would come from your Firestore database
      const companyMapping: Record<string, string> = {
        "Sales": "eoxs",
        "Processing": "steel_inc", 
        "Inventory": "eoxs",
        "Purchase": "metal_works",
        "Finance and Accounting": "acme",
        "Shipping and Receiving": "metal_works",
        "CRM": "eoxs",
        "IT & Security": "acme",
        "Advanced Analytics & Reporting": "steel_inc",
        "Master Data Management": "acme",
        "Contact Management": "eoxs",
        "QA": "metal_works"
      }

      const videoList = videoSnapshot.docs.map((doc) => {
        const data = doc.data();
        const category = data.category || "Uncategorized";
        return {
          id: doc.id,
          ...data,
          thumbnail: getSafeUrl(
            data.publicId
              ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${data.publicId}.jpg`
              : undefined,
          ),
          description: data.description || "-",
          category: category,
          // Assign company based on category
          company: companyMapping[category] || "eoxs"
        };
      }) as unknown as Video[]

      // Fetch watch history to mark watched videos
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      // Mark watched videos
      const videosWithWatchStatus = videoList.map((video) => ({
        ...video,
        watched: watchedVideoIds.has(video.id),
      }))

      setVideos(videosWithWatchStatus)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching videos:", error)
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      })
    }
  }

  const organizeVideosIntoModules = useCallback(() => {
    // Group videos by category
    const videosByCategory = videos.reduce(
      (acc, video) => {
        // Exclude General and Miscellaneous categories
        if (video.category === "Company Introduction" || video.category === "AI tools"|| video.category === "Miscellaneous") {
          return acc
        }
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>,
    )

    const moduleArray: Module[] = []
    // Calculate total duration for each module
    const calculateTotalDuration = (videos: Video[]): string => {
      let totalMinutes = 0
      videos.forEach((video) => {
        // Extract minutes from duration string (e.g., "5 minutes" -> 5)
        const durationMatch = video.duration.match(/(\d+)/)
        if (durationMatch && durationMatch[1]) {
          totalMinutes += Number.parseInt(durationMatch[1], 10)
        }
      })
      return `${totalMinutes} mins`
    }

    // Add other categories as modules (except General and Miscellaneous)
    Object.entries(videosByCategory).forEach(([category, videos]) => {
      // Normalize category for lookup
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/gi, "")
      const normalizedCategory = normalize(category)
      // Find the VIDEO_ORDER key that matches the normalized category
      const videoOrderKey = Object.keys(VIDEO_ORDER).find((key) => normalize(key) === normalizedCategory)
      const orderArr = videoOrderKey ? VIDEO_ORDER[videoOrderKey] : undefined
      const sortedVideos = [...videos].sort((a, b) => {
        const orderA = orderArr?.indexOf(a.title) ?? Number.MAX_SAFE_INTEGER
        const orderB = orderArr?.indexOf(b.title) ?? Number.MAX_SAFE_INTEGER
        if (orderA !== Number.MAX_SAFE_INTEGER && orderB !== Number.MAX_SAFE_INTEGER) {
          return orderA - orderB
        }
        if (orderA !== Number.MAX_SAFE_INTEGER) return -1
        if (orderB !== Number.MAX_SAFE_INTEGER) return 1
        return a.title.localeCompare(b.title)
      })
      moduleArray.push({
        name: `${category} Module Overview`,
        category,
        totalDuration: calculateTotalDuration(sortedVideos),
        videos: sortedVideos,
      })
    })

    // Sort modules according to MODULE_ORDER
    moduleArray.sort((a, b) => {
      const indexA = MODULE_ORDER.findIndex(
        (name) => a.category.toLowerCase().replace(/[^a-z]/gi, "") === name.toLowerCase().replace(/[^a-z]/gi, ""),
      )
      const indexB = MODULE_ORDER.findIndex(
        (name) => b.category.toLowerCase().replace(/[^a-z]/gi, "") === name.toLowerCase().replace(/[^a-z]/gi, ""),
      )
      if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

    // Set all modules as collapsed by default
    setExpandedModules([])
    setModules(moduleArray)
  }, [videos])

  // Call organizeVideosIntoModules when videos change
  useEffect(() => {
    if (videos.length > 0) {
      organizeVideosIntoModules()
    }
  }, [videos, organizeVideosIntoModules])

  const handleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId)
      } else {
        return [...prev, videoId]
      }
    })
  }

  const handleWatchSelected = async () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video to watch.",
        variant: "destructive",
      })
      return
    }

    try {
      // Get the selected videos
      const selectedVideoObjects = videos.filter((video) => selectedVideos.includes(video.id))
      const generalVideos = videos.filter((video) => video.category === "Company Introduction")
      const miscVideos = videos.filter((video) => video.category === "Miscellaneous")
      const AiTool = videos.filter((video) => video.category === "AI tools")

      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser?.uid),
        where("completed", "==", true),
      )
      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      // Check if there's an existing playlist in localStorage
      const existingPlaylistStr = localStorage.getItem("currentPlaylist")
      const existingPlaylist = existingPlaylistStr ? JSON.parse(existingPlaylistStr) : null

      // Combine all video IDs (existing + new selection)
      const combinedVideoIds = new Set<string>()
      if (existingPlaylist) {
        existingPlaylist.videos.forEach((v: Video) => combinedVideoIds.add(v.id))
      }
      selectedVideoObjects.forEach((v) => combinedVideoIds.add(v.id))
      generalVideos.forEach((v) => combinedVideoIds.add(v.id))
      miscVideos.forEach((v) => combinedVideoIds.add(v.id))
      AiTool.forEach((v) => combinedVideoIds.add(v.id))

      // Helper to get canonical order of all videos
      const getOrderedVideos = () => {
        const ordered: Video[] = []
        // 1. General videos first (in their order)
        generalVideos.forEach((v) => {
          if (combinedVideoIds.has(v.id)) ordered.push(v)
        })
        // 2. By module order
        MODULE_ORDER.forEach((moduleName) => {
          const videoTitles = VIDEO_ORDER[moduleName]
          if (videoTitles) {
            videoTitles.forEach((title) => {
              const video = videos.find((v) => v.title === title && v.category === moduleName)
              if (video && combinedVideoIds.has(video.id) && !ordered.some((o) => o.id === video.id)) {
                ordered.push(video)
              }
            })
          }
          // Add any videos in this category not in VIDEO_ORDER
          videos
            .filter(
              (v) =>
                v.category === moduleName &&
                combinedVideoIds.has(v.id) &&
                (!videoTitles || !videoTitles.includes(v.title)),
            )
            .forEach((v) => {
              if (!ordered.some((o) => o.id === v.id)) ordered.push(v)
            })
        })
        // 3. Miscellaneous at the end
        miscVideos.forEach((v) => {
          if (combinedVideoIds.has(v.id) && !ordered.some((o) => o.id === v.id)) ordered.push(v)
        })
        // 4. AI tools at the end
        AiTool.forEach((v) => {
          if (combinedVideoIds.has(v.id) && !ordered.some((o) => o.id === v.id)) ordered.push(v)
        })
        return ordered
      }

      const allPlaylistVideos = getOrderedVideos()

      // Find the first unwatched video to start playback
      let firstVideoToPlay: string
      const firstUnwatchedGeneral = generalVideos.find((video) => !watchedVideoIds.has(video.id))
      if (firstUnwatchedGeneral) {
        firstVideoToPlay = firstUnwatchedGeneral.id
      } else {
        const firstUnwatchedVideo = allPlaylistVideos.find((video) => !watchedVideoIds.has(video.id))
        firstVideoToPlay = firstUnwatchedVideo ? firstUnwatchedVideo.id : allPlaylistVideos[0].id
      }

      // Update the playlist in localStorage
      const updatedPlaylist = {
        id: "custom-playlist",
        videos: allPlaylistVideos,
        createdAt: existingPlaylist?.createdAt || { seconds: Date.now() / 1000, nanoseconds: 0 },
      }
      localStorage.setItem("currentPlaylist", JSON.stringify(updatedPlaylist))

      // Update active playlist
      const activePlaylist = {
        id: "custom-playlist",
        title: "Custom Playlist",
        lastAccessed: new Date().toISOString(),
        completionPercentage: 0,
      }
      localStorage.setItem("activePlaylist", JSON.stringify(activePlaylist))

      // Navigate to the first unwatched video
      router.push(`/video-player?videoId=${firstVideoToPlay}&playlistId=custom-playlist`)
    } catch (error) {
      console.error("Error updating playlist:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    if (globalCheckboxRef.current) {
      // Set indeterminate on the underlying input if present
      const input = globalCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      if (input) {
        input.indeterminate =
          selectedVideos.length > 0 &&
          !modules.flatMap((module) => module.videos.map((v) => v.id)).every((id) => selectedVideos.includes(id))
      }
    }
    modules.forEach((module, i) => {
      const moduleVideoIds = module.videos.map((v) => v.id)
      const btn = moduleCheckboxRefs.current[i]
      if (btn) {
        const input = btn.querySelector('input[type="checkbox"]') as HTMLInputElement | null
        if (input) {
          input.indeterminate =
            moduleVideoIds.some((id) => selectedVideos.includes(id)) &&
            !moduleVideoIds.every((id) => selectedVideos.includes(id))
        }
      }
    })
  }, [selectedVideos, modules])

  // Restore selectedVideos from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selectedVideos");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSelectedVideos(parsed);
      } catch {}
    }
  }, []);

  // After videos are loaded, filter selectedVideos to only valid video IDs
  useEffect(() => {
    if (videos.length > 0 && selectedVideos.length > 0) {
      const validIds = videos.map(v => v.id);
      setSelectedVideos(prev => prev.filter(id => validIds.includes(id)));
    }
  }, [videos]);

  // Save selectedVideos to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedVideos", JSON.stringify(selectedVideos));
  }, [selectedVideos]);



  

  // Early return if user is suspended
  if (userData && (userData.isSuspended || userData.manuallySuspended)) {
    console.log("Dashboard - Early return: User is suspended")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Account Suspended</h1>
          <p className="text-gray-600 mb-4">Your account has been suspended. Redirecting...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  // If userData is not loaded yet, show loading
  if (!userData && !loading) {
    console.log("Dashboard - userData is null, showing loading")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center px-4">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <img 
              src="/light.webp" 
              alt="EOXS Logo" 
              className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => router.push("/")}
            />
          </div>
          <div className="flex items-center gap-4">
            {showGamifiedDashboard && userProgress && (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Level {userProgress.currentLevel}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50">
                    <Flame className="h-3 w-3 mr-1" />
                    {userProgress.currentStreak} day streak
                  </Badge>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{userProgress.totalXP} XP</span>
                </div>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowGamifiedDashboard(!showGamifiedDashboard)}
            >
              {showGamifiedDashboard ? 'Classic View' : 'Gamified View'}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* Sidebar Toggle Button */}
      <div className={`fixed top-20 z-50 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'left-64' : 'left-4'
      }`}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white shadow-md hover:bg-gray-50"
        >
          {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 border-r bg-card transition-all duration-300 ease-in-out">
          <div className="flex h-full w-full flex-col bg-green-600 text-white">
            <div className="flex flex-col gap-2 p-4">
              <Link href="/profile" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><User className="w-5 h-5" /><span>User Profile</span></a>
                </Button>
              </Link>
              <Link href="/playlist" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><List className="w-5 h-5" /><span>My Playlist</span></a>
                </Button>
              </Link>
              <Link href="/leaderboard" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><Trophy className="w-5 h-5" /><span>Leaderboard</span></a>
                </Button>
              </Link>
              <Link href="/about" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><Info className="w-5 h-5" /><span>About EOXSplore</span></a>
                </Button>
              </Link>
              <Link href="https://eoxs.com" target="_blank" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><Home className="w-5 h-5" /><span>About EOXS</span></a>
                </Button>
              </Link>
              <Link href="https://eoxs.com/contact" target="_blank" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-700">
                  <a><Phone className="w-5 h-5" /><span>Contact</span></a>
                </Button>
              </Link>
            </div>
            <Separator className="bg-green-800" />
          </div>
        </aside>
      )}
      
      {/* Main Content */}
      <main className={`pt-14 min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'md:ml-64' : 'md:ml-0'
      }`}>
        {/* Show Gamified Dashboard or Classic Dashboard */}
        {showGamifiedDashboard ? (
          <GamifiedDashboard />
        ) : (
          <>
            {/* Suspension Warning Banner */}
            {userData && userData.daysUntilSuspension > 0 && userData.daysUntilSuspension <= 7 && (
              <div className="max-w-5xl mx-auto p-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Account Suspension Warning:</strong> Your account will be suspended in {userData.daysUntilSuspension} day{userData.daysUntilSuspension !== 1 ? 's' : ''}. 
                    To prevent suspension, please contact <a href="mailto:isha@eoxsteam.com" className="underline font-medium">isha@eoxsteam.com</a>.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="max-w-5xl mx-auto pb-4 p-0">
          <div className="flex flex-col sm:flex-row justify-between gap-4 sticky top-0 z-20 bg-background pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search videos..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              onClick={handleWatchSelected}
              disabled={selectedVideos.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Selected ({selectedVideos.length})
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-md"></div>
                ))}
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No videos found matching your criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Global Select All Checkbox */}
                <div className="flex items-center mb-2">
                  <Checkbox
                    ref={globalCheckboxRef}
                    checked={
                      modules.length > 0 &&
                      modules
                        .flatMap((module) => module.videos.map((v) => v.id))
                        .every((id) => selectedVideos.includes(id))
                    }
                    onCheckedChange={() => {
                      const allVideoIds = modules.flatMap((module) => module.videos.map((v) => v.id))
                      if (selectedVideos.length === allVideoIds.length) {
                        setSelectedVideos([])
                      } else {
                        setSelectedVideos(allVideoIds)
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Select All Videos</span>
                </div>
                <Accordion type="multiple" value={expandedModules} onValueChange={setExpandedModules} className="w-full border rounded-md overflow-hidden">
                  {modules.map((module, moduleIndex) => (
                    <AccordionItem key={moduleIndex} value={module.category} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30 hover:bg-muted/50">
                        <div className="flex items-center justify-between w-full bg-muted rounded">
                          <div className="flex items-center">
                            {/* Module Select All Checkbox */}
                            <Checkbox
                              ref={(el) => {
                                moduleCheckboxRefs.current[moduleIndex] = el
                              }}
                              checked={module.videos.every((v) => selectedVideos.includes(v.id))}
                              onCheckedChange={() => {
                                const moduleVideoIds = module.videos.map((v) => v.id)
                                const allSelected = moduleVideoIds.every((id) => selectedVideos.includes(id))
                                if (allSelected) {
                                  setSelectedVideos(selectedVideos.filter((id) => !moduleVideoIds.includes(id)))
                                } else {
                                  setSelectedVideos([...new Set([...selectedVideos, ...moduleVideoIds])])
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="font-medium text-base">{module.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {module.totalDuration}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {module.videos.length} videos
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/20">
                              <tr>
                                <th className="w-6 px-4 py-2 text-left">
                                  <span className="sr-only">Select</span>
                                </th>
                                <th className="px-4 py-2 text-left font-medium">Feature</th>
                                {/* <th className="px-4 py-2 text-left font-medium">Description</th> */}
                                <th className="px-4 py-2 text-left font-medium w-32">Time Required</th>
                                <th className="px-4 py-2 text-left font-medium w-20">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {module.videos.map((video) => (
                                <tr key={video.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <Checkbox
                                      checked={selectedVideos.includes(video.id)}
                                      onCheckedChange={() => handleVideoSelection(video.id)}
                                    />
                                  </td>
                                  <td className="px-4 py-3 font-medium">{video.title}</td>
                                  {/* <td className="px-4 py-3 text-muted-foreground">{video.description}</td> */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                      {video.duration}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {video.watched ? (
                                      <div className="flex items-center text-green-600 dark:text-green-500">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        <span className="text-xs">Watched</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Unwatched</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>
      
      {/* Interactive Guide */}
      <InteractiveGuide 
        isVisible={showGuide} 
        onClose={() => setShowGuide(false)}
        onAction={(action) => {
          switch (action) {
            case 'start-learning':
              setShowGamifiedDashboard(false)
              break
            case 'watch-video':
              setShowGamifiedDashboard(false)
              break
            case 'earn-xp':
              setShowGamifiedDashboard(false)
              break
          }
        }}
      />



      {/* Challenge Mode */}
      <ChallengeMode 
        isVisible={showChallengeMode} 
        onClose={() => setShowChallengeMode(false)}
      />
      
      <footer className="border-t py-3">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EOXS. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
