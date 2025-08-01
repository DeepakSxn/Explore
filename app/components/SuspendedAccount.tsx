import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Mail, Clock } from "lucide-react"
import Link from "next/link"

interface SuspendedAccountProps {
  daysUntilSuspension?: number
  suspensionReason?: string
  isManualSuspension?: boolean
}

export default function SuspendedAccount({ daysUntilSuspension, suspensionReason, isManualSuspension }: SuspendedAccountProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Account Suspended</CardTitle>
          <CardDescription className="text-gray-600">
            {isManualSuspension 
              ? "Account suspended by administrator"
              : "Account suspended due to inactivity"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            {isManualSuspension ? (
              <div>
                {suspensionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Suspension Reason:</p>
                    <p className="text-sm text-red-700 mt-1">{suspensionReason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  Your account was created more than 30 days ago and has been automatically suspended.
                </p>
                {daysUntilSuspension !== undefined && daysUntilSuspension > 0 && (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>{daysUntilSuspension} days until suspension</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Contact Support</h4>
                <p className="text-sm text-blue-700 mt-1">
                  To reactivate your account, please contact our support team:
                </p>
                <a 
                  href="mailto:isha@eoxsteam.com" 
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm block mt-2"
                >
                  isha@eoxsteam.com
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              asChild 
              className="w-full"
              variant="outline"
            >
              <Link href="/login">
                Back to Login
              </Link>
            </Button>
            
            <Button 
              asChild 
              className="w-full"
              variant="outline"
            >
              <a href="mailto:isha@eoxsteam.com?subject=Account Reactivation Request">
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 