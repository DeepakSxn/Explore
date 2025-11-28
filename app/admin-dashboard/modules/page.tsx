"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import type { User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, SortAsc, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { saveModuleOrder, getAllModuleOrders, getAllModuleDisplayNames, saveModuleDisplayName } from "@/app/firestore-utils"

interface Module {
  name: string
  category: string
  totalDuration: string
  videoCount: number
}

// Minimal shape of video documents we read from Firestore
interface FirestoreVideoDoc {
  id: string
  category?: string
  duration?: number
}

interface ModuleOrder {
  moduleName: string
  category: string
  order: number
}

export default function ModulesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [orderedModules, setOrderedModules] = useState<ModuleOrder[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [moduleOrders, setModuleOrders] = useState<Record<string, number>>({})
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({})
  const [renameCategory, setRenameCategory] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>("")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)
    })

    loadModules()
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    loadModuleOrders()
    ;(async () => setDisplayNames(await getAllModuleDisplayNames()))()
  }, [])

  const loadModules = async () => {
    try {
      setIsLoading(true)
      const videosSnapshot = await getDocs(collection(db, "videos"))
      const videos: FirestoreVideoDoc[] = videosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }))

      // Group videos by category to create modules
      const videosByCategory = videos.reduce((acc, video) => {
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      }, {} as Record<string, any[]>)

      // Create module objects
      const moduleArray: Module[] = []
      Object.entries(videosByCategory).forEach(([category, videos]) => {
        // Skip only Company Introduction category, include AI tools
        if (category === "Company Introduction") {
          return
        }

        const totalMinutes = videos.reduce((sum, video) => {
          const duration = video.duration || 0
          return sum + duration
        }, 0)

        const moduleName = category.includes("Module") ? `${category} Overview` : `${category} Module Overview`
        
        moduleArray.push({
          name: moduleName,
          category: category,
          totalDuration: `${Math.ceil(totalMinutes / 60)} mins`,
          videoCount: videos.length
        })
      })

      setModules(moduleArray)
    } catch (error) {
      console.error("Error loading modules:", error)
      toast({
        title: "Error",
        description: "Failed to load modules",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadModuleOrders = async () => {
    try {
      const orders = await getAllModuleOrders()
      setModuleOrders(orders)
    } catch (error) {
      console.error("Error loading module orders:", error)
    }
  }

  const handleRefresh = () => {
    loadModules()
    loadModuleOrders()
    ;(async () => setDisplayNames(await getAllModuleDisplayNames()))()
  }

  // Display helper to remove "Overview" but preserve original names for ordering/keys
  const getDisplayModuleName = (name: string): string => {
    // Replace trailing "Module Overview" with "Module", or plain trailing "Overview"
    const withoutModuleOverview = name.replace(/\s*Module\s*Overview$/i, " Module")
    return withoutModuleOverview.replace(/\s*Overview$/i, "")
  }

  const openOrderDialog = () => {
    // Initialize ordered modules with current order or default order
    const initialOrder = modules.map((module, index) => ({
      moduleName: module.name,
      category: module.category,
      order: moduleOrders[module.category] || index
    }))
    
    // Sort by current order
    initialOrder.sort((a, b) => a.order - b.order)
    setOrderedModules(initialOrder)
    setIsOrderDialogOpen(true)
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    setOrderedModules(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return next
      
      // Swap the order values
      const tempOrder = next[index].order
      next[index].order = next[target].order
      next[target].order = tempOrder
      
      // Sort by order to maintain visual consistency
      return next.sort((a, b) => a.order - b.order)
    })
  }

  const saveOrder = async () => {
    try {
      console.log("Saving module order:", orderedModules)
      await Promise.all(
        orderedModules.map((item) => saveModuleOrder(item.category, item.order))
      )
      
      const newOrders: Record<string, number> = {}
      orderedModules.forEach((item) => {
        newOrders[item.category] = item.order
      })
      setModuleOrders(newOrders)
      
      toast({ 
        title: "Order saved", 
        description: "Module order updated successfully" 
      })
      setIsOrderDialogOpen(false)
    } catch (e) {
      console.error("Error saving module order:", e)
      toast({ 
        title: "Failed to save order", 
        variant: "destructive" 
      })
    }
  }

  // Sort modules by their order
  const sortedModules = [...modules].sort((a, b) => {
    const orderA = moduleOrders[a.category] ?? Number.MAX_SAFE_INTEGER
    const orderB = moduleOrders[b.category] ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Modules</h1>
        <div className="flex gap-2">
          <Button variant="default" onClick={openOrderDialog}>
            <SortAsc className="h-4 w-4 mr-2" /> Set Module Order
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Module Name</TableHead>
              <TableHead>Category</TableHead>
           
              <TableHead>Videos</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedModules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No modules found
                </TableCell>
              </TableRow>
            ) : (
              sortedModules.map((module, index) => (
                <TableRow key={module.name}>
                  <TableCell className="font-medium">
                    {moduleOrders[module.category] !== undefined ? moduleOrders[module.category] + 1 : index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{displayNames[module.category] || getDisplayModuleName(module.name)}</TableCell>
                  <TableCell>{module.category}</TableCell>
                  
                  <TableCell>{module.videoCount}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => {
                      setRenameCategory(module.category)
                      setRenameValue(displayNames[module.category] || getDisplayModuleName(module.name))
                    }}>Rename</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Module Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Module Order</DialogTitle>
            <DialogDescription>
              Arrange modules in the desired sequence. Top appears first in the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto border rounded">
            {orderedModules.map((moduleOrder, idx) => {
              const module = modules.find(m => m.name === moduleOrder.moduleName)
              if (!module) return null
              
              return (
                <div
                  key={moduleOrder.moduleName}
                  className={`flex items-center justify-between px-3 py-2 border-b last:border-b-0 ${
                    dragIndex === idx ? "bg-gray-50" : ""
                  }`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragIndex === null || dragIndex === idx) return
                    
                    setOrderedModules(prev => {
                      const next = [...prev]
                      const [moved] = next.splice(dragIndex, 1)
                      next.splice(idx, 0, moved)
                      
                      // Reassign order values
                      next.forEach((item, index) => {
                        item.order = index
                      })
                      
                      return next
                    })
                    setDragIndex(idx)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                    <span className="w-6 text-xs text-gray-500">{idx + 1}</span>
                    <div className="text-sm font-medium">{getDisplayModuleName(module.name)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === orderedModules.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOrder}>Save Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Module Dialog */}
      <Dialog open={!!renameCategory} onOpenChange={(open) => { if (!open) { setRenameCategory(null); setRenameValue("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Module</DialogTitle>
            <DialogDescription>
              Set a display name for this module. This only changes how it appears to users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={renameCategory || ''} disabled />
            <Label>Display name</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="e.g., Sales" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenameCategory(null); setRenameValue('') }}>Cancel</Button>
            <Button onClick={async () => {
              if (!renameCategory) return
              await saveModuleDisplayName(renameCategory, renameValue.trim())
              setDisplayNames(await getAllModuleDisplayNames())
              setRenameCategory(null)
              setRenameValue('')
              toast({ title: 'Saved', description: 'Module display name updated.' })
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
