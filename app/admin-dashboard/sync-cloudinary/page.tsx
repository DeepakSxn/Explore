"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  RefreshCw, 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Download,
  Upload,
  Home,
  LogOut,
  Clock
} from "lucide-react"
import { auth, db } from "@/firebase"
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Video {
  id: string
  title: string
  publicId: string
  videoUrl: string
  thumbnailUrl?: string
  category?: string
  duration?: string
  tags?: string[]
  createdAt?: any
  // Cloudinary sync data
  format?: string
  width?: number
  height?: number
  fileSize?: number
  frameRate?: number
  bitRate?: number
  rotation?: number
  nbFrames?: number
  playbackUrl?: string
  originalFilename?: string
  cloudinaryVersion?: number
  cloudinaryAssetId?: string
  cloudinarySignature?: string
  cloudinaryEtag?: string
  cloudinaryCreatedAt?: string
  audioCodec?: string
  audioBitRate?: string
  audioChannels?: number
  audioFrequency?: number
  videoCodec?: string
  videoProfile?: string
  videoPixelFormat?: string
  lastSyncedAt?: string
  cloudinaryTags?: string[]
  // Nested cloudinary data structure
  cloudinaryData?: {
    format?: string
    width?: number
    height?: number
    bytes?: number
    duration?: number
  }
}

interface CloudinaryAsset {
  public_id: string
  secure_url: string
  format: string
  width: number
  height: number
  bytes: number
  duration: number
  frame_rate: number
  bit_rate: number
  created_at: string
  original_filename: string
  resource_type: string
  version: number
  asset_id: string
  signature: string
  etag: string
  type: string
  placeholder: boolean
  url: string
  playback_url?: string
  audio?: {
    codec: string
    bit_rate: string
    frequency: number
    channels: number
    channel_layout: string
  }
  video?: {
    pix_format: string
    codec: string
    level: number
    profile: string
    bit_rate: string
    dar: string
    time_base: string
  }
  is_audio: boolean
  rotation: number
  nb_frames: number
  tags: string[]
  context: any
  eager?: any[]
  access_mode: string
  uploaded_by?: string
  asset_folder: string
  display_name: string
  pages: number
}

