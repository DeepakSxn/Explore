"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  X, 
  Sparkles, 
  Send,
  Bot,
  User,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { db } from "@/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  videoReferences?: VideoReference[]
}

interface VideoReference {
  videoId: string
  title?: string
  thumbnail?: string
  duration?: string
}

interface InteractiveGuideProps {
  onAction?: (action: string) => void
}

export default function InteractiveGuide({ onAction }: InteractiveGuideProps) {
  const { userProgress } = useGamification()
  const { userData, loading: authLoading } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize with welcome message
  useEffect(() => {
    console.log("Setting welcome message, messages length:", messages.length)
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'ai',
      content: `Hi ${userData?.name || 'there'}! I'm Sparky, your AI learning assistant. I can help you with:\n\n• Learning questions about EOXS\n• Study tips and strategies\n• Course navigation help\n• General questions about the platform\n\nWhen I reference specific videos, I'll show them as clickable links below my responses.\n\nHow can I assist you today?`,
      timestamp: new Date(),
      videoReferences: [
        {
          videoId: "ehskimpirphwekehrzpf",
          title: "Introduction to EOXS",
          thumbnail: "/placeholder.svg?height=120&width=200",
          duration: "5 min"
        }
      ]
    }
    setMessages([welcomeMessage])
  }, [userData?.name])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isExpanded])

  // Persist a thread id so every message stays in context per session
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)

  useEffect(() => {
    const saved = sessionStorage.getItem("sparky_thread_id")
    const savedCount = sessionStorage.getItem("sparky_message_count")
    if (saved) setThreadId(saved)
    if (savedCount) setMessageCount(parseInt(savedCount))
  }, [])

  // Clear thread when user logs out
  useEffect(() => {
    if (!userData) {
      // User has logged out, clear thread data
      setThreadId(null)
      setMessageCount(0)
      sessionStorage.removeItem("sparky_thread_id")
      sessionStorage.removeItem("sparky_message_count")
      console.log("User logged out, cleared thread data")
    }
  }, [userData])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    console.log("Setting loading to true")
    setIsLoading(true)

    // Check if we need to create a new thread (after 20 messages)
    const newMessageCount = messageCount + 1
    setMessageCount(newMessageCount)
    sessionStorage.setItem("sparky_message_count", newMessageCount.toString())
    
    let currentThreadId = threadId
    if (newMessageCount >= 20) {
      // Reset thread and message count
      currentThreadId = null
      setThreadId(null)
      setMessageCount(0)
      sessionStorage.removeItem("sparky_thread_id")
      sessionStorage.setItem("sparky_message_count", "0")
      console.log("Creating new thread after 20 messages")
    }

    try {
      console.log("Sending message to API:", userMessage.content, "Thread ID:", currentThreadId)
      
      // Call our serverless endpoint which talks to OpenAI Assistants
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, threadId: currentThreadId }),
      })
      
      console.log("API Response status:", res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error("API Error:", errorText)
        throw new Error(`Request failed: ${res.status} ${errorText}`)
      }
      
      const data = await res.json()
      console.log("API Response data:", data)
      
      if (data.threadId && data.threadId !== currentThreadId) {
        setThreadId(data.threadId)
        sessionStorage.setItem("sparky_thread_id", data.threadId)
      }

      const newMessageId = (Date.now() + 1).toString()
      const sanitizeAiContent = (raw: string): string => {
        if (!raw) return ""
        
        // Remove technical reference lines
        const lines = raw.split(/\r?\n/)
        const cleaned = lines.filter((line) => {
          const t = line.trim()
          
          // Remove video reference headers
          if (/^This is the reference of the video:/i.test(t)) return false
          if (/^Video reference:/i.test(t)) return false
          if (/^Reference:/i.test(t)) return false
          
          // Remove standalone IDs (20+ alphanumeric characters)
          if (/^[a-zA-Z0-9]{20,}\.?$/.test(t)) return false
          
          // Remove topic ID patterns
          if (/^Topic ID:/i.test(t)) return false
          if (/^Topic: [a-zA-Z0-9]{20,}/i.test(t)) return false
          if (/^Related topic video ID:/i.test(t)) return false
          if (/^Related topic:/i.test(t)) return false
          
          // Remove video ID patterns
          if (/^Video ID:/i.test(t)) return false
          if (/^Video: [a-zA-Z0-9]{20,}/i.test(t)) return false
          if (/^Related video ID:/i.test(t)) return false
          
          // Remove technical metadata lines
          if (/^ID:/i.test(t)) return false
          if (/^Reference ID:/i.test(t)) return false
          
          // Remove lines with long IDs in parentheses
          if (/\([a-zA-Z0-9]{20,}\)/i.test(t)) return false
          
          // Remove PDF reference patterns
          if (/\[[0-9]+:[0-9]+\+?[^\]]*\.pdf\]/i.test(t)) return false
          if (/\[[0-9]+:[0-9]+[^\]]*\.pdf\]/i.test(t)) return false
          if (/\[[0-9]+:[0-9]+\+[^\]]*\]/i.test(t)) return false
          
          // Remove empty lines that might be left after filtering
          if (t === "") return false
          
          return true
        })
        
        // Clean up the content further
        let result = cleaned.join("\n").trim()
        
        // Remove any remaining technical patterns within text
        result = result.replace(/Topic ID: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/Video ID: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/Reference ID: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/ID: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/Related topic video ID: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/Related topic: [a-zA-Z0-9]{20,}/gi, "")
        result = result.replace(/Related video ID: [a-zA-Z0-9]{20,}/gi, "")
        
        // Remove parenthetical explanations with long IDs
        result = result.replace(/\([^)]*[a-zA-Z0-9]{20,}[^)]*\)/g, "")
        
        // Remove PDF reference patterns within text
        result = result.replace(/\[[0-9]+:[0-9]+\+?[^\]]*\.pdf\]/gi, "")
        result = result.replace(/\[[0-9]+:[0-9]+[^\]]*\.pdf\]/gi, "")
        result = result.replace(/\[[0-9]+:[0-9]+\+[^\]]*\]/gi, "")
        
        // Clean up multiple consecutive newlines
        result = result.replace(/\n\s*\n\s*\n/g, "\n\n")
        
        return result
      }
      const aiMessage: ChatMessage = {
        id: newMessageId,
        type: 'ai',
        content: sanitizeAiContent(data.reply || "No response from AI"),
        timestamp: new Date(),
        videoReferences: extractVideoReferences(data.reply || "")
      }

      setMessages(prev => [...prev, aiMessage])

      // Resolve human-friendly titles for referenced videos asynchronously
      if (aiMessage.videoReferences && aiMessage.videoReferences.length > 0) {
        resolveVideoReferencesForMessage(newMessageId, aiMessage.videoReferences)
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      console.log("Setting loading to false")
      setIsLoading(false)
    }
  }

  // Extract video references from AI responses - find probable IDs
  const extractVideoReferences = (content: string): VideoReference[] => {
    const videoRefs: VideoReference[] = []
    
    // Look for video IDs in the format: tqurzenwnlhmobbu23uz
    // But be more selective - only extract if they appear in a context that suggests they're video references
    const videoIdRegex = /([a-zA-Z0-9]{20,})/g
    const matches = content.match(videoIdRegex)
    
    if (matches) {
      matches.forEach(match => {
        // Check if it looks like a video ID (20+ characters, alphanumeric)
        // And make sure it's not part of a technical reference line that should be filtered
        if (match.length >= 20 && /^[a-zA-Z0-9]+$/.test(match)) {
          // Check if this ID appears in a context that suggests it's a video reference
          const contextBefore = content.substring(Math.max(0, content.indexOf(match) - 50), content.indexOf(match))
          const contextAfter = content.substring(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 50)
          
          // Only include if it's not in a technical reference context
          const isTechnicalContext = /(video|topic|reference)\s*(id|reference)?\s*:?\s*$/i.test(contextBefore) ||
                                   /^[:\s]*$/i.test(contextAfter)
          
          if (!isTechnicalContext) {
            videoRefs.push({
              videoId: match,
              title: undefined,
              thumbnail: `/placeholder.svg?height=120&width=200`,
              duration: ""
            })
          }
        }
      })
    }
    
    return videoRefs
  }

  // Manual video reference function - more reliable
  const addVideoReference = (videoId: string, title?: string) => {
    const videoRef: VideoReference = {
      videoId,
      title: title || `Video ${videoId.substring(0, 8)}...`,
      thumbnail: `/placeholder.svg?height=120&width=200`,
      duration: "5 min"
    }
    
    // Add to current AI message if it exists
    setMessages(prev => {
      const newMessages = [...prev]
      const lastMessage = newMessages[newMessages.length - 1]
      
      if (lastMessage && lastMessage.type === 'ai') {
        lastMessage.videoReferences = [...(lastMessage.videoReferences || []), videoRef]
      }
      
      return newMessages
    })
  }

  // Handle video opening: open in a new tab and request autoplay
  const openVideo = (videoId: string) => {
    console.log("Attempting to open video:", videoId)
    const url = `/video-player-clean?videoId=${videoId}&autoplay=true`
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error("Opening new tab failed:", error)
      // Fallback to same-tab navigation if popup blocked
      window.location.href = url
    }
  }

  // Fetch video details from Firestore by document id or by Cloudinary publicId
  const fetchVideoDetails = async (videoId: string): Promise<VideoReference | null> => {
    try {
      // 1) Try as Firestore document id
      const byDocRef = doc(db, "videos", videoId)
      const byDocSnap = await getDoc(byDocRef)
      if (byDocSnap.exists()) {
        const data: any = byDocSnap.data()
        return {
          videoId,
          title: data.title || undefined,
          thumbnail: data.thumbnailUrl || (data.cloudinaryAssetId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${data.cloudinaryAssetId}.jpg` : data.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${data.publicId}.jpg` : `/placeholder.svg?height=120&width=200`),
          duration: data.duration || ""
        }
      }

      // 2) Fallback: search by asset ID
      const videosCol = collection(db, "videos")
      const qByAssetId = query(videosCol, where("cloudinaryAssetId", "==", videoId))
      const assetIdSnap = await getDocs(qByAssetId)
      if (!assetIdSnap.empty) {
        const d = assetIdSnap.docs[0].data() as any
        return {
          videoId,
          title: d.title || undefined,
          thumbnail: d.thumbnailUrl || (d.cloudinaryAssetId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.cloudinaryAssetId}.jpg` : d.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.publicId}.jpg` : `/placeholder.svg?height=120&width=200`),
          duration: d.duration || ""
        }
      }

      // 3) Final fallback: search by publicId
      const qByPublicId = query(videosCol, where("publicId", "==", videoId))
      const qSnap = await getDocs(qByPublicId)
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data() as any
        return {
          videoId,
          title: d.title || undefined,
          thumbnail: d.thumbnailUrl || (d.cloudinaryAssetId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.cloudinaryAssetId}.jpg` : d.publicId ? `https://res.cloudinary.com/dnx1sl0nq/video/upload/${d.publicId}.jpg` : `/placeholder.svg?height=120&width=200`),
          duration: d.duration || ""
        }
      }

      return null
    } catch (error) {
      console.error("Error fetching video details:", error)
      return null
    }
  }

  // Resolve and update a specific message's video references with real titles
  const resolveVideoReferencesForMessage = async (messageId: string, refs: VideoReference[]) => {
    try {
      const updatedRefs = await Promise.all(
        refs.map(async (ref) => {
          const details = await fetchVideoDetails(ref.videoId)
          return details ? { ...ref, ...details } : ref
        })
      )
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, videoReferences: updatedRefs } : m)))
    } catch (e) {
      console.error("Failed to resolve video titles:", e)
    }
  }

  // remove simulated generator - now handled by API

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
  }

  const handleExpand = () => {
    console.log("Chat button clicked, current state:", isExpanded)
    setIsExpanded(!isExpanded)
    
    // Test: Add a test message if this is the first time opening
    if (!isExpanded && messages.length === 0) {
      console.log("First time opening chat, adding test message")
      const testMessage: ChatMessage = {
        id: 'test',
        type: 'ai',
        content: 'Test message to verify chat is working!',
        timestamp: new Date()
      }
      setMessages([testMessage])
    }
  }



  console.log("Rendering InteractiveGuide, isExpanded:", isExpanded, "messages length:", messages.length, "isLoading:", isLoading, "authLoading:", authLoading)
  
  // Don't render until auth is loaded
  if (authLoading) {
    return null
  }
  return null
} 
