"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Edit, Plus, RefreshCw, Save, Trash2, Trophy } from "lucide-react"
import { getChallenges, createChallenge, deleteChallenge, updateChallengeStatus, Challenge } from "@/app/firestore-utils"
import { motion } from "framer-motion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

export default function ChallengeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // New challenge form state
  const [newChallenge, setNewChallenge] = useState<any>({
    title: "",
    description: "",
    type: "weekly",
    category: "videos",
    target: 5,
    reward: {
      xp: 300,
      badge: "",
      title: ""
    },
    isActive: true
  })

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Check if user is an admin
        const adminQuery = query(collection(db, "admins"), where("userId", "==", currentUser.uid))
        const adminSnapshot = await getDocs(adminQuery)

        if (adminSnapshot.empty) {
          // Not an admin, redirect to home
          router.push("/")
        } else {
          setIsAdmin(true)
          fetchChallenges()
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/admin-login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      const challengesData = await getChallenges()
      setChallenges(challengesData)
    } catch (error) {
      console.error("Error fetching challenges:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChallenge = async () => {
    try {
      setFormError(null)
      
      // Validate form
      if (!newChallenge.title || !newChallenge.description) {
        setFormError("Title and description are required")
        return
      }

      // Set dates
      const startDate = new Date()
      const endDate = new Date()
      
      // Default to 7 days for weekly challenges
      if (newChallenge.type === "weekly") {
        endDate.setDate(endDate.getDate() + 7)
      } else {
        endDate.setDate(endDate.getDate() + 30) // 30 days for other types
      }
      
      const challengeData = {
        ...newChallenge,
        startDate,
        endDate,
        participants: [],
        leaderboard: [],
        isCompleted: false
      }
      
      await createChallenge(challengeData)
      setIsCreateDialogOpen(false)
      fetchChallenges()
      
      // Reset form
      setNewChallenge({
        title: "",
        description: "",
        type: "weekly",
        category: "videos",
        target: 5,
        reward: {
          xp: 300,
          badge: "",
          title: ""
        },
        isActive: true
      })
    } catch (error) {
      console.error("Error creating challenge:", error)
      setFormError("Failed to create challenge. Please try again.")
    }
  }

  const handleDeleteChallenge = async () => {
    if (!deleteTargetId) return
    
    try {
      setDeleteError(null)
      await deleteChallenge(deleteTargetId)
      fetchChallenges()
      setDeleteTargetId(null)
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting challenge:", error)
      setDeleteError("Failed to delete challenge. Please try again.")
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setStatusUpdating(true)
      await updateChallengeStatus(id, !currentStatus)
      fetchChallenges()
    } catch (error) {
      console.error("Error updating challenge status:", error)
    } finally {
      setStatusUpdating(false)
    }
  }

  const refreshChallenges = async () => {
    setRefreshing(true)
    await fetchChallenges()
    setRefreshing(false)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return 'Invalid Date'
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }



  return (
    <div className="container py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Trophy className="h-6 w-6 mr-2 text-primary" />
          Challenge Management
        </h1>

        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={refreshChallenges} 
            disabled={refreshing} 
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 btn-enhanced"
          >
            <Plus className="h-4 w-4" />
            Create Challenge
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All Challenges</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <motion.div 
            className="grid grid-cols-1 gap-6" 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {challenges.length > 0 ? (
              challenges.map((challenge) => (
                <ChallengeCard 
                  key={challenge.id} 
                  challenge={challenge} 
                  onDelete={(id) => {
                    setDeleteTargetId(id)
                    setIsDeleteDialogOpen(true)
                  }}
                  onToggleStatus={handleToggleStatus}
                  statusUpdating={statusUpdating}
                  formatDate={formatDate}
                />
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No challenges found</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="active">
          <motion.div 
            className="grid grid-cols-1 gap-6" 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {challenges.filter(c => c.isActive).length > 0 ? (
              challenges
                .filter(challenge => challenge.isActive)
                .map((challenge) => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge} 
                    onDelete={(id) => {
                      setDeleteTargetId(id)
                      setIsDeleteDialogOpen(true)
                    }}
                    onToggleStatus={handleToggleStatus}
                    statusUpdating={statusUpdating}
                    formatDate={formatDate}
                  />
                ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No active challenges found</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="inactive">
          <motion.div 
            className="grid grid-cols-1 gap-6" 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {challenges.filter(c => !c.isActive).length > 0 ? (
              challenges
                .filter(challenge => !challenge.isActive)
                .map((challenge) => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge} 
                    onDelete={(id) => {
                      setDeleteTargetId(id)
                      setIsDeleteDialogOpen(true)
                    }}
                    onToggleStatus={handleToggleStatus}
                    statusUpdating={statusUpdating}
                    formatDate={formatDate}
                  />
                ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No inactive challenges found</p>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Create Challenge Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Challenge</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {formError}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title">Challenge Title</Label>
                <Input 
                  id="title" 
                  value={newChallenge.title} 
                  onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})} 
                  placeholder="e.g., Video Marathon Challenge"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={newChallenge.description} 
                  onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})} 
                  placeholder="Describe what users need to do to complete this challenge"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Challenge Type</Label>
                  <Select 
                    value={newChallenge.type}
                    onValueChange={(value) => setNewChallenge({...newChallenge, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newChallenge.category}
                    onValueChange={(value) => setNewChallenge({...newChallenge, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modules">Modules</SelectItem>
                      <SelectItem value="videos">Videos</SelectItem>
                      <SelectItem value="quizzes">Quizzes</SelectItem>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="xp">XP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target">Target to Complete</Label>
                  <Input 
                    id="target" 
                    type="number" 
                    value={newChallenge.target} 
                    onChange={(e) => setNewChallenge({...newChallenge, target: parseInt(e.target.value)})} 
                  />
                </div>

                <div>
                  <Label htmlFor="xp">XP Reward</Label>
                  <Input 
                    id="xp" 
                    type="number" 
                    value={newChallenge.reward.xp} 
                    onChange={(e) => setNewChallenge({
                      ...newChallenge, 
                      reward: {...newChallenge.reward, xp: parseInt(e.target.value)}
                    })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="badge">Badge Name (Optional)</Label>
                  <Input 
                    id="badge" 
                    value={newChallenge.reward.badge} 
                    onChange={(e) => setNewChallenge({
                      ...newChallenge, 
                      reward: {...newChallenge.reward, badge: e.target.value}
                    })} 
                    placeholder="e.g., Video Expert"
                  />
                </div>

                <div>
                  <Label htmlFor="title">Badge Title (Optional)</Label>
                  <Input 
                    id="badgeTitle" 
                    value={newChallenge.reward.title} 
                    onChange={(e) => setNewChallenge({
                      ...newChallenge, 
                      reward: {...newChallenge.reward, title: e.target.value}
                    })} 
                    placeholder="e.g., Video Master"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  checked={newChallenge.isActive} 
                  onCheckedChange={(checked) => setNewChallenge({...newChallenge, isActive: checked})}
                />
                <Label>Active Challenge</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChallenge} className="ml-2">Create Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Challenge Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Challenge</DialogTitle>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {deleteError}
              </AlertDescription>
            </Alert>
          )}
          <div className="py-4">
            <p>Are you sure you want to delete this challenge? This action cannot be undone.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              All related participation records will also be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteChallenge} className="ml-2">Delete Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type ChallengeCardProps = {
  challenge: Challenge
  onDelete: (id: string) => void
  onToggleStatus: (id: string, currentStatus: boolean) => void
  statusUpdating: boolean
  formatDate: (date: any) => string
}

function ChallengeCard({ challenge, onDelete, onToggleStatus, statusUpdating, formatDate }: ChallengeCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={`border-l-4 ${challenge.isActive ? 'border-l-green-500' : 'border-l-gray-300'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {challenge.title}
            {challenge.isCompleted && <Badge variant="secondary">Completed</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={challenge.isActive ? "default" : "outline"}>
              {challenge.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{challenge.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <div className="text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{challenge.type}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Category</div>
              <div className="font-medium capitalize">{challenge.category}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Target</div>
              <div className="font-medium">{challenge.target}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Reward</div>
              <div className="font-medium">{challenge.reward.xp} XP</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Start Date</div>
              <div className="font-medium">{formatDate(challenge.startDate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">End Date</div>
              <div className="font-medium">{formatDate(challenge.endDate)}</div>
            </div>
          </div>

          <div className="mt-4 text-sm">
            <div className="text-muted-foreground">Participants</div>
            <div className="font-medium">{challenge.participants.length} users</div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onToggleStatus(challenge.id, challenge.isActive)}
              disabled={statusUpdating}
            >
              {challenge.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(challenge.id)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}