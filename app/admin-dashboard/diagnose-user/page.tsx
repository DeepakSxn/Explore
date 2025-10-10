"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Loader2,
  Database,
  User,
  Video,
  BarChart3
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface DiagnosisResult {
  success: boolean
  diagnosis?: {
    userEmail: string
    timestamp: string
    userDocuments: any[]
    videoWatchEvents: any[]
    userProgress: any[]
    issues: Array<{
      type: string
      severity: 'high' | 'medium' | 'low'
      message: string
      impact: string
    }>
    recommendations: string[]
  }
  summary?: {
    canAppearInUserManagement: boolean
    canAppearInIndividualAnalytics: boolean
    hasDataConsistencyIssues: boolean
    totalIssues: number
    criticalIssues: number
  }
  error?: string
}

interface FixResult {
  success: boolean
  message?: string
  fixes?: Array<{
    type: string
    message: string
    details: any
  }>
  verification?: any
  error?: string
}

export default function DiagnoseUserPage() {
  const [userEmail, setUserEmail] = useState("eddie@ppcmetals.com")
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)

  const handleDiagnose = async () => {
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "User email is required",
        variant: "destructive"
      })
      return
    }

    setIsDiagnosing(true)
    setResult(null)

    try {
      const response = await fetch('/api/diagnose-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: userEmail.trim()
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "Diagnosis Complete",
          description: `Found ${data.summary?.totalIssues || 0} issues for ${userEmail}`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to diagnose user",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error diagnosing user:', error)
      setResult({
        success: false,
        error: "Network error occurred while diagnosing user"
      })
      toast({
        title: "Error",
        description: "Network error occurred while diagnosing user",
        variant: "destructive"
      })
    } finally {
      setIsDiagnosing(false)
    }
  }

  const handleFix = async () => {
    if (!userEmail.trim() || !result?.diagnosis?.videoWatchEvents?.length) {
      toast({
        title: "Error",
        description: "Cannot fix: No video events found or invalid user email",
        variant: "destructive"
      })
      return
    }

    // Get the correct userId from video events
    const correctUserId = result.diagnosis.videoWatchEvents[0].userId
    
    if (!correctUserId) {
      toast({
        title: "Error",
        description: "Cannot determine correct userId from video events",
        variant: "destructive"
      })
      return
    }

    setIsFixing(true)
    setFixResult(null)

    try {
      const response = await fetch('/api/fix-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          correctUserId: correctUserId
        })
      })

      const data = await response.json()
      setFixResult(data)

      if (data.success) {
        toast({
          title: "Fix Applied Successfully",
          description: `User data has been fixed for ${userEmail}`,
        })
        
        // Re-run diagnosis to verify the fix
        setTimeout(() => {
          handleDiagnose()
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fix user data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fixing user data:', error)
      setFixResult({
        success: false,
        error: "Network error occurred while fixing user data"
      })
      toast({
        title: "Error",
        description: "Network error occurred while fixing user data",
        variant: "destructive"
      })
    } finally {
      setIsFixing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />
      case 'medium': return <AlertCircle className="h-4 w-4" />
      case 'low': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Diagnose User Data
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze user data across all collections to identify why they might not appear in analytics
          </p>
        </div>

        {/* Diagnosis Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>
                <div className="flex gap-2">
                <Button 
                  onClick={handleDiagnose} 
                  disabled={isDiagnosing || isFixing}
                  className="flex items-center gap-2"
                >
                  {isDiagnosing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Diagnosing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Diagnose
                    </>
                  )}
                </Button>
                
                {result?.summary?.hasDataConsistencyIssues && (
                  <Button 
                    onClick={handleFix} 
                    disabled={isFixing || isDiagnosing}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    {isFixing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Auto-Fix Issues
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fix Results */}
        {fixResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {fixResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Fix Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fixResult.success ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Success!</strong> {fixResult.message}
                    </AlertDescription>
                  </Alert>
                  
                  {fixResult.fixes && (
                    <div className="space-y-2">
                      <Label>Applied Fixes:</Label>
                      {fixResult.fixes.map((fix, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <div className="font-medium text-green-800">{fix.message}</div>
                          <div className="text-sm text-green-600 mt-1">
                            Type: {fix.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {fixResult.verification && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Verification Results:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Will appear in User Management:</span>
                          <Badge variant={fixResult.verification.willAppearInUserManagement ? "default" : "destructive"}>
                            {fixResult.verification.willAppearInUserManagement ? "✓" : "✗"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Will appear in Individual Analytics:</span>
                          <Badge variant={fixResult.verification.willAppearInIndividualAnalytics ? "default" : "destructive"}>
                            {fixResult.verification.willAppearInIndividualAnalytics ? "✓" : "✗"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {fixResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            {result.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Diagnosis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">User Management</span>
                      {result.summary.canAppearInUserManagement ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Individual Analytics</span>
                      {result.summary.canAppearInIndividualAnalytics ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Total Issues</span>
                      <Badge variant={result.summary.totalIssues > 0 ? "destructive" : "default"}>
                        {result.summary.totalIssues}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Critical Issues</span>
                      <Badge variant={result.summary.criticalIssues > 0 ? "destructive" : "default"}>
                        {result.summary.criticalIssues}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issues */}
            {result.diagnosis?.issues && result.diagnosis.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Issues Found ({result.diagnosis.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.diagnosis.issues.map((issue, index) => (
                      <Alert key={index} variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{issue.message}</span>
                              <Badge variant={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <AlertDescription className="text-sm text-gray-600">
                              <strong>Impact:</strong> {issue.impact}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.diagnosis?.recommendations && result.diagnosis.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.diagnosis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">{index + 1}.</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Data Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    User Documents ({result.diagnosis?.userDocuments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.diagnosis?.userDocuments?.length === 0 ? (
                    <p className="text-gray-500 text-sm">No user documents found</p>
                  ) : (
                    <div className="space-y-3">
                      {result.diagnosis?.userDocuments?.map((doc, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                          <div className="font-medium">Document ID: {doc.documentId}</div>
                          <div>Email: {doc.email}</div>
                          <div>User ID: {doc.userId}</div>
                          <div>Name: {doc.name || 'N/A'}</div>
                          <div>Company: {doc.companyName || 'N/A'}</div>
                          <Badge variant="outline" className="mt-1">
                            Found via: {doc.source}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Watch Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="h-4 w-4" />
                    Video Events ({result.diagnosis?.videoWatchEvents?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.diagnosis?.videoWatchEvents?.length === 0 ? (
                    <p className="text-gray-500 text-sm">No video watch events found</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {result.diagnosis?.videoWatchEvents?.slice(0, 5).map((event, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                          <div className="font-medium">Event ID: {event.documentId}</div>
                          <div>User ID: {event.userId}</div>
                          <div>User Email: {event.userEmail}</div>
                          <div>Video: {event.videoTitle || event.videoId}</div>
                          <div>Completed: {event.completed ? 'Yes' : 'No'}</div>
                          <Badge variant="outline" className="mt-1">
                            Found via: {event.source}
                          </Badge>
                        </div>
                      ))}
                      {result.diagnosis?.videoWatchEvents && result.diagnosis.videoWatchEvents.length > 5 && (
                        <p className="text-gray-500 text-sm">
                          ... and {result.diagnosis.videoWatchEvents.length - 5} more events
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4" />
                    User Progress ({result.diagnosis?.userProgress?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.diagnosis?.userProgress?.length === 0 ? (
                    <p className="text-gray-500 text-sm">No user progress found</p>
                  ) : (
                    <div className="space-y-3">
                      {result.diagnosis?.userProgress?.map((progress, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                          <div className="font-medium">Document ID: {progress.documentId}</div>
                          <div>User ID: {progress.userId}</div>
                          <div>Total XP: {progress.totalXP || 0}</div>
                          <div>Level: {progress.currentLevel || 1}</div>
                          <div>Videos Watched: {progress.totalVideosWatched || 0}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {result && !result.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {result.error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
