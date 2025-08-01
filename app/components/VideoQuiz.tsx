"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, Star, Trophy, Zap, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useGamification } from "../context/GamificationContext"
import { toast } from "@/components/ui/use-toast"

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

  const { completeQuiz } = useGamification()

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
      
      // Award XP and complete quiz
      completeQuiz(quiz.id, finalScore, quiz.questions.length)
      
      // Show completion toast
      if (percentage >= quiz.requiredScore) {
        toast({
          title: "Quiz Passed! 🎉",
          description: `You earned ${quiz.xpReward} XP!`,
        })
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
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
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
                </CardTitle>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </Badge>
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