"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, orderBy, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, Link2, Play, Users, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface SharedLink {
  token: string
  videoId: string
  videoTitle?: string
  createdAt?: any
}

interface SharedVisit {
  id: string
  token: string
  videoId: string
  videoTitle?: string
  viewerName?: string | null
  createdAt?: any
  lastUpdatedAt?: any
  progress?: number
  completed?: boolean
}

export default function SharedLinksAdminPage() {
  const [links, setLinks] = useState<SharedLink[]>([])
  const [visits, setVisits] = useState<SharedVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = async () => {
    try {
      setLoading(true)
      const linksSnap = await getDocs(query(collection(db, "sharedLinks"), orderBy("createdAt", "desc")))
      const linkItems = linksSnap.docs.map(d => ({ token: d.id, ...(d.data() as any) })) as SharedLink[]

      const visitsSnap = await getDocs(query(collection(db, "sharedVisits"), orderBy("createdAt", "desc")))
      const visitItems = visitsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SharedVisit[]

      setLinks(linkItems)
      setVisits(visitItems)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links
    const s = search.toLowerCase()
    return links.filter(l => (l.videoTitle || "").toLowerCase().includes(s) || l.token.includes(s))
  }, [links, search])

  const filteredVisits = useMemo(() => {
    const withNames = visits.filter(v => typeof v.viewerName === "string" && v.viewerName.trim() !== "")
    if (!search.trim()) return withNames
    const s = search.toLowerCase()
    return withNames.filter(v => (v.videoTitle || "").toLowerCase().includes(s) || (v.viewerName || "").toLowerCase().includes(s) || v.token.includes(s))
  }, [visits, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shared Links Analytics</h1>
          <p className="text-muted-foreground">Track visits and viewing completion for shareable links</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by video, token, or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links" className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Links</TabsTrigger>
          <TabsTrigger value="visits" className="flex items-center gap-2"><Users className="h-4 w-4" /> Visitors</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
                    ) : filteredLinks.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No links</TableCell></TableRow>
                    ) : filteredLinks.map((l) => (
                      <TableRow key={l.token}>
                        <TableCell className="font-medium">{l.videoTitle || l.videoId}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/shared/${l.token}`)
                              toast({ title: "Link copied to clipboard" })
                            }}
                          >
                            Copy Link
                          </Button>
                        </TableCell>
                        <TableCell>{l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000).toLocaleString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Visitor Name</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                    ) : filteredVisits.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No visits yet</TableCell></TableRow>
                    ) : filteredVisits.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.videoTitle || v.videoId}</TableCell>
                        <TableCell>{v.viewerName || "-"}</TableCell>
                        <TableCell>{v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleString() : "-"}</TableCell>
                        <TableCell>{v.lastUpdatedAt?.seconds ? new Date(v.lastUpdatedAt.seconds * 1000).toLocaleString() : "-"}</TableCell>
                        <TableCell>{typeof v.progress === "number" ? `${v.progress}%` : "0%"}</TableCell>
                        <TableCell>{v.completed ? "Completed" : "In Progress"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}