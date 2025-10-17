"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, setDoc, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { AlertTriangle, ArrowLeft } from "lucide-react"

interface Video {
  id: string
  title: string
  duration: string
  thumbnailUrl?: string
  publicId?: string
  videoUrl?: string
  description?: string
  category?: string
  tags?: string[]
}

export default function SharedVideoPage() {
  const router = useRouter()
  const params = useParams()
  const token = Array.isArray(params?.token) ? params?.token[0] : (params?.token as string | undefined)
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerName, setViewerName] = useState("")
  const [nameRequired, setNameRequired] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentProgress, setCurrentProgress] = useState(0)

  useEffect(() => {
    const init = async () => {
      if (!token) return
      try {
        setLoading(true)
        const linkRef = doc(db, "sharedLinks", token)
        const linkSnap = await getDoc(linkRef)
        if (!linkSnap.exists()) {
          setError("Invalid or expired link")
          setLoading(false)
          return
        }
        const link = linkSnap.data() as any
        const videoId = link.videoId
        // fetch video by id
        const videoDoc = await getDoc(doc(db, "videos", videoId))
        if (!videoDoc.exists()) {
          setError("Video not found")
          setLoading(false)
          return
        }
        const d: any = videoDoc.data()
        setVideo({
          id: videoDoc.id,
          title: d.title || "Untitled Video",
          duration: d.duration || "0:00",
          thumbnailUrl: d.thumbnailUrl,
          publicId: d.publicId,
          videoUrl: d.videoUrl,
          description: d.description,
          category: d.category,
          tags: d.tags || [],
        })
      } catch (e) {
        console.error(e)
        setError("Failed to load link")
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const submitName = async () => {
    if (!viewerName.trim() || !video || !token) return
    try {
      // Create visit only after name is provided
      const visitRef = doc(collection(db, "sharedVisits"))
      const sid = visitRef.id
      await setDoc(visitRef, {
        token,
        videoId: video.id,
        videoTitle: video.title || "Untitled Video",
        createdAt: serverTimestamp(),
        viewerName: viewerName.trim(),
        startedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        progress: 0,
        completed: false,
      })
      setSessionId(sid)
      setNameRequired(false)
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to save name", variant: "destructive" })
    }
  }

  const handleTimeUpdate = async () => {
    if (!sessionId || !videoRef.current) return
    const current = videoRef.current.currentTime
    const total = videoRef.current.duration || 0
    setCurrentTime(current)
    setDuration(total)
    // throttle by 5s
    if (Math.floor(current) % 5 === 0) {
      try {
        const newProgress = total > 0 ? Math.round((current / total) * 100) : 0
        await updateDoc(doc(db, "sharedVisits", sessionId), {
          lastUpdatedAt: serverTimestamp(),
          progress: Math.max(newProgress, currentProgress || 0),
        })
        setCurrentProgress(Math.max(newProgress, currentProgress || 0))
      } catch {}
    }
  }

  const handleEnded = async () => {
    if (!sessionId) return
    try {
      await updateDoc(doc(db, "sharedVisits", sessionId), {
        lastUpdatedAt: serverTimestamp(),
        completed: true,
        progress: 100,
      })
      setCurrentProgress(100)
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-xl mb-4">{error || "Video not found"}</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4">
              <h1 className="text-xl font-semibold">{video.title}</h1>
              <p className="text-sm text-muted-foreground">Shared Video</p>
            </div>

            {nameRequired ? (
              <div className="max-w-md space-y-3">
                <div className="text-sm">Please enter your name to continue</div>
                <div className="flex gap-2">
                  <Input placeholder="Your name" value={viewerName} onChange={(e) => setViewerName(e.target.value)} />
                  <Button onClick={submitName} disabled={!viewerName.trim()}>Continue</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  className="w-full aspect-video bg-black rounded-lg"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                >
                  <source src={video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="text-xs text-muted-foreground">
                  Progress: {duration > 0 ? Math.round((currentTime / duration) * 100) : 0}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}