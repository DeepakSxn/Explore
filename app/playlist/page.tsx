"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ListMusic, ArrowLeft, Trash2 } from "lucide-react"
import { getAllModuleOrders } from "../firestore-utils"

export default function PlaylistPage() {
  const [playlistVideos, setPlaylistVideos] = useState<any[]>([])
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const [confirmRemoveCategory, setConfirmRemoveCategory] = useState<string | null>(null)
  const [moduleOrders, setModuleOrders] = useState<Record<string, number>>({})
  const router = useRouter()

  // Desired module ordering to match the dashboard
  const MODULE_ORDER = [
    "Sales",
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
    "QA",
  ]

  useEffect(() => {
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.videos)) {
          setPlaylistVideos(parsed.videos.filter((v: any) => v.category !== "Company Introduction"))
        }
      } catch {}
    }
  }, [])

  // Load module orders from admin settings
  useEffect(() => {
    const loadModuleOrders = async () => {
      try {
        const orders = await getAllModuleOrders()
        setModuleOrders(orders)
      } catch (error) {
        console.error("Error loading module orders:", error)
      }
    }
    loadModuleOrders()
  }, [])

  // Group playlist videos by their module/category for display
  const videosByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    playlistVideos.forEach((v) => {
      const category = v.category || "Uncategorized"
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(v)
    })
    return grouped
  }, [playlistVideos])

  const sortedCategories = useMemo(() => {
    const categories = Object.keys(videosByCategory)
    const indexOf = (c: string) => {
      // First check if admin has defined order for this category
      const moduleName = c.includes("Module") ? `${c} Overview` : `${c} Module Overview`
      const adminOrder = moduleOrders[moduleName]
      if (adminOrder !== undefined) {
        return adminOrder
      }
      
      // Fallback to hardcoded MODULE_ORDER
      const idx = MODULE_ORDER.findIndex((m) => m.toLowerCase() === c.toLowerCase())
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
    }
    return categories.sort((a, b) => {
      const ia = indexOf(a)
      const ib = indexOf(b)
      if (ia === ib) return a.localeCompare(b)
      return ia - ib
    })
  }, [videosByCategory, moduleOrders])

  const handleRemove = (id: string) => {
    setConfirmRemoveId(id)
  }

  const confirmRemove = () => {
    if (!confirmRemoveId) return
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.videos)) {
          const updated = parsed.videos.filter((v: any) => v.id !== confirmRemoveId)
          parsed.videos = updated
          localStorage.setItem("currentPlaylist", JSON.stringify(parsed))
          setPlaylistVideos(updated.filter((v: any) => v.category !== "Company Introduction"))
        }
      } catch {}
    }
    setConfirmRemoveId(null)
  }

  const confirmRemoveAllVideos = () => {
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        parsed.videos = []
        localStorage.setItem("currentPlaylist", JSON.stringify(parsed))
        setPlaylistVideos([])
      } catch {}
    }
    setConfirmRemoveAll(false)
  }

  const confirmRemoveModule = () => {
    if (!confirmRemoveCategory) return
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.videos)) {
          const updated = parsed.videos.filter((v: any) => v.category !== confirmRemoveCategory)
          parsed.videos = updated
          localStorage.setItem("currentPlaylist", JSON.stringify(parsed))
          setPlaylistVideos(updated.filter((v: any) => v.category !== "Company Introduction"))
        }
      } catch {}
    }
    setConfirmRemoveCategory(null)
  }

  const handleWatchPlaylist = () => {
    if (playlistVideos.length > 0) {
      const firstVideoId = playlistVideos[0].id
      router.push(`/video-player?playlistId=custom-playlist&videoId=${firstVideoId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center px-4 shadow-sm">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/Black logo.png" alt="EOXS Logo" className="h-8 w-auto" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center pt-14 pb-4">
        <div className="w-full max-w-lg animate-fade-in-up">
          <Button variant="outline" className="mb-2 flex items-center gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 shadow">
              <ListMusic className="w-10 h-10 text-green-600" />
            </div>
            <div className="flex items-center justify-between w-full mb-2">
              <h2 className="text-3xl font-bold tracking-tight">My Playlist</h2>
              {playlistVideos.length > 0 && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => setConfirmRemoveAll(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove All
                </Button>
              )}
            </div>
            {playlistVideos.length === 0 ? (
              <div className="text-gray-500 mt-4">No videos selected</div>
            ) : (
              <>
                <div className="w-full space-y-4 mb-4">
                  {sortedCategories.map((category) => (
                    <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-green-600 text-white font-semibold text-sm flex items-center justify-between">
                        <span>{category} Module</span>
                        <button
                          title="Remove entire module from playlist"
                          className="text-white/90 hover:text-white p-1 rounded hover:bg-white/10"
                          onClick={() => setConfirmRemoveCategory(category)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <ul className="divide-y">
                        {videosByCategory[category].map((video: any) => (
                          <li key={video.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-white hover:bg-green-50 transition">
                            <span className="truncate font-medium text-gray-800">{video.title}</span>
                            <button
                              className="ml-2 text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
                              title="Remove from playlist"
                              onClick={() => handleRemove(video.id)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <Button className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleWatchPlaylist} disabled={playlistVideos.length === 0}>
                  Watch Playlist
                </Button>
              </>
            )}
            {confirmRemoveId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                  <p className="mb-4 text-center">Are you sure you want to remove this video from your playlist?</p>
                  <div className="flex gap-2">
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmRemove}>Remove</Button>
                    <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {confirmRemoveAll && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                  <p className="mb-4 text-center">Remove all videos from your playlist?</p>
                  <div className="flex gap-2">
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmRemoveAllVideos}>Remove All</Button>
                    <Button variant="outline" onClick={() => setConfirmRemoveAll(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {confirmRemoveCategory && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                  <p className="mb-4 text-center">Remove all videos in the "{confirmRemoveCategory}" module?</p>
                  <div className="flex gap-2">
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmRemoveModule}>Remove Module</Button>
                    <Button variant="outline" onClick={() => setConfirmRemoveCategory(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 