export default function SyncCloudinaryPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncResults, setSyncResults] = useState<{
    total: number
    success: number
    failed: number
    updated: number
    errors: string[]
  }>({
    total: 0,
    success: 0,
    failed: 0,
    updated: 0,
    errors: []
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await fetchVideos()
      } else {
        router.push("/admin-login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const videosQuery = query(collection(db, "videos"), orderBy("createdAt", "desc"))
      const videosSnapshot = await getDocs(videosQuery)
      
      const videosData = videosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Video[]
      
      setVideos(videosData)
    } catch (error) {
      console.error("Error fetching videos:", error)
      toast({
        title: "Error",
        description: "Failed to fetch videos from database",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCloudinaryAsset = async (publicId: string): Promise<CloudinaryAsset | null> => {
    try {
      // Use Cloudinary Search API to get asset details
      const response = await fetch(`/api/cloudinary-asset?publicId=${encodeURIComponent(publicId)}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch asset: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error fetching Cloudinary asset ${publicId}:`, error)
      return null
    }
  }

  const syncAllVideos = async () => {
    if (videos.length === 0) {
      toast({
        title: "No Videos",
        description: "No videos found to sync",
        variant: "destructive"
      })
      return
    }

    setSyncing(true)
    setSyncProgress(0)
    setSyncResults({
      total: videos.length,
      success: 0,
      failed: 0,
      updated: 0,
      errors: []
    })

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      const progress = ((i + 1) / videos.length) * 100
      setSyncProgress(progress)

      try {
        console.log(`🔄 Syncing video ${i + 1}/${videos.length}: ${video.title}`)
        
        // Fetch asset details from Cloudinary
        const assetData = await fetchCloudinaryAsset(video.publicId)
        
        if (!assetData) {
          setSyncResults(prev => ({
            ...prev,
            failed: prev.failed + 1,
            errors: [...prev.errors, `Failed to fetch asset for ${video.title}`]
          }))
          continue
        }

        // Update Firestore with Cloudinary data
        const videoRef = doc(db, "videos", video.id)
        // Ensure we only send valid, non-undefined values
        const updateData: any = {}
        
        if (assetData.asset_id) {
          updateData.cloudinaryAssetId = assetData.asset_id
        }
        
        updateData.lastSyncedAt = new Date().toISOString()

        console.log('📝 Updating Firestore with:', updateData)
        console.log('🔍 Asset data received:', {
          asset_id: assetData.asset_id,
          duration: assetData.duration,
          format: assetData.format,
          public_id: assetData.public_id
        })
        console.log('🔍 Full asset data keys:', Object.keys(assetData))
        console.log('🔍 Asset ID specifically:', assetData.asset_id, typeof assetData.asset_id)

        // Double-check no undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            console.error(`❌ Found undefined value for key: ${key}`)
            delete updateData[key]
          }
        })

        console.log('🔄 About to update Firestore document:', video.id)
        await updateDoc(videoRef, updateData)
        console.log('✅ Firestore update completed successfully')
        
        console.log(`✅ Successfully synced: ${video.title}`)
        setSyncResults(prev => ({
          ...prev,
          success: prev.success + 1,
          updated: prev.updated + 1
        }))

      } catch (error) {
        console.error(`❌ Error syncing ${video.title}:`, error)
        setSyncResults(prev => ({
          ...prev,
          failed: prev.failed + 1,
          errors: [...prev.errors, `Error syncing ${video.title}: ${error instanceof Error ? error.message : String(error)}`]
        }))
      }

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setSyncing(false)
    
    toast({
      title: "Sync Complete",
      description: `Synced ${syncResults.success} videos successfully, ${syncResults.failed} failed`,
    })
  }

  const syncFilteredVideos = async (filterType: 'all' | 'missing-data' | 'outdated') => {
    if (videos.length === 0) {
      toast({
        title: "No Videos",
        description: "No videos found to sync",
        variant: "destructive"
      })
      return
    }

    // Filter videos based on criteria
    let videosToSync = videos
    
    if (filterType === 'missing-data') {
      videosToSync = videos.filter(video => 
        !video.cloudinaryData?.format || 
        !video.cloudinaryData?.width || 
        !video.cloudinaryData?.height || 
        !video.cloudinaryData?.bytes || 
        !video.cloudinaryData?.duration
      )
    } else if (filterType === 'outdated') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      videosToSync = videos.filter(video => 
        !video.lastSyncedAt || 
        new Date(video.lastSyncedAt) < oneWeekAgo
      )
    }

    if (videosToSync.length === 0) {
      toast({
        title: "No Videos to Sync",
        description: `No videos found matching the ${filterType} criteria`,
        variant: "default"
      })
      return
    }

    setSyncing(true)
    setSyncProgress(0)
    setSyncResults({
      total: videosToSync.length,
      success: 0,
      failed: 0,
      updated: 0,
      errors: []
    })

    for (let i = 0; i < videosToSync.length; i++) {
      const video = videosToSync[i]
      const progress = ((i + 1) / videosToSync.length) * 100
      setSyncProgress(progress)

      try {
        console.log(`🔄 Syncing video ${i + 1}/${videosToSync.length}: ${video.title}`)
        
        // Fetch asset details from Cloudinary
        const assetData = await fetchCloudinaryAsset(video.publicId)
        
        if (!assetData) {
          setSyncResults(prev => ({
            ...prev,
            failed: prev.failed + 1,
            errors: [...prev.errors, `Failed to fetch asset for ${video.title}`]
          }))
          continue
        }

        // Update Firestore with Cloudinary data
        const videoRef = doc(db, "videos", video.id)
        // Ensure we only send valid, non-undefined values
        const updateData: any = {}
        
        if (assetData.asset_id) {
          updateData.cloudinaryAssetId = assetData.asset_id
        }
        
        updateData.lastSyncedAt = new Date().toISOString()

        console.log('📝 Updating Firestore with:', updateData)
        console.log('🔍 Asset data received:', {
          asset_id: assetData.asset_id,
          duration: assetData.duration,
          format: assetData.format,
          public_id: assetData.public_id
        })
        console.log('🔍 Full asset data keys:', Object.keys(assetData))
        console.log('🔍 Asset ID specifically:', assetData.asset_id, typeof assetData.asset_id)

        // Double-check no undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            console.error(`❌ Found undefined value for key: ${key}`)
            delete updateData[key]
          }
        })

        console.log('🔄 About to update Firestore document:', video.id)
        await updateDoc(videoRef, updateData)
        console.log('✅ Firestore update completed successfully')
        
        console.log(`✅ Successfully synced: ${video.title}`)
        setSyncResults(prev => ({
          ...prev,
          success: prev.success + 1,
          updated: prev.updated + 1
        }))

      } catch (error) {
        console.error(`❌ Error syncing ${video.title}:`, error)
        setSyncResults(prev => ({
          ...prev,
          failed: prev.failed + 1,
          errors: [...prev.errors, `Error syncing ${video.title}: ${error instanceof Error ? error.message : String(error)}`]
        }))
      }

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setSyncing(false)
    
    toast({
      title: "Filtered Sync Complete",
      description: `Synced ${syncResults.success} videos successfully, ${syncResults.failed} failed`,
    })
  }

  const syncSingleVideo = async (video: Video) => {
    try {
      console.log(`🔄 Syncing single video: ${video.title}`)
      
      const assetData = await fetchCloudinaryAsset(video.publicId)
      
      if (!assetData) {
        toast({
          title: "Sync Failed",
          description: `Failed to fetch asset data for ${video.title}`,
          variant: "destructive"
        })
        return
      }

      // Update Firestore
      const videoRef = doc(db, "videos", video.id)
      
      const updateData = {
        // Only add the Cloudinary asset ID
        cloudinaryAssetId: assetData.asset_id,
        lastSyncedAt: new Date().toISOString(),
      }

      await updateDoc(videoRef, updateData)
      
      toast({
        title: "Sync Successful",
        description: `Successfully synced ${video.title}`,
      })
      
      // Refresh the videos list
      await fetchVideos()
      
    } catch (error) {
      console.error(`Error syncing ${video.title}:`, error)
      toast({
        title: "Sync Failed",
        description: `Failed to sync ${video.title}`,
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/admin-login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/admin-dashboard">
            <img src="/Black logo.png" alt="EOXS Logo" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => router.push("/admin-dashboard")}>
                    <Home className="h-5 w-5" />
                    <span className="sr-only">Dashboard</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Admin Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Cloud className="h-8 w-8 text-primary" />
              Cloudinary Sync
            </h1>
            <p className="text-muted-foreground">
              Sync video metadata from Cloudinary to Firestore database
            </p>
          </div>

          {/* Sync Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Sync Operations
              </CardTitle>
              <CardDescription>
                Pull the latest asset information from Cloudinary and update your Firestore database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  onClick={syncAllVideos} 
                  disabled={syncing || videos.length === 0}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync All Videos'}
                </Button>
                
                <Button 
                  onClick={() => syncFilteredVideos('missing-data')}
                  disabled={syncing || videos.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  Sync Missing Data
                </Button>
                
                <Button 
                  onClick={() => syncFilteredVideos('outdated')}
                  disabled={syncing || videos.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Sync Outdated
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={fetchVideos}
                  disabled={syncing}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Refresh List
                </Button>
              </div>

              {syncing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sync Progress</span>
                    <span>{syncProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}

              {/* Video Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{videos.length}</div>
                  <div className="text-sm text-muted-foreground">Total Videos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {videos.filter(v => !v.format || !v.width || !v.height || !v.fileSize || !v.duration).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Missing Data</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {videos.filter(v => {
                      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      return !v.lastSyncedAt || new Date(v.lastSyncedAt) < oneWeekAgo
                    }).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Outdated</div>
                </div>
              </div>

              {syncResults.total > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total:</span> {syncResults.total}
                      </div>
                      <div className="text-green-600">
                        <span className="font-medium">Success:</span> {syncResults.success}
                      </div>
                      <div className="text-red-600">
                        <span className="font-medium">Failed:</span> {syncResults.failed}
                      </div>
                      <div className="text-blue-600">
                        <span className="font-medium">Updated:</span> {syncResults.updated}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {syncResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Errors encountered:</p>
                      <ul className="text-sm space-y-1">
                        {syncResults.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {syncResults.errors.length > 5 && (
                          <li>... and {syncResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Videos List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Videos in Database ({videos.length})
              </CardTitle>
              <CardDescription>
                Click "Sync" on individual videos to update their metadata from Cloudinary
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No videos found in the database</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {videos.map((video) => (
                    <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{video.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {video.publicId}
                          </Badge>
                          {video.category && (
                            <Badge variant="secondary" className="text-xs">
                              {video.category}
                            </Badge>
                          )}
                          {video.duration && (
                            <span className="text-xs text-muted-foreground">
                              {video.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncSingleVideo(video)}
                        disabled={syncing}
                        className="ml-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
