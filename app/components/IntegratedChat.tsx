"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send,
  Bot,
  User,
  Loader2,
  Sparkles
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "../context/AuthContext"
import { usePathname } from "next/navigation"

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function IntegratedChat() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [session_Id, setSession_Id] = useState<string | null>(null)
  const WEBHOOK_URL = "https://innovation.eoxs.com/webhook/Ai-chat"
  const pathname = usePathname()

  // Initialize with welcome message and restore from localStorage
  useEffect(() => {
    // Try to restore messages from localStorage first
    const savedMessages = localStorage.getItem('ryan_chat_messages')
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDates)
        return
      } catch (error) {
        console.error('Error parsing saved messages:', error)
      }
    }

    // If no saved messages, show welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'ai',
      content: `Hi ${userData?.name || 'there'}! I'm Ryan, your AI learning assistant. I can help you with:\n\n• Learning questions about EOXS\n• Study tips and strategies\n• Course navigation help\n• General questions about the platform\n\nHow can I assist you today?`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [userData?.name])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ryan_chat_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      // Scroll the messages container to bottom without affecting page scroll
      const container = messagesContainerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  // Persist thread data
  useEffect(() => {
    const saved = sessionStorage.getItem("ryan_thread_id")
    const savedCount = sessionStorage.getItem("ryan_message_count")
    if (saved) setThreadId(saved)
    if (savedCount) setMessageCount(parseInt(savedCount))
  }, [])

  // Clear thread and messages when user logs out
  useEffect(() => {
    if (!userData) {
      setThreadId(null)
      setMessageCount(0)
      setMessages([])
      sessionStorage.removeItem("ryan_thread_id")
      sessionStorage.removeItem("ryan_message_count")
      localStorage.removeItem("ryan_chat_messages")
    }
  }, [userData])

  // Reset session_Id on route changes (dashboard navigation)
  useEffect(() => {
    setSession_Id(null)
    try { sessionStorage.removeItem('ryan_session_Id') } catch {}
  }, [pathname])

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
    setIsLoading(true)

    // Check if we need to create a new thread (after 20 messages)
    const newMessageCount = messageCount + 1
    setMessageCount(newMessageCount)
    sessionStorage.setItem("ryan_message_count", newMessageCount.toString())
    
    if (newMessageCount >= 20) {
      // Reset session_Id and message count per requirement
      setSession_Id(null)
      setMessageCount(0)
      sessionStorage.setItem("ryan_message_count", "0")
    }

    try {
      // Send to webhook with session_Id + text
      const payload = { session_Id: session_Id ?? null, text: userMessage.content }
      try { console.log('[RYAN-CHAT] Sending', { url: WEBHOOK_URL, payload }) } catch {}
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Request failed: ${res.status} ${errorText}`)
      }
      
      const contentType = res.headers.get('content-type') || ''
      const raw = await res.text()
      let data: any = null
      if (raw && contentType.toLowerCase().includes('application/json')) {
        try { data = JSON.parse(raw) } catch { throw new Error('Invalid JSON in webhook response') }
      } else if (raw) {
        data = { session_Id, output: raw }
      } else {
        throw new Error('Empty response body from webhook')
      }
      const returnedSessionId: string | undefined = data?.session_Id
      if (returnedSessionId && returnedSessionId !== session_Id) {
        setSession_Id(returnedSessionId)
        try { sessionStorage.setItem('ryan_session_Id', returnedSessionId) } catch {}
      }

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
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: sanitizeAiContent(data.output || "No response from AI"),
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="w-full h-[500px] flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          Chat with Ryan
          <span className="text-sm font-normal text-muted-foreground ml-auto">AI Assistant</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
        {/* Messages Container - Fixed Height with Scroll */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 mb-4 pr-2 scroll-smooth"
          style={{ 
            scrollBehavior: 'smooth',
            maxHeight: 'calc(500px - 140px)' // Account for header and input area
          }}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg px-3 py-2 min-w-0 flex-1 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gray-100 rounded-lg px-3 py-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Ryan is thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Ryan anything about your learning..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
