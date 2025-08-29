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
import { Search, LogOut, Clock, Play, CheckCircle, AlertTriangle, Trophy, Zap, Sparkles, Flame, ArrowLeft, Menu, User, List, Home, Info, Phone, BookOpen, Target, TrendingUp, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { auth, db } from "@/firebase"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"
import { useAuth } from "../context/AuthContext"
import { useGamification } from "../context/GamificationContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import GamifiedDashboard from "../components/GamifiedDashboard"
import InteractiveGuide from "../components/InteractiveGuide"
import XPRewardPopup from "../components/XPRewardPopup"


import ChallengeMode from "../components/ChallengeMode"
import { getAllModuleVideoOrders } from "../firestore-utils"

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
  "Sales Module ": [
    "Sales Module Overview",
    "Sales Order for Coils",
    "Sales Order for Plates",
    "Sales Order for Tubing & Pipes",
    "Sales order for Structural Steel",
    "Sales Orders for Bars",
    "Handling Backorder and Partial Delivery",
    "How does Buyout work in the system",
  ],
  "QA Module": [
    "Mill Certs",
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
}

const MODULE_ORDER = [
  "Sales Module ",
  "Processing",
  "Inventory Management",
  "Purchase",
  "Finance and Accounting",
  "Shipping and Receiving",
  "CRM",
  "IT & Security",
  "Advanced Analytics & Reporting",
  "Master Data Management",
  "Contact Management",
  "QA Module",
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

  // Mobile-responsive sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Start closed by default
  const [isMobile, setIsMobile] = useState(false)

  const [showChallengeMode, setShowChallengeMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({})

  // XP Reward Popup states
  const [showXPReward, setShowXPReward] = useState(false)
  const [xpRewardData, setXpRewardData] = useState<{
    xpAmount: number
    reason: string
    type: 'video' | 'module' | 'achievement' | 'streak'
    videoTitle?: string
    moduleName?: string
  } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData } = useAuth()
  const { userProgress } = useGamification()
  // Dismissible suspension banner
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(true)

  const globalCheckboxRef = useRef<HTMLButtonElement>(null)
  const moduleCheckboxRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Detect mobile device and set sidebar state accordingly
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // On mobile, keep sidebar closed by default
      // On desktop, open sidebar by default
      if (mobile) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    // Check on mount
    checkMobile()

    // Listen for window resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchVideos(currentUser.uid)
        // Reset dismissal on fresh login session
        try {
          sessionStorage.removeItem(`dismiss_suspension_${currentUser.uid}`)
        } catch {}
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
    // Initialize dismissible banner visibility per session
    if (user) {
      try {
        const dismissed = sessionStorage.getItem(`dismiss_suspension_${user.uid}`) === 'true'
        setShowSuspensionWarning(!dismissed)
      } catch {
        setShowSuspensionWarning(true)
      }
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

  // Handle view parameter from URL (for switching to classic dashboard)
  useEffect(() => {
    const viewParam = searchParams.get('view')
    if (viewParam === 'classic') {
      console.log("Switching to classic dashboard view")
      setShowGamifiedDashboard(false)
      // Clear the view parameter from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('view')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Debug: Log current dashboard state
  useEffect(() => {
    console.log("🔍 Dashboard - showGamifiedDashboard:", showGamifiedDashboard)
    console.log("🔍 Dashboard - modules count:", modules.length)
    console.log("🔍 Dashboard - selectedVideos count:", selectedVideos.length)
  }, [showGamifiedDashboard, modules.length, selectedVideos.length])

  // Handle module parameter from URL
  useEffect(() => {
    const moduleParam = searchParams.get('module')
    if (moduleParam && modules.length > 0) {
      console.log(`Looking for module: "${moduleParam}"`)
      console.log(`Available modules:`, modules.map(m => ({ name: m.name, category: m.category })))
      
      // Find the module that matches the parameter
      let targetModule = modules.find(module => 
        module.name.toLowerCase() === moduleParam.toLowerCase()
      )
      
      // If exact match not found, try matching by category name
      if (!targetModule) {
        console.log(`No exact name match found, trying category match...`)
        targetModule = modules.find(module => 
          module.category.toLowerCase() === moduleParam.toLowerCase()
        )
      }
      
      // If still not found, try matching by partial name (e.g., "Sales" should match "Sales Module Overview")
      if (!targetModule) {
        console.log(`No category match found, trying partial match...`)
        targetModule = modules.find(module => 
          module.name.toLowerCase().includes(moduleParam.toLowerCase()) ||
          module.category.toLowerCase().includes(moduleParam.toLowerCase())
        )
      }
      
      if (targetModule) {
        console.log(`Found target module:`, targetModule)
        // Switch to classic view and expand the target module
        setShowGamifiedDashboard(false)
        setExpandedModules([targetModule.category])
        
        // Clear the URL parameter after handling it
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('module')
        window.history.replaceState({}, '', newUrl.toString())
      } else {
        console.log(`No module found for parameter: "${moduleParam}"`)
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
        "Inventory Management": "eoxs",
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
              ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${data.publicId}.jpg`
              : undefined,
          ),
          description: data.description || "-",
          category: category,
          // Assign company based on category
          company: companyMapping[category] || "eoxs"
        };
      }) as unknown as Video[]

      // Fetch saved module orders
      const categoryToOrderIds = await getAllModuleVideoOrders()
      console.log("Fetched category orders:", categoryToOrderIds)
      setCategoryOrders(categoryToOrderIds)

      // Fetch watch history to mark watched videos
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      // Mark watched videos
      // Apply watch status
      let videosWithWatchStatus = videoList.map((video) => ({
        ...video,
        watched: watchedVideoIds.has(video.id),
      }))

      // Apply per-category ordering if defined
      videosWithWatchStatus = videosWithWatchStatus.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category)
        const order = categoryToOrderIds[a.category]
        if (!order || order.length === 0) return 0
        const ia = order.indexOf(a.id)
        const ib = order.indexOf(b.id)
        const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
        const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
        return aPos - bPos
      })

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
      
      // Debug logging
      console.log(`Processing category: "${category}" -> normalized: "${normalizedCategory}" -> videoOrderKey: "${videoOrderKey}"`)
      const savedOrder = categoryOrders[category]
      console.log(`Sorting videos for category "${category}":`, {
        savedOrder,
        videoCount: videos.length,
        videoIds: videos.map(v => v.id)
      })
      const sortedVideos = [...videos].sort((a, b) => {
        if (savedOrder && savedOrder.length > 0) {
          const ia = savedOrder.indexOf(a.id)
          const ib = savedOrder.indexOf(b.id)
          const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
          const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
          console.log(`Comparing ${a.title} (pos: ${aPos}) vs ${b.title} (pos: ${bPos})`)
          if (aPos !== bPos) return aPos - bPos
        }
        const orderA = orderArr?.indexOf(a.title) ?? Number.MAX_SAFE_INTEGER
        const orderB = orderArr?.indexOf(b.title) ?? Number.MAX_SAFE_INTEGER
        if (orderA !== Number.MAX_SAFE_INTEGER && orderB !== Number.MAX_SAFE_INTEGER) {
          return orderA - orderB
        }
        if (orderA !== Number.MAX_SAFE_INTEGER) return -1
        if (orderB !== Number.MAX_SAFE_INTEGER) return 1
        return a.title.localeCompare(b.title)
      })
      // Create module name, avoiding double "Module" if category already contains it
      const moduleName = category.includes("Module") ? `${category} Overview` : `${category} Module Overview`
      moduleArray.push({
        name: moduleName,
        category,
        totalDuration: calculateTotalDuration(sortedVideos),
        videos: sortedVideos,
      })
    })

    // Debug: Log all modules before sorting
    console.log("Modules before sorting:", moduleArray.map(m => ({ name: m.name, category: m.category })))

    // Sort modules according to MODULE_ORDER
    moduleArray.sort((a, b) => {
      // Normalize category names for comparison
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/gi, "")
      
      // Special handling for Sales module - always put it first
      const isSalesA = normalize(a.category).includes("sales")
      const isSalesB = normalize(b.category).includes("sales")
      
      if (isSalesA && !isSalesB) return -1
      if (!isSalesA && isSalesB) return 1
      
      const indexA = MODULE_ORDER.findIndex(
        (name) => normalize(a.category) === normalize(name)
      )
      const indexB = MODULE_ORDER.findIndex(
        (name) => normalize(b.category) === normalize(name)
      )
      
      // Debug logging
      console.log(`Sorting: ${a.category} (index: ${indexA}) vs ${b.category} (index: ${indexB})`)
      
      if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

    // Debug: Log all modules after sorting
    console.log("Modules after sorting:", moduleArray.map(m => ({ name: m.name, category: m.category })))

    // Set all modules as collapsed by default
    setExpandedModules([])
    setModules(moduleArray)
  }, [videos, categoryOrders])

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

  // Debug: Log module selection changes
  useEffect(() => {
    if (selectedVideos.length > 0) {
      const selectedVideoObjects = videos.filter((video) => selectedVideos.includes(video.id))
      const selectedCategories = [...new Set(selectedVideoObjects.map(v => v.category))]
      console.log("🔍 Dashboard - Module selection changed:")
      console.log("  - Selected video IDs:", selectedVideos)
      console.log("  - Selected categories:", selectedCategories)
      console.log("  - Selected videos:", selectedVideoObjects.map(v => ({ id: v.id, title: v.title, category: v.category })))
    }
  }, [selectedVideos, videos])

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

      // Debug: Check if selectedVideoObjects is empty
      console.log("🔍 Dashboard - Debug selectedVideoObjects:")
      console.log("  - selectedVideos array:", selectedVideos)
      console.log("  - videos array length:", videos.length)
      console.log("  - selectedVideoObjects length:", selectedVideoObjects.length)
      console.log("  - selectedVideoObjects:", selectedVideoObjects.map(v => ({ id: v.id, title: v.title, category: v.category })))
      
      // Check if any videos are missing from selectedVideoObjects
      const missingVideos = selectedVideos.filter(id => !videos.some(v => v.id === id))
      if (missingVideos.length > 0) {
        console.log("⚠️ Missing videos from selectedVideoObjects:", missingVideos)
      }

      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser?.uid),
        where("completed", "==", true),
      )
      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

             // Create a fresh playlist with only the current selection (no previous videos)
       const combinedVideoIds = new Set<string>()
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

             // Create a fresh playlist in localStorage
       const updatedPlaylist = {
         id: "custom-playlist",
         videos: allPlaylistVideos,
         createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
       }
      localStorage.setItem("currentPlaylist", JSON.stringify(updatedPlaylist))

      // Store selected videos (only the user-selected videos, not compulsory ones)
      // Also store the categories of selected videos for better matching in video player
      const selectedCategories = [...new Set(selectedVideoObjects.map(v => v.category))]
      
      console.log("🔍 Dashboard - selectedVideos:", selectedVideos)
      console.log("🔍 Dashboard - selectedCategories:", selectedCategories)
      console.log("🔍 Dashboard - selectedVideoObjects:", selectedVideoObjects.map(v => ({ id: v.id, title: v.title, category: v.category })))
      
      // Debug: Check all unique categories in the database
      const allCategoriesInDB = [...new Set(videos.map(v => v.category))]
      console.log("🔍 All categories in database:", allCategoriesInDB)
      console.log("🔍 Sales-related categories in DB:", allCategoriesInDB.filter(cat => cat.toLowerCase().includes('sales')))
      console.log("🔍 QA-related categories in DB:", allCategoriesInDB.filter(cat => cat.toLowerCase().includes('qa')))
      
      localStorage.setItem("selectedVideos", JSON.stringify(selectedVideos))
      localStorage.setItem("selectedCategories", JSON.stringify(selectedCategories))

      // Verify localStorage was set correctly
      const verifySelectedVideos = localStorage.getItem("selectedVideos")
      const verifySelectedCategories = localStorage.getItem("selectedCategories")
      console.log("🔍 Verification - selectedVideos in localStorage:", verifySelectedVideos)
      console.log("🔍 Verification - selectedCategories in localStorage:", verifySelectedCategories)

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
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 ${isRefreshing ? 'page-fade-out' : ''}`}>
      {/* Enhanced Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50 shadow-sm">
        {/* Animated top loading bar */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 top-loading-bar">
            <div className="progress"></div>
          </div>
        )}
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-200"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <img 
              src="/Black logo.png" 
              alt="EOXS Logo" 
              className="h-8 w-auto cursor-pointer hover:opacity-80 transition-all duration-200 hover:scale-105" 
              onClick={() => router.push("/")}
            />
            <div className="hidden md:block">
             
              
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showGamifiedDashboard && userProgress && (
              <>
                <div className="hidden lg:flex items-center gap-3">
                  {/* Level and streak badges removed */}
                </div>
                {/* XP badge removed */}
              </>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar Expand Button (shows when minimized on desktop only) */}
      {!isSidebarOpen && !isMobile && (
        <div className="fixed top-20 left-6 z-50 transition-all duration-300 ease-in-out">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-200"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mobile Overlay (darkens background when sidebar is open on mobile) */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      {isSidebarOpen && (
        <aside className={`fixed top-16 z-40 h-[calc(100vh-4rem)] bg-gradient-to-b from-green-600 via-green-600 to-green-800 shadow-xl transition-all duration-300 ease-in-out ${
          isMobile 
            ? 'left-0 w-64 transform translate-x-0' 
            : 'left-0 w-64'
        }`}>
          <div className="flex h-full w-full flex-col">
            <div className="flex flex-col gap-0.5 p-4">
              <div className="flex justify-end mb-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white hover:bg-transparent"
                >
                  <ArrowLeft className="h-4 w-4 text-white" />
                </Button>
              </div>
           
               
                
              
              
              {/* My Dashboard Action - show gamified dashboard */}
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={() => {
                  setShowGamifiedDashboard(true)
                  setIsRefreshing(true)
                  setTimeout(() => {
                    window.location.reload()
                  }, 300)
                }}
                className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg"
              >
                <div className="p-2 bg-white/10 rounded-lg">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="ml-1 text-white">My Dashboard</span>
                {isRefreshing && (
                  <span className="ml-2 h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
              </Button>
              
              <Link href="/profile" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">User Profile</span>
                  </a>
                </Button>
              </Link>
              
              <Link href="/playlist" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <List className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">My Playlist</span>
                  </a>
                </Button>
              </Link>
              
              <Link href="/leaderboard" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">
                      {"Leaderboard"}
                    </span>
                  </a>
                </Button>
              </Link>
              
              <Link href="/about" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">About EOXSplore</span>
                  </a>
                </Button>
              </Link>
              
              <Link href="https://eoxs.com" target="_blank" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">About EOXS</span>
                  </a>
                </Button>
              </Link>
              
              <Link href="https://eoxs.com/contact" target="_blank" passHref legacyBehavior>
                <Button asChild variant="ghost" size="lg" className="justify-start w-full text-white hover:bg-green-500/80 hover:text-white transition-all duration-200 rounded-lg">
                  <a 
                    className="flex items-center gap-3 text-white"
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">Contact</span>
                  </a>
                </Button>
              </Link>
            </div>
            
            <Separator className="bg-green-500/30 mx-4" />
            
            {/* Quick Stats Section */}
            <div className="p-4 mt-auto">
              <div className="bg-white/10 rounded-lg p-3">
                <h3 className="text-white font-medium text-sm mb-2">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-white text-xs">
                    <span className="text-white">Videos Watched</span>
                    <span className="font-medium text-white">{videos.filter(v => v.watched).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-white text-xs">
                    <span className="text-white">Total Videos</span>
                    <span className="font-medium text-white">{videos.length}</span>
                  </div>
                  <div className="w-full bg-green-500/30 rounded-full h-1.5">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${videos.length > 0 ? (videos.filter(v => v.watched).length / videos.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
      
      {/* Enhanced Main Content */}
      <main className={`pt-16 min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarOpen && !isMobile ? 'md:ml-64' : 'ml-0'
      } ${isRefreshing ? 'relative' : ''}`}>
        {/* Shimmer sweep overlay across content */}
        {isRefreshing && (
          <div className="sweep-overlay absolute inset-0 overflow-hidden">
            <div className="sweep-light"></div>
          </div>
        )}
        {/* Show Gamified Dashboard or Classic Dashboard */}
        {showGamifiedDashboard ? (
          <GamifiedDashboard />
        ) : (
          <>
            {/* Enhanced Suspension Warning Banner */}
            {userData && userData.daysUntilSuspension > 0 && userData.daysUntilSuspension <= 7 && showSuspensionWarning && (
              <div className="max-w-6xl mx-auto p-6">
                <div className="relative">
                  <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg pr-10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 font-medium">
                    <strong>Account Suspension Warning:</strong> Your account will be suspended in {userData.daysUntilSuspension} day{userData.daysUntilSuspension !== 1 ? 's' : ''}. 
                    To prevent suspension, please contact <a href="mailto:isha@eoxsteam.com" className="underline font-semibold hover:text-amber-900 transition-colors">isha@eoxsteam.com</a>.
                  </AlertDescription>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-700"
                      onClick={() => {
                        setShowSuspensionWarning(false)
                        try {
                          if (user) sessionStorage.setItem(`dismiss_suspension_${user.uid}`, 'true')
                        } catch {}
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                </Alert>
                </div>
              </div>
            )}
            
            <div className="max-w-6xl mx-auto p-6">
              {/* Enhanced Search and Actions Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Search videos by title, tags, or description..."
                      className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleWatchSelected}
                    disabled={selectedVideos.length === 0}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Watch Selected ({selectedVideos.length})
                  </Button>
                </div>
              </div>



            {/* Enhanced Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                  <div className="p-8">
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  </div>
                ) : modules.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No videos found</h3>
                    <p className="text-slate-500">Try adjusting your search criteria or filters</p>
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Module-level selection only */}
                    <div className="flex items-center mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">Select whole modules using the checkboxes on each module</span>
                      <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
                        {selectedVideos.length} videos in selected modules
                      </Badge>
                    </div>

                    {/* Enhanced Accordion */}
                    <Accordion type="multiple" value={expandedModules} onValueChange={setExpandedModules} className="w-full space-y-3">
                      {modules.map((module, moduleIndex) => (
                        <AccordionItem key={moduleIndex} value={module.category} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200">
                          <AccordionTrigger className="px-6 py-4 hover:no-underline bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-4">
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
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <Target className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-900 text-left">{module.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {module.totalDuration}
                                      </Badge>
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                        {module.videos.length} videos
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-t border-slate-200">
                                  <tr>
                                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Feature</th>
                                    <th className="px-6 py-3 text-left font-semibold text-slate-700 w-32 whitespace-nowrap">
                                      Video Length
                                    </th>
                                    <th className="px-6 py-3 text-left font-semibold text-slate-700 w-24">
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 mr-2"></div>
                                        Status
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {module.videos.map((video) => (
                                    <tr key={video.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{video.title}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                        <div className="flex items-center text-slate-600 whitespace-nowrap">
                                          <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                          {video.duration}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        {video.watched ? (
                                          <div className="flex items-center text-green-600">
                                            <CheckCircle className="h-4 w-4 mr-1.5" />
                                            <span className="text-xs font-medium">Completed</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center text-slate-500">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>
                                            <span className="text-xs">Pending</span>
                                          </div>
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
      


      {/* Challenge Mode */}
      <ChallengeMode 
        isVisible={showChallengeMode} 
        onClose={() => setShowChallengeMode(false)}
      />
      
      {/* Enhanced Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm py-4 mt-12">
        <div className="container text-center text-xs text-slate-500">
          © {new Date().getFullYear()} EOXS. All rights reserved.
        </div>
      </footer>

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