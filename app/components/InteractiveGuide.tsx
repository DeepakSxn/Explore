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

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface InteractiveGuideProps {
  onAction?: (action: string) => void
}

export default function InteractiveGuide({ onAction }: InteractiveGuideProps) {
  const { userProgress } = useGamification()
  const { userData } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize with welcome message
  useEffect(() => {
    if (isExpanded && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        content: `Hi ${userData?.name || 'there'}! I'm Sparky, your AI learning assistant. I can help you with:\n\n• Learning questions about EOXS\n• Study tips and strategies\n• Course navigation help\n• General questions about the platform\n\nHow can I assist you today?`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isExpanded, messages.length, userData?.name])

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

    try {
      // Simulate AI response - replace with actual AI API call
      const aiResponse = await generateAIResponse(inputValue.trim())
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
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

  const generateAIResponse = async (userInput: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    const input = userInput.toLowerCase()
    
    // Contextual responses based on user input
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! Great to see you! How can I help you with your EOXS learning journey today?"
    }
    
    if (input.includes('help') || input.includes('what can you do')) {
      return "I'm here to help you with:\n\n• Understanding EOXS concepts and workflows\n• Finding specific videos or modules\n• Study strategies and learning tips\n• Platform navigation and features\n• General questions about the system\n\nWhat would you like to know more about?"
    }
    
    if (input.includes('video') || input.includes('watch') || input.includes('learning')) {
      return "Great question! Here are some learning tips:\n\n• Start with the Company Introduction module for basics\n• Watch videos in sequence for better understanding\n• Take quizzes after videos to reinforce learning\n• Use the progress tracking to monitor your advancement\n• Set daily learning goals to maintain your streak\n\nWhich module are you currently working on?"
    }
    
    if (input.includes('sales') || input.includes('order')) {
      return "The Sales module covers important topics like:\n\n• Sales order processing for different materials\n• Handling backorders and partial deliveries\n• Buyout processes in the system\n• Customer relationship management\n\nWould you like me to explain any specific sales concept in detail?"
    }
    
    if (input.includes('inventory') || input.includes('stock')) {
      return "Inventory management is crucial! Key areas include:\n\n• Material traceability with heat numbers\n• FIFO and average costing methods\n• Scrap management and valuation\n• Real-time inventory tracking\n\nWhat specific inventory topic would you like to explore?"
    }
    
    if (input.includes('finance') || input.includes('accounting')) {
      return "Finance & Accounting covers:\n\n• Customer and vendor invoicing\n• Accounts payable and receivable\n• Multi-stage invoicing for complex orders\n• Financial reporting and P&L statements\n• Tax compliance and multi-currency transactions\n\nWhich financial aspect interests you most?"
    }
    
    if (input.includes('processing') || input.includes('work order')) {
      return "Processing operations include:\n\n• Applying processing costs to materials\n• Toll processing purchase orders\n• Work order status tracking\n• Multiple processing line management\n\nAre you looking for information on a specific processing workflow?"
    }
    
    if (input.includes('streak') || input.includes('motivation')) {
      return "Maintaining your learning streak is awesome! Here's how:\n\n• Watch at least one video daily\n• Set reminders for consistent learning\n• Celebrate small wins and progress\n• Use the gamification features to stay engaged\n• Remember: consistency beats perfection!\n\nWhat's your current streak goal?"
    }
    
    if (input.includes('level') || input.includes('xp') || input.includes('experience')) {
      return "Leveling up is exciting! Here's how to earn XP:\n\n• Complete videos (base XP)\n• Take quizzes after videos (bonus XP)\n• Maintain daily streaks (streak bonuses)\n• Leave feedback on videos\n• Complete learning milestones\n\nKeep pushing forward - every bit of progress counts!"
    }
    
    if (input.includes('quiz') || input.includes('test')) {
      return "Quizzes are excellent for learning! Benefits include:\n\n• Reinforcing video content\n• Earning bonus XP\n• Testing your understanding\n• Identifying areas for review\n• Building confidence in your knowledge\n\nTry to complete quizzes after each video for maximum learning!"
    }
    
    if (input.includes('badge') || input.includes('achievement')) {
      return "Badges are earned through various achievements:\n\n• First video completion\n• Learning streaks\n• Quiz mastery\n• Module completion\n• Consistent engagement\n\nThey're great motivators and show your progress. Which badge are you working toward?"
    }
    
    if (input.includes('thank') || input.includes('thanks')) {
      return "You're very welcome! I'm here to support your learning journey. Feel free to ask me anything about EOXS, learning strategies, or the platform. Good luck with your studies!"
    }
    
    // Default response for unrecognized inputs
    return "That's an interesting question! While I'm designed to help with EOXS learning and platform questions, I can also provide general study tips and motivation. Could you rephrase your question or ask something specific about the EOXS system or your learning progress?"
  }

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
    setIsExpanded(!isExpanded)
  }



  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Chat Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="relative"
      >
        <Button
          onClick={handleExpand}
          className="h-16 w-16 rounded-full shadow-lg bg-green-500 hover:bg-green-600"
          variant="default"
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </Button>
      </motion.div>

      {/* Expanded Chat Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-96 h-[500px]"
          >
            <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-purple-50 h-full flex flex-col">
              <CardContent className="p-4 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Sparky</h3>
                      <p className="text-xs text-muted-foreground">AI Learning Assistant</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.type === 'ai' && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-lg px-3 py-2 text-sm ${
                          message.type === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          <div className="whitespace-pre-line">{message.content}</div>
                        </div>
                        <div className={`text-xs text-muted-foreground mt-1 ${
                          message.type === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {message.type === 'user' && (
                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 justify-start"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
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
                    placeholder="Ask me anything about EOXS..."
                    className="flex-1 text-sm"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>


              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 