"use client"

import React, { useState, useEffect } from "react"
import { 
  Trophy, 
  Medal, 
  Crown, 
  Users, 
  TrendingUp, 
  Flame,
  Star,
  Calendar,
  Filter,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { getLeaderboardData } from "../firestore-utils"

interface LeaderboardEntry {
  userId: string
  name: string
  email: string
  company: string
  department: string
  avatar?: string
  totalXP: number
  currentLevel: number
  currentStreak: number
  totalVideosWatched: number
  badgesEarned: number
  achievementsEarned: number
  rank: number
  isCurrentUser: boolean
}

export default function Leaderboard() {
  const { userProgress } = useGamification()
  const { userData } = useAuth()
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [filteredData, setFilteredData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("global")
  const [timeFilter, setTimeFilter] = useState("all-time")
  const [departmentFilter, setDepartmentFilter] = useState("all")

  // Fetch real leaderboard data
  const fetchLeaderboardData = async () => {
    try {
      setLoading(true)
      console.log("Leaderboard component - Fetching leaderboard data...")
      const data = await getLeaderboardData()
      console.log("Leaderboard component - Received data:", data)
      setLeaderboardData(data || [])
      // Don't set filteredData here - let the useEffect handle it
    } catch (error) {
      console.error("Error fetching leaderboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load leaderboard data. Please try again.",
        variant: "destructive"
      })
      setLeaderboardData([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch leaderboard data on component mount
  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  // Mark current user and apply filters in a single useEffect
  useEffect(() => {
    console.log("Leaderboard component - Processing data:", {
      leaderboardDataLength: leaderboardData.length,
      userData: userData,
      departmentFilter,
      timeFilter
    })
    
    if (leaderboardData.length > 0) {
      let processedData = leaderboardData.map(entry => {
        const isCurrentUser = userData ? entry.userId === userData.userId : false
        console.log(`Leaderboard component - User ${entry.name} (${entry.userId}): isCurrentUser = ${isCurrentUser}, userData.userId = ${userData?.userId}`)
        return {
          ...entry,
          isCurrentUser
        }
      })

      console.log("Leaderboard component - Processed data sample:", processedData[0])

      // Filter by company - users only see people from their own company
      if (userData?.companyName) {
        console.log("Leaderboard component - Filtering by company:", userData.companyName)
        console.log("Leaderboard component - Available companies:", [...new Set(processedData.map(entry => entry.company))])
        processedData = processedData.filter(entry => {
          // Try exact match first
          let matches = entry.company === userData.companyName
          
          // If no exact match, try partial match for common variations
          if (!matches && userData.companyName) {
            const userCompany = userData.companyName.toLowerCase()
            const entryCompany = entry.company.toLowerCase()
            
            // Handle common variations
            if (userCompany.includes('eoxs') && entryCompany.includes('eoxs')) {
              matches = true
            } else if (userCompany.includes('3gm') && entryCompany.includes('3gm')) {
              matches = true
            } else if (userCompany.includes('eastern states steel') && entryCompany.includes('eastern states steel')) {
              matches = true
            }
          }
          
          console.log(`Leaderboard component - Entry ${entry.name}: company=${entry.company}, userCompany=${userData.companyName || 'undefined'}, matches=${matches}`)
          return matches
        })
        console.log("Leaderboard component - After company filter:", processedData.length, "entries")
      }

      // Apply department filter
      if (departmentFilter !== "all") {
        processedData = processedData.filter(entry => entry.department === departmentFilter)
        console.log("Leaderboard component - After department filter:", processedData.length, "entries")
      }

      // Apply time filter (mock implementation)
      if (timeFilter === "this-week") {
        processedData = processedData.slice(0, 10) // Show top 10 for this week
      } else if (timeFilter === "this-month") {
        processedData = processedData.slice(0, 15) // Show top 15 for this month
      }

      // Recalculate ranks after filtering (so ranks are company-specific)
      const finalData = processedData
        .sort((a, b) => b.totalXP - a.totalXP)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))

      console.log("Leaderboard component - Final filtered data:", finalData.length, "entries")
      setFilteredData(finalData)
    } else {
      console.log("Leaderboard component - No leaderboard data available")
      setFilteredData([])
    }
  }, [leaderboardData, userData, timeFilter, departmentFilter])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Trophy className="h-5 w-5 text-orange-500" />
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600"
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500"
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600"
    return "bg-muted"
  }

  const refreshLeaderboard = async () => {
    await fetchLeaderboardData()
    toast({
      title: "Leaderboard Updated",
      description: "Latest rankings have been refreshed!",
    })
  }

  const getDepartmentStats = () => {
    const stats = filteredData.reduce((acc, entry) => {
      if (!acc[entry.department]) {
        acc[entry.department] = { count: 0, totalXP: 0, avgLevel: 0 }
      }
      acc[entry.department].count++
      acc[entry.department].totalXP += entry.totalXP
      acc[entry.department].avgLevel += entry.currentLevel
      return acc
    }, {} as Record<string, { count: number; totalXP: number; avgLevel: number }>)

    Object.keys(stats).forEach(dept => {
      stats[dept].avgLevel = Math.round(stats[dept].avgLevel / stats[dept].count)
    })

    return stats
  }

  const departmentStats = getDepartmentStats()

  return (
    <div className="w-full">
      {/* Header */}
              <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <p className="text-sm text-muted-foreground">
              {userData?.companyName ? `${userData.companyName} Rankings` : "Company Rankings"}
            </p>
            {userData?.companyName && (
              <p className="text-xs text-muted-foreground mt-1">
                Showing only {userData.companyName} employees
              </p>
            )}
          </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshLeaderboard}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="global">Global Rankings</TabsTrigger>
            <TabsTrigger value="department">Department Battle</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {Array.from(new Set(leaderboardData.map(entry => entry.department).filter(Boolean))).map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Global Rankings Tab */}
          <TabsContent value="global" className="space-y-4 min-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading leaderboard...</span>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground">There are no users in the system yet.</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-muted-foreground">No users match the current filters.</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDepartmentFilter("all")
                    setTimeFilter("all-time")
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredData.map((entry, index) => (
                  <div
                    key={entry.userId}
                  >
                    <Card className={`${entry.isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBadge(entry.rank)}`}>
                              {getRankIcon(entry.rank)}
                            </div>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={entry.avatar} />
                                <AvatarFallback>
                                  {entry.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{entry.name}</h3>
                                  {entry.isCurrentUser && (
                                    <Badge variant="secondary">You</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{entry.department}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="font-bold">{entry.totalXP.toLocaleString()} XP</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Level {entry.currentLevel}</p>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Flame className="h-4 w-4 text-orange-500" />
                                <span>{entry.currentStreak} days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Department Battle Tab */}
          <TabsContent value="department" className="space-y-6 min-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading department stats...</span>
              </div>
            ) : Object.keys(departmentStats).length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Department Data</h3>
                <p className="text-muted-foreground">No department information available.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(departmentStats).map(([dept, stats]) => (
                  <Card key={dept} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {dept} Team
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Members</span>
                        <span className="font-semibold">{stats.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total XP</span>
                        <span className="font-semibold">{stats.totalXP.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Level</span>
                        <span className="font-semibold">{stats.avgLevel}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Team Score</span>
                          <span className="font-bold text-primary">
                            {Math.round(stats.totalXP / stats.count).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6 min-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading statistics...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Statistics Available</h3>
                <p className="text-muted-foreground">No data available to display statistics.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold">Total Participants</h3>
                    </div>
                    <p className="text-2xl font-bold mt-2">{filteredData.length}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold">Avg XP</h3>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {filteredData.length > 0 ? Math.round(filteredData.reduce((sum, entry) => sum + entry.totalXP, 0) / filteredData.length).toLocaleString() : 0}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <h3 className="font-semibold">Avg Streak</h3>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {filteredData.length > 0 ? Math.round(filteredData.reduce((sum, entry) => sum + entry.currentStreak, 0) / filteredData.length) : 0} days
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-semibold">Top Performer</h3>
                    </div>
                    <p className="text-lg font-semibold mt-2">{filteredData[0]?.name || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">{filteredData[0]?.totalXP.toLocaleString()} XP</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 