"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, Star, Trophy, Zap, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { saveQuizAttempt, getQuizAttemptsForVideo, checkIfVideoWasWatched, type QuizAttempt } from "../firestore-utils"

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface Quiz {
  id: string
  videoId: string
  title: string
  questions: QuizQuestion[]
  xpReward: number
  requiredScore: number
}

interface VideoQuizProps {
  quiz: Quiz
  onComplete: (score: number, totalQuestions: number) => void
  onSkip: () => void
  isOpen: boolean
}

export default function VideoQuiz({ quiz, onComplete, onSkip, isOpen }: VideoQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [isRewatchedVideo, setIsRewatchedVideo] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [loading, setLoading] = useState(false)

  const { completeQuiz } = useGamification()
  const { userData } = useAuth()

  // Check if this is a rewatched video and get attempt number
  useEffect(() => {
    const checkQuizHistory = async () => {
      if (!userData || !isOpen) return
      
      try {
        setLoading(true)
        
        // Check if video was previously watched
        const wasWatched = await checkIfVideoWasWatched(userData.uid, quiz.videoId)
        
        // Get previous quiz attempts
        const previousAttempts = await getQuizAttemptsForVideo(userData.uid, quiz.videoId)
        
        setIsRewatchedVideo(wasWatched)
        setAttemptNumber(previousAttempts.length + 1)
        
      } catch (error) {
        console.error("Error checking quiz history:", error)
      } finally {
        setLoading(false)
      }
    }

    checkQuizHistory()
  }, [userData, quiz.videoId, isOpen])

  const currentQuestion = quiz.questions[currentQuestionIndex]

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return // Prevent multiple selections
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return

    const correct = selectedAnswer === currentQuestion.correctAnswer
    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      setScore(score + 1)
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))

    // Show explanation after a delay
    setTimeout(() => {
      setShowExplanation(true)
    }, 1000)
  }

  const handleNextQuestion = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setShowExplanation(false)
    setIsCorrect(false)

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Quiz completed
      setQuizCompleted(true)
      setShowRewards(true)
      
      // Calculate final score
      const finalScore = score + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0)
      const percentage = (finalScore / quiz.questions.length) * 100
      
      // Calculate XP reward based on rewatch status
      let xpEarned = 0
      if (isRewatchedVideo) {
        // Reduced XP for rewatched videos (50% of original)
        xpEarned = Math.floor(quiz.xpReward * 0.5)
      } else {
        // Full XP for first-time attempts
        xpEarned = quiz.xpReward
      }
      
      // Save quiz attempt to Firestore
      const saveAttempt = async () => {
        if (!userData) return
        
        try {
          // Collect all answers
          const answers = quiz.questions.map((q, index) => ({
            questionId: q.id,
            selectedAnswer: index === currentQuestionIndex ? selectedAnswer! : 0, // Simplified for demo
            correctAnswer: q.correctAnswer,
            isCorrect: index === currentQuestionIndex ? selectedAnswer === q.correctAnswer : false // Simplified for demo
          }))
          
          await saveQuizAttempt({
            videoId: quiz.videoId,
            userId: userData.uid,
            userName: userData.name || "Anonymous",
            userEmail: userData.email || "",
            quizId: quiz.id,
            score: finalScore,
            totalQuestions: quiz.questions.length,
            percentage,
            isFirstAttempt: !isRewatchedVideo,
            isPerfectScore: percentage === 100,
            answers,
            xpEarned,
            rewatchedVideo: isRewatchedVideo,
            attemptNumber
          })
        } catch (error) {
          console.error("Error saving quiz attempt:", error)
        }
      }
      
      saveAttempt()
      
      // Award XP and complete quiz
      completeQuiz(quiz.id, finalScore, quiz.questions.length, isRewatchedVideo)
      
      // Show completion toast with appropriate message
      if (percentage >= quiz.requiredScore) {
        if (isRewatchedVideo) {
          toast({
            title: "Quiz Passed! 🎉",
            description: `You earned ${xpEarned} XP (rewatched video)!`,
          })
        } else {
          toast({
            title: "Quiz Passed! 🎉",
            description: `You earned ${xpEarned} XP!`,
          })
        }
      } else {
        toast({
          title: "Quiz Completed",
          description: "Keep practicing to improve your score!",
        })
      }

      // Call onComplete after a delay
      setTimeout(() => {
        onComplete(finalScore, quiz.questions.length)
      }, 3000)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / quiz.questions.length) * 100
  }

  const getScorePercentage = () => {
    const currentScore = score + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0)
    return (currentScore / quiz.questions.length) * 100
  }

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "Excellent! You're a quiz master!"
    if (percentage >= 80) return "Great job! You really understood the content!"
    if (percentage >= 70) return "Good work! You have a solid understanding."
    if (percentage >= 60) return "Not bad! Keep practicing to improve."
    return "Keep learning! Review the material and try again."
  }

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 90) return <Trophy className="h-8 w-8 text-yellow-500" />
    if (percentage >= 80) return <Star className="h-8 w-8 text-blue-500" />
    if (percentage >= 70) return <CheckCircle className="h-8 w-8 text-green-500" />
    return <Zap className="h-8 w-8 text-orange-500" />
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="relative overflow-hidden">
            {/* Quiz Header */}
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {quiz.title}
                  {isRewatchedVideo && (
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-200 border-orange-300 text-xs">
                      Rewatched
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isRewatchedVideo && (
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-200 border-yellow-300 text-xs">
                      Attempt #{attemptNumber}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    Question {currentQuestionIndex + 1} of {quiz.questions.length}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={getProgressPercentage()} 
                className="h-2 bg-white/20"
              />
            </CardHeader>

            <CardContent className="p-6">
              {!quizCompleted ? (
                <>
                  {/* Question */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      {currentQuestion.question}
                    </h3>
                    
                    {/* Answer Options */}
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={selectedAnswer !== null}
                          className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                            selectedAnswer === index
                              ? isCorrect
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          } ${selectedAnswer !== null ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedAnswer === index
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-red-500 bg-red-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedAnswer === index && (
                                isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-white" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-white" />
                                )
                              )}
                            </div>
                            <span className="font-medium">{option}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  {selectedAnswer !== null && !showResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center"
                    >
                      <Button onClick={handleSubmitAnswer} size="lg">
                        Submit Answer
                      </Button>
                    </motion.div>
                  )}

                  {/* Result Display */}
                  <AnimatePresence>
                    {showResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center mb-6"
                      >
                        <div className="mb-4">
                          {isCorrect ? (
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          ) : (
                            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                          )}
                          <h3 className={`text-lg font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </h3>
                        </div>

                        {/* Explanation */}
                        {currentQuestion.explanation && showExplanation && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-blue-50 p-4 rounded-lg mb-4"
                          >
                            <p className="text-sm text-blue-800">
                              <strong>Explanation:</strong> {currentQuestion.explanation}
                            </p>
                          </motion.div>
                        )}

                        {/* Next Button */}
                        <Button onClick={handleNextQuestion} size="lg">
                          {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                /* Quiz Completion Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="mb-6">
                    {getPerformanceIcon(getScorePercentage())}
                    <h2 className="text-2xl font-bold mt-4 mb-2">Quiz Completed!</h2>
                    <p className="text-lg text-muted-foreground mb-4">
                      {getPerformanceMessage(getScorePercentage())}
                    </p>
                  </div>

                  {/* Score Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {Math.round(getScorePercentage())}%
                    </div>
                    <p className="text-muted-foreground">
                      {score + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0)} out of {quiz.questions.length} correct
                    </p>
                  </div>

                  {/* XP Reward */}
                  <AnimatePresence>
                    {showRewards && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg mb-6"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="h-5 w-5" />
                          <span className="font-bold">+{quiz.xpReward} XP Earned!</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={handleSkip}>
                      Continue Learning
                    </Button>
                    <Button onClick={handleSkip}>
                      Great!
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 