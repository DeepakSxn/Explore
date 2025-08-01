"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/alert-dialog"
import { AlertTriangle, UserX } from "lucide-react"
import { suspendUser } from "../firestore-utils"
import { toast } from "sonner"

interface ManualSuspendUserProps {
  userId: string
  userEmail: string
  userName?: string
  onSuccess?: () => void
}

export default function ManualSuspendUser({ 
  userId, 
  userEmail, 
  userName, 
  onSuccess 
}: ManualSuspendUserProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a suspension reason")
      return
    }

    setConfirmDialogOpen(true)
  }

  const confirmSuspend = async () => {
    try {
      setLoading(true)
      await suspendUser(userId, reason)
      toast.success("User suspended successfully")
      setOpen(false)
      setConfirmDialogOpen(false)
      setReason("")
      onSuccess?.()
    } catch (error) {
      console.error("Error suspending user:", error)
      toast.error("Failed to suspend user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <UserX className="h-4 w-4 mr-2" />
            Suspend
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Suspend User Account
            </DialogTitle>
            <DialogDescription>
              This will manually suspend the user account. The user will not be able to access the platform until unsuspended.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <p className="text-sm text-gray-600">{userName || userEmail}</p>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Suspension Reason *</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for suspending this user..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSuspend} 
              disabled={!reason.trim() || loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-600" />
              Confirm User Suspension
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to manually suspend the account for{" "}
              <strong>{userName || userEmail}</strong>?
              <br /><br />
              <strong>Reason:</strong> {reason}
              <br /><br />
              <strong>This will:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Immediately block the user's access to all content</li>
                <li>Show them the suspension page when they try to log in</li>
                <li>Prevent them from watching videos or accessing features</li>
                <li>Keep their account data but restrict access</li>
              </ul>
              <br />
              <strong>Note:</strong> The user will need to contact support to be unsuspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSuspend}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Suspending..." : "Yes, Suspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 