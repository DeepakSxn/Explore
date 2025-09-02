"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Building, Users, Mail, Plus, Trash2, UserCheck } from "lucide-react"

interface CompanyAdmin {
  id: string
  companyName: string
  adminEmail: string
  adminName: string
  createdAt: any
  isActive: boolean
}

interface Company {
  name: string
  userCount: number
  normalizedName: string
}

export default function CompanyAdminsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    companyName: "",
    adminEmail: "",
    adminName: ""
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      // Check if user is an admin
      const adminQuery = query(collection(db, "admins"), where("userId", "==", currentUser.uid))
      const adminSnapshot = await getDocs(adminQuery)

      if (adminSnapshot.empty) {
        router.push("/")
        return
      }

      setIsAdmin(true)
      loadData()
    })

    return () => unsubscribe()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load company admins
      const adminsSnapshot = await getDocs(collection(db, "companyAdmins"))
      const admins = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyAdmin[]

      setCompanyAdmins(admins)

      // Load companies from users with case-insensitive grouping
      const usersSnapshot = await getDocs(collection(db, "users"))
      const companyMap = new Map<string, { name: string; userCount: number; originalNames: string[] }>()
      
      usersSnapshot.docs.forEach(doc => {
        const companyName = doc.data().companyName
        if (companyName) {
          // Normalize company name to lowercase for comparison
          const normalizedName = companyName.toLowerCase().trim()
          
          if (companyMap.has(normalizedName)) {
            // Company already exists, increment user count
            const existing = companyMap.get(normalizedName)!
            existing.userCount++
            // Add original name if it's different
            if (!existing.originalNames.includes(companyName)) {
              existing.originalNames.push(companyName)
            }
          } else {
            // New company, initialize
            companyMap.set(normalizedName, {
              name: companyName, // Use the first occurrence as display name
              userCount: 1,
              originalNames: [companyName]
            })
          }
        }
      })

      // Convert to companies list, using the most common or first occurrence as display name
      const companiesList = Array.from(companyMap.values()).map(company => {
        // Choose the best display name (prefer EOXS over eoxs, etc.)
        let displayName = company.name
        
        // If we have multiple variations, choose the most appropriate one
        if (company.originalNames.length > 1) {
          // Prefer all caps (like EOXS)
          const allCaps = company.originalNames.find(name => name === name.toUpperCase())
          if (allCaps) {
            displayName = allCaps
          } else {
            // Prefer title case (like Eoxs)
            const titleCase = company.originalNames.find(name => 
              name.charAt(0) === name.charAt(0).toUpperCase() && 
              name.slice(1) === name.slice(1).toLowerCase()
            )
            if (titleCase) {
              displayName = titleCase
            }
          }
        }
        
        return {
          name: displayName,
          userCount: company.userCount,
          normalizedName: displayName.toLowerCase().trim() // For internal comparison
        }
      }).sort((a, b) => a.name.localeCompare(b.name))

      setCompanies(companiesList)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load company admins data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    try {
      if (!newAdmin.companyName || !newAdmin.adminEmail || !newAdmin.adminName) {
        toast({
          title: "Error",
          description: "Please fill in all fields.",
          variant: "destructive",
        })
        return
      }

      // Check if admin already exists for this company
      const existingAdmin = companyAdmins.find(
        admin => admin.companyName.toLowerCase() === newAdmin.companyName.toLowerCase()
      )

      if (existingAdmin) {
        toast({
          title: "Error",
          description: "An admin already exists for this company.",
          variant: "destructive",
        })
        return
      }

      // Add new company admin
      await addDoc(collection(db, "companyAdmins"), {
        companyName: newAdmin.companyName,
        adminEmail: newAdmin.adminEmail.toLowerCase(),
        adminName: newAdmin.adminName,
        createdAt: new Date(),
        isActive: true
      })

      toast({
        title: "Success",
        description: "Company admin added successfully.",
      })

      setNewAdmin({ companyName: "", adminEmail: "", adminName: "" })
      setAddAdminOpen(false)
      loadData()
    } catch (error) {
      console.error("Error adding admin:", error)
      toast({
        title: "Error",
        description: "Failed to add company admin.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await deleteDoc(doc(db, "companyAdmins", adminId))
      
      toast({
        title: "Success",
        description: "Company admin removed successfully.",
      })

      loadData()
    } catch (error) {
      console.error("Error removing admin:", error)
      toast({
        title: "Error",
        description: "Failed to remove company admin.",
        variant: "destructive",
      })
    }
  }

  const sendTestEmail = async (admin: CompanyAdmin) => {
    try {
      console.log('Sending test email to:', admin);
      
      const response = await fetch('/api/send-weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: admin.companyName,
          adminEmail: admin.adminEmail,
          adminName: admin.adminName,
          isTest: true
        }),
      })

      console.log('Test email response status:', response.status);
      console.log('Test email response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        try {
          const result = await response.json();
          console.log('Test email success:', result);
          toast({
            title: "Success",
            description: result.message || "Test email sent successfully.",
          })
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const textResponse = await response.text();
          console.log('Raw response text:', textResponse);
          toast({
            title: "Warning",
            description: "Email sent but received unexpected response format.",
          })
        }
      } else {
        try {
          const error = await response.json();
          console.error('Test email error:', error);
          toast({
            title: "Error",
            description: error.error || `HTTP ${response.status}: Failed to send test email.`,
            variant: "destructive",
          })
        } catch (jsonError) {
          console.error('Failed to parse error JSON:', jsonError);
          const textResponse = await response.text();
          console.log('Raw error response text:', textResponse);
          toast({
            title: "Error",
            description: `HTTP ${response.status}: Failed to send test email. Check console for details.`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error sending test email:", error)
      toast({
        title: "Error",
        description: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const sendSimpleTestEmail = async (admin: CompanyAdmin) => {
    try {
      console.log('Sending simple test email to:', admin.adminEmail);
      
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: admin.adminEmail
        }),
      })

      console.log('Simple test email response status:', response.status);
      console.log('Simple test email response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        try {
          const result = await response.json();
          console.log('Simple test email success:', result);
          toast({
            title: "Success",
            description: "Simple test email sent successfully.",
          })
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const textResponse = await response.text();
          console.log('Raw response text:', textResponse);
          toast({
            title: "Warning",
            description: "Email sent but received unexpected response format.",
          })
        }
      } else {
        try {
          const error = await response.json();
          console.error('Simple test email error:', error);
          toast({
            title: "Error",
            description: error.error || `HTTP ${response.status}: Failed to send simple test email.`,
            variant: "destructive",
          })
        } catch (jsonError) {
          console.error('Failed to parse error JSON:', jsonError);
          const textResponse = await response.text();
          console.log('Raw error response text:', textResponse);
          toast({
            title: "Error",
            description: `HTTP ${response.status}: Failed to send simple test email. Check console for details.`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error sending simple test email:", error)
      toast({
        title: "Error",
        description: `Failed to send simple test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const checkEmailConfig = async () => {
    try {
      console.log('Checking email configuration...');
      
      const response = await fetch('/api/check-email-config');
      const result = await response.json();
      
      console.log('Email config check result:', result);
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Email configuration is correct.",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Email configuration has issues.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking email config:", error)
      toast({
        title: "Error",
        description: `Failed to check email configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const sendWeeklyReportsToAll = async () => {
    try {
      console.log('Sending weekly reports to all admins...');
      
      const response = await fetch('/api/send-all-weekly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: 'test-secret-123' // Using a test secret for now
        }),
      });

      console.log('Weekly reports response status:', response.status);
      console.log('Weekly reports response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        try {
          const result = await response.json();
          console.log('Weekly reports success:', result);
          toast({
            title: "Success",
            description: `Weekly reports sent to ${result.reportsSent} admins.`,
          })
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const textResponse = await response.text();
          console.log('Raw response text:', textResponse);
          toast({
            title: "Warning",
            description: "Reports sent but received unexpected response format.",
          })
        }
      } else {
        try {
          const error = await response.json();
          console.error('Weekly reports error:', error);
          toast({
            title: "Error",
            description: error.error || `HTTP ${response.status}: Failed to send weekly reports.`,
            variant: "destructive",
          })
        } catch (jsonError) {
          console.error('Failed to parse error JSON:', jsonError);
          const textResponse = await response.text();
          console.log('Raw error response text:', textResponse);
          toast({
            title: "Error",
            description: `HTTP ${response.status}: Failed to send weekly reports. Check console for details.`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error sending weekly reports:", error)
      toast({
        title: "Error",
        description: `Failed to send weekly reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const testWeeklyReportsSystem = async () => {
    try {
      console.log('Testing weekly reports system...');
      
      const response = await fetch('/api/test-weekly-reports');
      const result = await response.json();
      
      console.log('Weekly reports system test result:', result);
      
      if (result.success) {
        toast({
          title: "System Test Success",
          description: `Found ${result.adminsFound} active admins. Check console for details.`,
        })
      } else {
        toast({
          title: "System Test Failed",
          description: result.error || "Weekly reports system test failed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing weekly reports system:", error)
      toast({
        title: "Error",
        description: `Failed to test weekly reports system: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Admins</h1>
          <p className="text-muted-foreground mt-2">
            Manage company admins who receive weekly analytics reports.
          </p>
        </div>
        <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Company Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Company Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company</label>
                <Select
                  value={newAdmin.companyName}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, companyName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {companies.map((company) => (
                      <SelectItem key={company.name} value={company.name}>
                        {company.name} ({company.userCount} users)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Name</label>
                <Input
                  placeholder="Enter admin name"
                  value={newAdmin.adminName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, adminName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Admin Email</label>
                <Input
                  type="email"
                  placeholder="Enter admin email"
                  value={newAdmin.adminEmail}
                  onChange={(e) => setNewAdmin({ ...newAdmin, adminEmail: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddAdminOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAdmin}>
                  Add Admin
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyAdmins.filter(admin => admin.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((total, company) => total + company.userCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {companyAdmins.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No company admins yet</p>
              <p className="text-sm text-muted-foreground">
                Add company admins to start sending weekly analytics reports.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Admin Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {companyAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.companyName}</TableCell>
                    <TableCell>{admin.adminName}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {admin.adminEmail}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {admin.createdAt?.toDate?.() 
                            ? admin.createdAt.toDate().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Unknown'
                          }
                        </div>
                        <div className="text-xs text-gray-500">Admin added</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
  )
} 