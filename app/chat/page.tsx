"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Bot, Loader2, Send, User, ChevronLeft, Menu, Plus, LogOut, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useAuth } from "../context/AuthContext"
import { auth, db } from "@/firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

export default function ChatPage() {
  const { userData } = useAuth()
  type ChatMessage = { id: string; role: "user" | "assistant"; content: string; videoReferences?: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> }
  const [messages, setMessages] = useState<Array<ChatMessage>>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messageCount, setMessageCount] = useState(0)

  // Webhook session handling
  const [session_Id, setSession_Id] = useState<string | null>(null)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const WEBHOOK_URL = "https://innovation.eoxs.com/webhook/Ai-chat"

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset session on page load and route changes per requirement
  useEffect(() => {
    setSession_Id(null)
    // Optionally clear any persisted value to guarantee refresh per navigation
    try {
      sessionStorage.removeItem("webhook_session_Id")
    } catch {}
  }, [pathname])

  useEffect(() => {
    // welcome (no initial video references)
    const initialRefs: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> = []
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi ${userData?.name || 'there'}! I'm Ryan, How can I help you :`,
        videoReferences: initialRefs,
      },
    ])
  }, [userData?.name])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput("")
    setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: text }])
    setLoading(true)
    try {
      // rotate session after 20 messages (keeps parity with previous UX)
      const newCount = messageCount + 1
      setMessageCount(newCount)
      if (newCount >= 20) {
        setSession_Id(null)
        setMessageCount(0)
      }

      const payload = {
        session_Id: session_Id ?? null,
        text,
      }

      if (!WEBHOOK_URL) {
        throw new Error("Webhook URL not configured (NEXT_PUBLIC_CHAT_WEBHOOK_URL)")
      }

      // Logging request
      try { console.log("[CHAT] Sending to webhook", { url: WEBHOOK_URL, payload }) } catch {}

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      // Log basic response info
      try { console.log("[CHAT] Webhook response status", res.status, res.statusText) } catch {}
      const contentType = res.headers.get("content-type") || ""
      try { console.log("[CHAT] Webhook response content-type", contentType) } catch {}

      // Read raw text once, then try parse JSON
      const raw = await res.text()
      try { console.log("[CHAT] Webhook raw response", raw) } catch {}

      if (!res.ok) {
        throw new Error(raw || `Webhook error ${res.status}`)
      }

      let data: any = null
      if (raw && contentType.toLowerCase().includes("application/json")) {
        try {
          data = JSON.parse(raw)
        } catch (e) {
          // JSON parse failed
          throw new Error("Invalid JSON in webhook response")
        }
      } else if (raw) {
        // Non-JSON but non-empty body; pass through as output
        data = { session_Id: session_Id, output: raw }
      } else {
        // Empty body
        throw new Error("Empty response body from webhook")
      }

      // Expected response: { session_Id: string, output: string }
      const returnedSessionId: string | undefined = data?.session_Id
      const replyText: string = data?.output || "I had trouble replying."

      if (returnedSessionId && returnedSessionId !== session_Id) {
        setSession_Id(returnedSessionId)
        try { sessionStorage.setItem("webhook_session_Id", returnedSessionId) } catch {}
      }

      const aiMessageId = (Date.now() + 1).toString()
      const refs = extractVideoReferences(replyText)
      setMessages((m) => [
        ...m,
        { id: aiMessageId, role: "assistant", content: replyText, videoReferences: refs },
      ])

      if (refs.length > 0) {
        resolveVideoReferencesForMessage(aiMessageId, refs)
      }
    } catch (e: any) {
      try { console.error("[CHAT] Webhook error", e) } catch {}
      const msg = e?.message || "Network error. Please try again."
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "assistant", content: msg }])
    } finally {
      setLoading(false)
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
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, videoReferences: updated } : m)))
  }

  const openVideo = (videoId: string) => {
    const url = `/video-player-clean?videoId=${videoId}&autoplay=true`
    try {
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      window.location.href = url
    }
  }
  
  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  const [isRefreshing, setIsRefreshing] = useState(false)

  return (
    <div className="min-h-screen bg-lightgreen-50 flex">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col border-r bg-white transition-all ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Conversations</span>
          <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(false)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button className="w-full justify-start" variant="secondary" onClick={() => {
            setSession_Id(null)
            setMessageCount(0)
            setMessages([{ id: "welcome", role: "assistant", content: `Hi ${userData?.name || 'there'}! I'm Ryan, How can I help you :` }])
          }}>
            <Plus className="h-4 w-4 mr-2" /> New chat
          </Button>
        </div>
        <div className="px-3 text-xs text-gray-500">History coming soon…</div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50 shadow-sm">
        {/* Animated top loading bar */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 top-loading-bar">
            <div className="progress"></div>
          </div>
        )}
        <div className="flex items-center justify-between w-full max-w-screen-2xl pt-3 mx-auto px-6">
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
              onClick={() => router.push("/dashboard")}
            />
            <div className="hidden md:block">
            </div>
          </div>
          <div className="flex items-center gap-3">
          <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/dashboard")}
              className="hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>          

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

        {/* Messages */}
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" ? (
                    <div className="max-w-[85%]">
                      <div className="whitespace-pre-line leading-relaxed text-gray-800">{m.content}</div>
                      {m.videoReferences && m.videoReferences.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-2">Referenced Videos:</div>
                          <div className="space-y-2">
                            {m.videoReferences.map((v, i) => (
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
                    <>
                      <Card className={`max-w-[85%] px-4 py-3 ${m.role === "user" ? "bg-green-100 text-gray-900 border border-green-200" : "bg-white"}`}>
                        <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
                      </Card>
                      <div className="mt-1 rounded-full bg-gray-700 text-white p-2"><User className="h-4 w-4" /></div>
                    </>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Sparky is thinking...</div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        </main>

        {/* Composer */}
        <div className="sticky bottom-0 border-t bg-white/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Send a message"
            />
            <Button onClick={send} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


