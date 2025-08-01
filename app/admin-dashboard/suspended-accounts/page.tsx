"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Unlock, 
  Clock, 
  Mail, 
  Calendar,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { 
  getAllUsersWithSuspensionStatus, 
  unsuspendUser, 
  deleteUser, 
  updateSuspensionReason 
} from "../../firestore-utils"
import { toast } from "sonner"

interface User {
  id: string
  userId: string
  email: string
  name?: string
  createdAt?: { seconds: number; nanoseconds: number }
  isSuspended: boolean
  daysUntilSuspension: number
  manuallySuspended?: boolean
  suspendedAt?: { seconds: number; nanoseconds: number }
  suspensionReason?: string
}

export default function SuspendedAccountsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editReason, setEditReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await getAllUsersWithSuspensionStatus()
      setUsers(allUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    const filtered = users.filter(user => 
      user.isSuspended && (
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    setFilteredUsers(filtered)
  }

  const handleUnsuspend = async (userId: string) => {
    try {
      setActionLoading(userId)
      await unsuspendUser(userId)
      toast.success("User unsuspended successfully")
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error("Error unsuspending user:", error)
      toast.error("Failed to unsuspend user")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      setActionLoading(userId)
      await deleteUser(userId)
      toast.success("User deleted successfully")
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateReason = async () => {
    if (!selectedUser || !editReason.trim()) return

    try {
      setActionLoading(selectedUser.userId)
      await updateSuspensionReason(selectedUser.userId, editReason)
      toast.success("Suspension reason updated successfully")
      fetchUsers() // Refresh the list
      setSelectedUser(null)
      setEditReason("")
    } catch (error) {
      console.error("Error updating suspension reason:", error)
      toast.error("Failed to update suspension reason")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp.seconds * 1000).toLocaleDateString()
  }

  const getSuspensionType = (user: User) => {
    if (user.manuallySuspended) {
      return <Badge variant="destructive">Manual</Badge>
    }
    return <Badge variant="secondary">Auto (30 days)</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Suspended Accounts</h1>
              <p className="text-gray-600 mt-2">
                Manage suspended user accounts and their access permissions
              </p>
            </div>
            <Button onClick={fetchUsers} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suspended</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredUsers.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Suspensions</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {filteredUsers.filter(u => u.manuallySuspended).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto Suspensions</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredUsers.filter(u => !u.manuallySuspended).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Suspended Users</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No suspended users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Suspension Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Suspended</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name || "N/A"}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSuspensionType(user)}
                      </TableCell>
                      <TableCell>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        {user.suspendedAt ? formatDate(user.suspendedAt) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {user.suspensionReason || "No reason provided"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setEditReason(user.suspensionReason || "")
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Suspension Reason</DialogTitle>
                                <DialogDescription>
                                  Update the reason for suspending this user account.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">User</label>
                                  <p className="text-sm text-gray-600">{user.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Reason</label>
                                  <Textarea
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    placeholder="Enter suspension reason..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleUpdateReason}
                                  disabled={!editReason.trim() || actionLoading === user.userId}
                                >
                                                                      {actionLoading === user.userId ? "Updating..." : "Update Reason"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnsuspend(user.userId)}
                                                          disabled={actionLoading === user.userId}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user account
                                  and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.userId)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 