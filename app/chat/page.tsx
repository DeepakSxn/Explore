"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, Loader2, Send, User, ChevronLeft, Mic, MicOff, Menu, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useAuth } from "../context/AuthContext"
import { db } from "@/firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

export default function ChatPage() {
  const { userData } = useAuth()
  type ChatMessage = { id: string; role: "user" | "assistant"; content: string; videoReferences?: Array<{ videoId: string; title?: string; thumbnail?: string; duration?: string }> }
  const [messages, setMessages] = useState<Array<ChatMessage>>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isListeningRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // init from session
    const saved = sessionStorage.getItem("sparky_thread_id")
    const savedCount = sessionStorage.getItem("sparky_message_count")
    if (saved) setThreadId(saved)
    if (savedCount) setMessageCount(parseInt(savedCount))

    // welcome (same as popup)
    const initialRefs = [
      {
        videoId: "ehskimpirphwekehrzpf",
        title: "Introduction to EOXS",
        thumbnail: "/placeholder.svg?height=120&width=200",
        duration: "5 min",
      },
    ]
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi ${userData?.name || 'there'}! I'm Sparky, your AI learning assistant. I can help you with:\n\n• Learning questions about EOXS\n• Study tips and strategies\n• Course navigation help\n• General questions about the platform\n\nWhen I reference specific videos, I'll show them as clickable links below my responses.\n\nHow can I assist you today?`,
        videoReferences: initialRefs,
      },
    ])

    // Try to resolve reference details if they exist in Firestore
    resolveVideoReferencesForMessage("welcome", initialRefs)
  }, [userData?.name])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput("")
    setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: text }])
    setLoading(true)
    try {
      // rotate thread after 20 messages, like popup
      const newCount = messageCount + 1
      setMessageCount(newCount)
      sessionStorage.setItem("sparky_message_count", String(newCount))
      let currentThread = threadId
      if (newCount >= 20) {
        currentThread = null
        setThreadId(null)
        setMessageCount(0)
        sessionStorage.removeItem("sparky_thread_id")
        sessionStorage.setItem("sparky_message_count", "0")
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: currentThread }),
      })
      const data = await res.json()
      if (data.threadId && data.threadId !== currentThread) {
        setThreadId(data.threadId)
        sessionStorage.setItem("sparky_thread_id", data.threadId)
      }
      const replyText: string = data.reply || "I had trouble replying."
      const aiMessageId = (Date.now() + 1).toString()
      const refs = extractVideoReferences(replyText)
      setMessages((m) => [
        ...m,
        { id: aiMessageId, role: "assistant", content: replyText, videoReferences: refs },
      ])

      if (refs.length > 0) {
        resolveVideoReferencesForMessage(aiMessageId, refs)
      }
    } catch (e) {
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error. Please try again." }])
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

  // Speech to Text (Web Speech API)
  useEffect(() => {
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = (event: any) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          setInput((prev) => (prev ? prev + " " + transcript : transcript))
        } else {
          interim += transcript
        }
      }
    }
    recognition.onend = () => {
      // Auto-restart while the mic toggle is ON
      if (isListeningRef.current) {
        try { recognition.start() } catch {}
      } else {
        setIsListening(false)
      }
    }
    recognition.onerror = () => {
      // Try to continue unless user stopped manually
      if (isListeningRef.current) {
        try { recognition.start() } catch { setIsListening(false) }
      } else {
        setIsListening(false)
      }
    }
    recognitionRef.current = recognition
  }, [])

  const toggleListening = () => {
    const recognition = recognitionRef.current
    if (!recognition) return
    if (isListening) {
      try { recognition.stop() } catch {}
      isListeningRef.current = false
      setIsListening(false)
    } else {
      try { recognition.start(); isListeningRef.current = true; setIsListening(true) } catch {}
    }
  }

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
            setThreadId(null)
            setMessageCount(0)
            sessionStorage.removeItem("sparky_thread_id")
            sessionStorage.setItem("sparky_message_count", "0")
            setMessages([{ id: "welcome", role: "assistant", content: `Hi ${userData?.name || 'there'}! I'm Sparky, your AI learning assistant. I can help you with:\n\n• Learning questions about EOXS\n• Study tips and strategies\n• Course navigation help\n• General questions about the platform\n\nWhen I reference specific videos, I'll show them as clickable links below my responses.\n\nHow can I assist you today?` }])
          }}>
            <Plus className="h-4 w-4 mr-2" /> New chat
          </Button>
        </div>
        <div className="px-3 text-xs text-gray-500">History coming soon…</div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
          <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/Black logo.png" alt="EOXS Logo" className="h-10 w-auto" />
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen((v) => !v)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="ml-auto" />
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
            <Button type="button" variant={isListening ? "secondary" : "outline"} onClick={toggleListening} title="Speech to text">
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={send} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


