"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, setDoc, serverTimestamp } from "firebase/firestore"
import type { User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Trash2, PlayCircle, Edit, RefreshCw, SortAsc, Share2, Copy, Clock, CheckCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { saveModuleVideoOrder, getAllModuleVideoOrders, getAllModuleOrders, getAllModuleDisplayNames } from "@/app/firestore-utils"

interface Video {
  id: string
  title: string
  description?: string
  category?: string
  videoUrl?: string
  publicId?: string
  cloudinaryAssetId?: string
  createdAt: any
  views?: number
  watchTime?: number
  engagement?: number
  tags?: string[]
  thumbnailUrl?: string
  duration?: number
}

export default function VideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editedVideo, setEditedVideo] = useState<Partial<Video>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [orderCategory, setOrderCategory] = useState<string>("")
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({})
  const [modules, setModules] = useState<Array<{name: string, category: string, videos: Video[], totalDuration: string}>>([])
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [moduleOrders, setModuleOrders] = useState<Record<string, number>>({})
  const [moduleDisplayNames, setModuleDisplayNames] = useState<Record<string, string>>({})
  
  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareForVideo, setShareForVideo] = useState<Video | null>(null)
  const [existingShares, setExistingShares] = useState<Array<{ token: string; createdAt?: any }>>([])
  const [generatingShare, setGeneratingShare] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  // Confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null)

  // Thumbnail upload states
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)
    })

    loadVideos()
    loadModuleOrders()
    loadModuleDisplayNames()
    return () => unsubscribe()
  }, [router])

  const loadModuleOrders = async () => {
    try {
      const orders = await getAllModuleOrders()
      setModuleOrders(orders)
    } catch (error) {
      console.error("Error loading module orders:", error)
    }
  }

  const loadModuleDisplayNames = async () => {
    try {
      const displayNames = await getAllModuleDisplayNames()
      setModuleDisplayNames(displayNames)
    } catch (error) {
      console.error("Error loading module display names:", error)
    }
  }

  // Display helper to remove "Overview" but preserve original names for ordering/keys (same as modules page)
  const getDisplayModuleName = (name: string): string => {
    // Replace trailing "Module Overview" with "Module", or plain trailing "Overview"
    const withoutModuleOverview = name.replace(/\s*Module\s*Overview$/i, " Module")
    return withoutModuleOverview.replace(/\s*Overview$/i, "")
  }

  useEffect(() => {
    // Filter videos when category changes
    if (selectedCategory === "all") {
      setFilteredVideos(videos)
    } else {
      const list = videos.filter((video) => video.category === selectedCategory)
      const order = categoryOrders[selectedCategory]
      if (order && order.length > 0) {
        list.sort((a, b) => {
          const ia = order.indexOf(a.id)
          const ib = order.indexOf(b.id)
          const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
          const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
          return aPos - bPos
        })
      }
      setFilteredVideos(list)
    }
  }, [selectedCategory, videos, categoryOrders])

  // Organize videos into modules (exact same logic as modules page)
  const organizeVideosIntoModules = () => {
    // Group videos by category (same as modules page)
    const videosByCategory = videos.reduce(
      (acc, video) => {
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>
    )

    // Create module objects (same logic as modules page)
    const moduleArray: Array<{name: string, category: string, videos: Video[], totalDuration: string}> = []
    Object.entries(videosByCategory).forEach(([category, videos]) => {
      // Skip only Company Introduction category, include AI tools (same as modules page)
      if (category === "Company Introduction") {
        return
      }

      // Calculate total duration (same as modules page)
      const totalMinutes = videos.reduce((sum, video) => {
        const duration = video.duration || 0
        return sum + duration
      }, 0)

      // Create module name (same as modules page)
      const moduleName = category.includes("Module") ? `${category} Overview` : `${category} Module Overview`
      
      moduleArray.push({
        name: moduleName,
        category: category,
        videos: videos,
        totalDuration: `${Math.ceil(totalMinutes / 60)} mins`
      })
    })

    // Sort modules by their order (same as modules page)
    const sortedModules = moduleArray.sort((a, b) => {
      const orderA = moduleOrders[a.name] ?? Number.MAX_SAFE_INTEGER
      const orderB = moduleOrders[b.name] ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })

    setModules(sortedModules)
  }

  // Call organizeVideosIntoModules when videos or moduleOrders change
  useEffect(() => {
    if (videos.length > 0) {
      organizeVideosIntoModules()
    }
  }, [videos, moduleOrders])

  // Handle module selection
  const handleModuleClick = (moduleCategory: string) => {
    if (selectedModule === moduleCategory) {
      // If clicking the same module, show all videos
      setSelectedModule(null)
      setFilteredVideos(videos)
    } else {
      // Show videos for the selected module
      setSelectedModule(moduleCategory)
      const moduleVideos = videos.filter((video) => video.category === moduleCategory)
      const order = categoryOrders[moduleCategory]
      if (order && order.length > 0) {
        moduleVideos.sort((a, b) => {
          const ia = order.indexOf(a.id)
          const ib = order.indexOf(b.id)
          const aPos = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
          const bPos = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
          return aPos - bPos
        })
      }
      setFilteredVideos(moduleVideos)
    }
  }

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)

      // Get video watch events to calculate views
      const eventsQuery = query(collection(db, "videoWatchEvents"), where("eventType", "==", "play"))
      const eventsSnapshot = await getDocs(eventsQuery)

      // Count views per video
      const viewsMap = new Map<string, number>()
      const watchTimeMap = new Map<string, number>()

      eventsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const videoId = data.videoId

        // Count views
        viewsMap.set(videoId, (viewsMap.get(videoId) || 0) + 1)

        // Sum watch time
        if (data.watchDuration) {
          watchTimeMap.set(videoId, (watchTimeMap.get(videoId) || 0) + data.watchDuration)
        }
      })

      // Get videos
      const videosSnapshot = await getDocs(collection(db, "videos"))
      const videoData = videosSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          title: data.title || "Untitled Video",
          views: viewsMap.get(doc.id) || 0,
          watchTime: watchTimeMap.get(doc.id) ? Math.round(((watchTimeMap.get(doc.id) || 0) / 3600) * 100) / 100 : 0, // Convert seconds to hours with 2 decimal places
        }
      }) as Video[]

      // Extract unique categories
      const uniqueCategories = new Set<string>()
      videoData.forEach((video) => {
        if (video.category) {
          uniqueCategories.add(video.category)
        }
      })

      setCategories(Array.from(uniqueCategories))
      setVideos(videoData)
      setFilteredVideos(videoData)

      // Load any saved orders and convert Record<string, number> to string[]
      const orders = await getAllModuleVideoOrders()
      const convertedOrders: Record<string, string[]> = {}
      Object.entries(orders).forEach(([category, orderMap]) => {
        // Convert Record<videoId, position> to sorted array of videoIds
        const sortedIds = Object.entries(orderMap)
          .sort(([, posA], [, posB]) => posA - posB)
          .map(([videoId]) => videoId)
        convertedOrders[category] = sortedIds
      })
      setCategoryOrders(convertedOrders)
    } catch (error) {
      console.error("Error fetching videos:", error)
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const uploadThumbnail = async (file: File): Promise<string> => {
    try {
      setIsUploadingThumbnail(true)
      
      console.log('Starting thumbnail upload for file:', file.name, 'Size:', file.size)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'eoxsDemoTool') // Use the same preset that works for videos
      formData.append('cloud_name', 'dnx1sl0nq')
      
      // Log the form data for debugging
      console.log('Form data entries:')
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value)
      }
      
      console.log('Uploading to Cloudinary...')
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/dnx1sl0nq/image/upload`, {
        method: 'POST',
        body: formData,
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cloudinary error response:', errorText)
        throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Cloudinary response data:', data)
      
      if (!data.secure_url) {
        throw new Error('No secure URL returned from Cloudinary')
      }
      
      return data.secure_url
    } catch (error) {
      console.error('Detailed error uploading thumbnail:', error)
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`)
      } else {
        throw new Error('Unknown upload error occurred')
      }
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  const handleThumbnailChange = (file: File) => {
    setThumbnailFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) return

    try {
      console.log("Starting thumbnail upload process...")
      const thumbnailUrl = await uploadThumbnail(thumbnailFile)
      console.log("Uploaded thumbnail URL:", thumbnailUrl)
      
      setEditedVideo(prev => ({ ...prev, thumbnailUrl }))
      setThumbnailPreview(thumbnailUrl)
      setThumbnailFile(null)
      
      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      })
    } catch (error) {
      console.error("Error in handleThumbnailUpload:", error)
      let errorMessage = "Failed to upload thumbnail. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const generateThumbnailFromVideo = async () => {
    if (!selectedVideo?.cloudinaryAssetId && !selectedVideo?.publicId) {
      toast({
        title: "Error",
        description: "No video asset ID or public ID found to generate thumbnail from",
        variant: "destructive",
      })
      return
    }

    try {
      // Generate thumbnail URL from Cloudinary video asset ID or public ID
      const id = selectedVideo.cloudinaryAssetId || selectedVideo.publicId
      const thumbnailUrl = `https://res.cloudinary.com/dnx1sl0nq/video/upload/${id}.jpg`
      setEditedVideo({ ...editedVideo, thumbnailUrl })
      setThumbnailPreview(thumbnailUrl)
      toast({
        title: "Success",
        description: "Thumbnail generated from video successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate thumbnail from video",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (videoId: string) => {
    try {
      await deleteDoc(doc(db, "videos", videoId))
      setVideos(videos.filter((video) => video.id !== videoId))
      setFilteredVideos(filteredVideos.filter((video) => video.id !== videoId))
      toast({
        title: "Success",
        description: "Video deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (video: Video) => {
    setVideoToDelete(video)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (videoToDelete) {
      await handleDelete(videoToDelete.id)
      setDeleteDialogOpen(false)
      setVideoToDelete(null)
    }
  }

  const handlePreview = (video: Video) => {
    setSelectedVideo(video)
    setIsPreviewOpen(true)
  }

  const handleEdit = (video: Video) => {
    console.log("Editing video:", video) // Debug log
    setSelectedVideo(video)
    const initialData = {
      title: video.title,
      description: video.description || "",
      category: video.category || "",
      thumbnailUrl: video.thumbnailUrl || "",
    }
    console.log("Setting initial edited video data:", initialData) // Debug log
    setEditedVideo(initialData)
    setThumbnailPreview(video.thumbnailUrl || null)
    setThumbnailFile(null)
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedVideo || !editedVideo.title) return

    try {
      console.log("Saving video with data:", editedVideo) // Debug log
      
      const videoRef = doc(db, "videos", selectedVideo.id)
      const updateData = {
        title: editedVideo.title,
        description: editedVideo.description,
        category: editedVideo.category,
        thumbnailUrl: editedVideo.thumbnailUrl,
      }
      
      console.log("Update data:", updateData) // Debug log
      
      await updateDoc(videoRef, updateData)

      // Update local state
      const updatedVideos = videos.map((video) =>
        video.id === selectedVideo.id ? { ...video, ...editedVideo } : video,
      )

      setVideos(updatedVideos)
      setFilteredVideos(
        selectedCategory === "all"
          ? updatedVideos
          : updatedVideos.filter((video) => video.category === selectedCategory),
      )

      setIsEditOpen(false)
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setEditedVideo({}) // Reset edited video state
      toast({
        title: "Success",
        description: "Video updated successfully",
      })
    } catch (error) {
      console.error("Error updating video:", error)
      toast({
        title: "Error",
        description: "Failed to update video",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    loadVideos()
  }

  const openOrderDialogForCategory = (category: string) => {
    const vids = videos.filter(v => v.category === category)
    setOrderCategory(category)
    setOrderedIds(vids.map(v => v.id))
    setIsOrderDialogOpen(true)
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    setOrderedIds(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return next
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  const saveOrder = async () => {
    try {
      console.log("Saving order for category:", orderCategory)
      console.log("Ordered IDs:", orderedIds)
      
      // Convert array to Record<string, number> where key is videoId and value is order position
      const orderRecord: Record<string, number> = {}
      orderedIds.forEach((id, index) => {
        orderRecord[id] = index
      })
      
      await saveModuleVideoOrder(orderCategory, orderRecord)
      console.log("Order saved successfully")
      // Update local order state immediately so table reflects new order
      setCategoryOrders(prev => ({ ...prev, [orderCategory]: orderedIds }))
      toast({ title: "Order saved", description: `Order updated for ${orderCategory}` })
      setIsOrderDialogOpen(false)
    } catch (e) {
      console.error("Error saving order:", e)
      toast({ title: "Failed to save order", variant: "destructive" })
    }
  }

  const openShareDialog = async (video: Video) => {
    setShareForVideo(video)
    setIsShareDialogOpen(true)
    try {
      // Load existing shares for this video
      const sharesSnap = await getDocs(query(collection(db, "sharedLinks"), where("videoId", "==", video.id)))
      const items = sharesSnap.docs.map(d => ({ token: d.id, ...(d.data() as any) }))
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setExistingShares(items)
    } catch (e) {
      console.error("Failed to load shares", e)
    }
  }

  const generateToken = () => {
    // 20-char base36 token
    const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    return rand.slice(0, 20)
  }

  const createShareLink = async () => {
    if (!shareForVideo) return
    try {
      setGeneratingShare(true)
      // Check if link already exists for this video
      const existingSnap = await getDocs(query(collection(db, "sharedLinks"), where("videoId", "==", shareForVideo.id)))
      if (!existingSnap.empty) {
        toast({ title: "Link already exists", description: "This video already has a shareable link" })
        return
      }
      
      const token = generateToken()
      const ref = doc(db, "sharedLinks", token)
      await setDoc(ref, {
        videoId: shareForVideo.id,
        videoTitle: shareForVideo.title,
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}/shared/${token}`
      try {
        await navigator.clipboard.writeText(link)
        toast({ 
          title: "Copied!", 
          description: "Link copied to clipboard successfully",
        })
      } catch {
        toast({ title: "Link created", description: link })
      }
      // Refresh list
      const sharesSnap = await getDocs(query(collection(db, "sharedLinks"), where("videoId", "==", shareForVideo.id)))
      const items = sharesSnap.docs.map(d => ({ token: d.id, ...(d.data() as any) }))
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setExistingShares(items)
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to create link", variant: "destructive" })
    } finally {
      setGeneratingShare(false)
    }
  }

  const copyShareLink = async (token: string) => {
    const link = `${window.location.origin}/shared/${token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedToken(token)
      toast({ 
        title: "Copied!", 
        description: "Link copied to clipboard successfully",
      })
      // Reset after 2 seconds
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      toast({ title: "Link", description: link })
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Videos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Modules Accordion */}
      {!isLoading && modules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 sm:p-6">
            <Accordion type="multiple" value={expandedModules} onValueChange={setExpandedModules} className="w-full space-y-3">
              {modules.map((module, moduleIndex) => (
                <AccordionItem key={moduleIndex} value={module.category} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200">
                  <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full text-sm font-semibold text-slate-700 flex-shrink-0">
                        {moduleOrders[module.name] !== undefined ? moduleOrders[module.name] + 1 : moduleIndex + 1}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                        {moduleDisplayNames[module.category] || getDisplayModuleName(module.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                        <span className="hidden sm:inline">{module.videos.length} videos</span>
                        <span className="sm:hidden">{module.videos.length} videos</span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-left font-semibold text-slate-700">Title</th>
                            <th className="px-6 py-3 text-left font-semibold text-slate-700">Upload Date</th>
                            <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {module.videos.map((video) => (
                            <tr key={video.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {video.thumbnailUrl ? (
                                    <img 
                                      src={video.thumbnailUrl} 
                                      alt={`${video.title} thumbnail`}
                                      className="w-12 h-8 object-cover rounded border border-slate-200 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
                                      <PlayCircle className="h-4 w-4 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="font-medium text-slate-900">{video.title}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {video.createdAt && video.createdAt.seconds
                                  ? format(new Date(video.createdAt.seconds * 1000), "MMM dd, yyyy")
                                  : "N/A"}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handlePreview(video)}>
                                      <PlayCircle className="mr-2 h-4 w-4" />
                                      Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(video)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modify
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openShareDialog(video)}>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(video)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
        </div>
      )}

      {/* Show message when no modules */}
      {!isLoading && modules.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlayCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Found</h3>
          <p className="text-gray-500">There are no videos available in the system</p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo?.videoUrl && (
            <div className="aspect-video w-full">
              <video src={selectedVideo.videoUrl} controls className="w-full h-full rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Order - {orderCategory}</DialogTitle>
            <DialogDescription>Arrange videos for this module. Top appears first.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto border rounded">
            {orderedIds.map((id, idx) => {
              const v = videos.find(x => x.id === id)
              if (!v) return null
              return (
                <div
                  key={id}
                  className={`flex items-center justify-between px-3 py-2 border-b last:border-b-0 ${dragIndex === idx ? "bg-gray-50" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragIndex === null || dragIndex === idx) return
                    setOrderedIds(prev => {
                      const next = [...prev]
                      const [moved] = next.splice(dragIndex, 1)
                      next.splice(idx, 0, moved)
                      return next
                    })
                    setDragIndex(idx)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs text-gray-500">{idx + 1}</span>
                    <img src={(() => {
                      let thumbnailUrl = v.thumbnailUrl || "/placeholder.svg"
                      if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                        const separator = thumbnailUrl.includes('?') ? '&' : '?'
                        thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}`
                      }
                      return thumbnailUrl
                    })()} className="w-10 h-7 object-cover rounded border" alt="thumb" />
                    <div className="text-sm">{v.title}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => moveItem(idx, -1)}>Up</Button>
                    <Button variant="outline" size="sm" onClick={() => moveItem(idx, 1)}>Down</Button>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOrder}>Save Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open)
        if (!open) {
          setThumbnailFile(null)
          setThumbnailPreview(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>Update the details of this video</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedVideo.title || ""}
                onChange={(e) => setEditedVideo({ ...editedVideo, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={editedVideo.category || ""}
                onValueChange={(value) => setEditedVideo({ ...editedVideo, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedVideo.description || ""}
                onChange={(e) => setEditedVideo({ ...editedVideo, description: e.target.value })}
                rows={4}
              />
            </div>
            
            {/* Thumbnail Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="thumbnail">Thumbnail</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Upload a custom thumbnail or generate one from the video. 
                  <br />
                  <span className="text-xs text-blue-600">
                    💡 Tip: If thumbnail upload fails, use "Generate from Video" to create a thumbnail from the existing video.
                  </span>
                </p>
              </div>
              

              
              {/* Current Thumbnail Preview */}
              {editedVideo.thumbnailUrl && (
                <div className="relative">
                  <img 
                    src={(() => {
                      let thumbnailUrl = editedVideo.thumbnailUrl
                      if (thumbnailUrl && thumbnailUrl.includes('cloudinary.com')) {
                        const separator = thumbnailUrl.includes('?') ? '&' : '?'
                        thumbnailUrl = `${thumbnailUrl}${separator}t=${Date.now()}`
                      }
                      return thumbnailUrl
                    })()} 
                    alt="Current thumbnail" 
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={() => {
                      setThumbnailPreview(null)
                      setThumbnailFile(null)
                      setEditedVideo(prev => ({ ...prev, thumbnailUrl: "" }))
                    }}
                    title="Remove thumbnail"
                  >
                    ×
                  </Button>
                </div>
              )}
              
              {/* File Upload Section */}
              <div className="space-y-3">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleThumbnailChange(file)
                    }
                  }}
                  className="cursor-pointer"
                />
                
                {thumbnailFile && (
                  <div className="space-y-3">
                    {/* File info display */}
                    <div className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 rounded">
                      <div className="font-medium mb-1 text-gray-700 dark:text-gray-300">Selected file:</div>
                      <div className="truncate font-mono text-gray-900 dark:text-gray-100" title={thumbnailFile.name}>
                        {thumbnailFile.name}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        Size: {(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleThumbnailUpload}
                        disabled={isUploadingThumbnail}
                      >
                        {isUploadingThumbnail ? "Uploading..." : "Upload"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setThumbnailFile(null)
                          setThumbnailPreview(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Generate from video button */}
                {selectedVideo?.publicId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateThumbnailFromVideo}
                    className="w-full"
                  >
                    Generate from Video
                  </Button>
                )}
                
                {/* Clear thumbnail button */}
                {editedVideo.thumbnailUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedVideo(prev => ({ ...prev, thumbnailUrl: "" }))
                      setThumbnailPreview(null)
                      setThumbnailFile(null)
                    }}
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    Clear Thumbnail
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditOpen(false)
              setThumbnailFile(null)
              setThumbnailPreview(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Video
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to permanently delete{" "}
              <strong>"{videoToDelete?.title}"</strong>?
              <br /><br />
              <strong>⚠️ WARNING: This action cannot be undone!</strong>
              <br /><br />
              <strong>This will permanently:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete the video file and all associated data</li>
                <li>Remove the video from all playlists</li>
                <li>Delete all user watch history for this video</li>
                <li>Remove all feedback and ratings for this video</li>
                <li>Delete the video thumbnail and metadata</li>
              </ul>
              <br />
              <strong>Impact:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Users will no longer be able to access this video</li>
                <li>Any playlists containing this video will be affected</li>
                <li>Analytics data for this video will be lost</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={(open) => { setIsShareDialogOpen(open); if (!open) { setShareForVideo(null); setExistingShares([]); setCopiedToken(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Video{shareForVideo ? ` - ${shareForVideo.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Generate a public link to share this video.
              Visitors will be asked for their name before watching.</div>
              {existingShares.length === 0 ? (
                <Button onClick={createShareLink} disabled={!shareForVideo || generatingShare}>
                  {generatingShare ? "Generating..." : "Create Link"}
                </Button>
              ) : (
                <span className="text-sm text-green-600">Link already created</span>
              )}
            </div>
            <div className="border rounded">
              <div className="px-3 py-2 text-sm font-medium">Existing Links</div>
              <div className="max-h-[40vh] overflow-auto divide-y">
                {existingShares.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No links yet</div>
                ) : existingShares.map((s) => (
                  <div key={s.token} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-mono truncate">/shared/{s.token}</div>
                      <div className="text-xs text-muted-foreground">{s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleString() : ""}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyShareLink(s.token)}>
                      {copiedToken === s.token ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              View link analytics in Admin → Shared Links.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

