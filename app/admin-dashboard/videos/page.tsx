"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore"
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
import { MoreHorizontal, Trash2, PlayCircle, Edit, RefreshCw, SortAsc } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { saveModuleVideoOrder, getAllModuleVideoOrders } from "@/app/firestore-utils"

interface Video {
  id: string
  title: string
  description?: string
  category?: string
  videoUrl?: string
  publicId?: string
  createdAt: any
  views?: number
  watchTime?: number
  engagement?: number
  tags?: string[]
  thumbnailUrl?: string
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
    return () => unsubscribe()
  }, [router])

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

      // Load any saved orders
      const orders = await getAllModuleVideoOrders()
      setCategoryOrders(orders)
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
    if (!selectedVideo?.publicId) {
      toast({
        title: "Error",
        description: "No video public ID found to generate thumbnail from",
        variant: "destructive",
      })
      return
    }

    try {
      // Generate thumbnail URL from Cloudinary video public ID
      const thumbnailUrl = `https://res.cloudinary.com/dnx1sl0nq/video/upload/${selectedVideo.publicId}.jpg`
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
      await saveModuleVideoOrder(orderCategory, orderedIds)
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Videos</h1>
        <div className="flex gap-2">
          {selectedCategory !== "all" && (
            <Button variant="default" onClick={() => openOrderDialogForCategory(selectedCategory)}>
              <SortAsc className="h-4 w-4 mr-2" /> Set Order
            </Button>
          )}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Thumbnail</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No videos found
                </TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.category || "Uncategorized"}</TableCell>
                  <TableCell>
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={`${video.title} thumbnail`}
                        className="w-16 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                        No thumbnail
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {video.createdAt && video.createdAt.seconds
                      ? format(new Date(video.createdAt.seconds * 1000), "PPP")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(video)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
                    <img src={v.thumbnailUrl || "/placeholder.svg"} className="w-10 h-7 object-cover rounded border" alt="thumb" />
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
                <SelectContent>
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
                    src={editedVideo.thumbnailUrl} 
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
    </div>
  )
}

