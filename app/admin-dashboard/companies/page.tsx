"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Building, Edit, Plus, Trash2, Save, X } from "lucide-react"

interface CompanyDoc {
  id: string
  name: string
  normalizedName: string
  createdAt?: any
  updatedAt?: any
}

export default function CompaniesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyDoc[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newCompany, setNewCompany] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/admin-login")
        return
      }
      setUser(currentUser)

      const adminSnapshot = await getDocs(query(collection(db, "admins"), where("userId", "==", currentUser.uid)))
      if (adminSnapshot.empty) {
        router.push("/")
        return
      }
      setIsAdmin(true)
      loadCompanies()
    })

    return () => unsubscribe()
  }, [router])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(collection(db, "companies"))
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as CompanyDoc[]
      items.sort((a, b) => a.name.localeCompare(b.name))
      setCompanies(items)
    } catch (e) {
      console.error("Failed to load companies", e)
      toast({ title: "Error", description: "Failed to load companies", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompany = async () => {
    try {
      const trimmed = newCompany.trim()
      if (!trimmed) return
      const normalized = trimmed.toLowerCase()
      const exists = await getDocs(query(collection(db, "companies"), where("normalizedName", "==", normalized)))
      if (!exists.empty) {
        toast({ title: "Already exists", description: "Company already in list" })
        return
      }
      await addDoc(collection(db, "companies"), {
        name: trimmed,
        normalizedName: normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setNewCompany("")
      setAddOpen(false)
      loadCompanies()
      toast({ title: "Added", description: "Company added" })
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to add company", variant: "destructive" })
    }
  }

  const startEdit = (c: CompanyDoc) => {
    setEditingId(c.id)
    setEditingName(c.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const saveEdit = async () => {
    if (!editingId) return
    const trimmed = editingName.trim()
    if (!trimmed) return
    try {
      const ref = doc(db, "companies", editingId)
      await updateDoc(ref, {
        name: trimmed,
        normalizedName: trimmed.toLowerCase(),
        updatedAt: serverTimestamp(),
      })
      cancelEdit()
      loadCompanies()
      toast({ title: "Updated", description: "Company renamed" })
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to update company", variant: "destructive" })
    }
  }

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, "companies", id))
      loadCompanies()
      toast({ title: "Deleted", description: "Company removed" })
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground mt-2">Manage the company list available during signup.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Company name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCompany}>Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No companies yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" /> {c.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === c.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(c)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteCompany(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
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


