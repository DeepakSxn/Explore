"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Filter
} from "lucide-react"
import { 
  getAllUsersWithSuspensionStatus, 
  unsuspendUser, 
  deleteUser,
  transferUserCompany
} from "../../firestore-utils"
import { toast } from "sonner"
import { toast as uiToast } from "@/components/ui/use-toast"
import ManualSuspendUser from "../../components/ManualSuspendUser"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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

export default function UserManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  
  // Confirmation dialog states
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferCompany, setTransferCompany] = useState("")
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, activeTab])

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
    let filtered = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Filter by tab
    switch (activeTab) {
      case "active":
        filtered = filtered.filter(user => !user.isSuspended)
        break
      case "suspended":
        filtered = filtered.filter(user => user.isSuspended)
        break
      case "manual":
        filtered = filtered.filter(user => user.manuallySuspended)
        break
      case "auto":
        filtered = filtered.filter(user => user.isSuspended && !user.manuallySuspended)
        break
      default:
        // "all" - no additional filtering
        break
    }

    setFilteredUsers(filtered)
  }

  const handleUnsuspend = async (userId: string) => {
    try {
      await unsuspendUser(userId)
      toast.success("User unsuspended successfully")
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error("Error unsuspending user:", error)
      toast.error("Failed to unsuspend user")
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast.success("User deleted successfully")
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user")
    }
  }

  const openUnsuspendDialog = (user: User) => {
    setSelectedUser(user)
    setUnsuspendDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const confirmUnsuspend = async () => {
    if (selectedUser) {
      await handleUnsuspend(selectedUser.userId)
      setUnsuspendDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const confirmDelete = async () => {
    if (selectedUser) {
      await handleDelete(selectedUser.userId)
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return "N/A"
    const date = new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (user: User) => {
    if (user.isSuspended) {
      if (user.manuallySuspended) {
        return <Badge variant="destructive">Manually Suspended</Badge>
      }
      return <Badge variant="secondary">Auto Suspended</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getDaysUntilSuspension = (user: User) => {
    if (user.isSuspended) return 0
    return user.daysUntilSuspension
  }



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const activeUsers = users.filter(u => !u.isSuspended)
  const suspendedUsers = users.filter(u => u.isSuspended)
  const manualSuspensions = users.filter(u => u.manuallySuspended)
  const autoSuspensions = users.filter(u => u.isSuspended && !u.manuallySuspended)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-2">
                Manage all user accounts, view suspension status, and control access
              </p>
            </div>
            <Button onClick={fetchUsers} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeUsers.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {suspendedUsers.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Suspensions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {manualSuspensions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
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

        {/* Users Table with Tabs */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeUsers.length})</TabsTrigger>
                <TabsTrigger value="suspended">Suspended ({suspendedUsers.length})</TabsTrigger>
                <TabsTrigger value="manual">Manual ({manualSuspensions.length})</TabsTrigger>
                <TabsTrigger value="auto">Auto ({autoSuspensions.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date of Account Creation</TableHead>
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
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{formatDate(user.createdAt)}</div>
                          <div className="text-xs text-gray-500">Account created</div>
                        </div>
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
                          {/* Edit Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement edit user functionality
                              uiToast({
                                title: "Edit User",
                                description: "Edit user functionality coming soon",
                              })
                            }}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>

                          {/* Transfer Company Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setTransferCompany("")
                              setTransferOpen(true)
                            }}
                          >
                            Transfer Company
                          </Button>

                          {/* Unsuspend Button (only for suspended users) */}
                          {user.isSuspended && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUnsuspendDialog(user)}
                              className="text-green-600 hover:text-green-700 border-green-200"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            </Button>
                          )}

                          {/* Suspend Button (only for active users) */}
                          {!user.isSuspended && (
                            <ManualSuspendUser
                              userId={user.userId}
                              userEmail={user.email}
                              userName={user.name}
                              onSuccess={fetchUsers}
                            />
                          )}

                          {/* Delete Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="text-red-600 hover:text-red-700 border-red-200"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
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

      {/* Unsuspend Confirmation Dialog */}
      <AlertDialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Unsuspend User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unsuspend the account for{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>?
              <br /><br />
              <strong>This will:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Reactivate the user's access to all content</li>
                <li>Allow them to log in and use the platform normally</li>
                <li>Reset their suspension status</li>
              </ul>
              <br />
              <strong>Note:</strong> If this was an automatic suspension (30-day rule), 
              the account will be suspended again after 30 days unless manually extended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnsuspend}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Unsuspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-600" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to permanently delete the account for{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>?
              <br /><br />
              <strong>⚠️ WARNING: This action cannot be undone!</strong>
              <br /><br />
              <strong>This will permanently:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete the user's account and all associated data</li>
                <li>Remove their access to the platform</li>
                <li>Delete their watch history and feedback</li>
                <li>Remove their profile information</li>
              </ul>
              <br />
              <strong>Consider alternatives:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Suspending the account instead of deleting</li>
                <li>Contacting the user before deletion</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Transfer Company Dialog */}
      <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer User to Another Company</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the destination company name for {selectedUser?.name || selectedUser?.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Target company name (e.g. Gambek LLC)"
              value={transferCompany}
              onChange={(e) => setTransferCompany(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedUser || !transferCompany.trim()) return
                try {
                  setTransferring(true)
                  await transferUserCompany(selectedUser.userId, transferCompany.trim())
                  toast.success("User transferred successfully")
                  setTransferOpen(false)
                  setSelectedUser(null)
                  setTransferCompany("")
                  fetchUsers()
                } catch (e) {
                  console.error(e)
                  toast.error("Failed to transfer user")
                } finally {
                  setTransferring(false)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {transferring ? "Transferring..." : "Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 