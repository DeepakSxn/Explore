"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Send, Video, ChevronsUpDown, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from "firebase/firestore"

export default function ExploreUploadPage() {
const router = useRouter()
const [name, setName] = useState("")
const [videoId, setVideoId] = useState("")
const [transcript, setTranscript] = useState("")
const [submitting, setSubmitting] = useState(false)
const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
const [message, setMessage] = useState("")
  const [videos, setVideos] = useState<Array<{ docId: string; title: string; videoId: string; transcriptUploaded: boolean }>>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState("")

useEffect(() => {
const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
if (!currentUser) {
router.push("/admin-login")
}
})
return () => unsubscribe()
}, [router])

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoadingVideos(true)
        const q = query(
          collection(db, "videos"),
          orderBy("title"),
          limit(500)
        )
        const snap = await getDocs(q)
        const rows: Array<{ docId: string; title: string; videoId: string; transcriptUploaded: boolean }> = []
        snap.forEach((d) => {
          const data = d.data() as any
          const titleVal = data?.title ?? "Untitled"
          const computedId = (typeof data?.videoId === "string" && data.videoId.trim()) ? data.videoId.trim() : (typeof data?.publicId === "string" ? data.publicId.trim() : "")
          const transcriptUploaded = data?.["Transcript-upload"] === true
          if (computedId.length > 0) {
            rows.push({ docId: d.id, title: titleVal, videoId: computedId, transcriptUploaded })
          }
        })
        // Sort alphabetically by title for easier selection
        rows.sort((a, b) => a.title.localeCompare(b.title))
        setVideos(rows)
      } catch (e) {
        setStatus("error")
        setMessage("Failed to load videos list.")
      } finally {
        setLoadingVideos(false)
      }
    }
    fetchVideos()
  }, [])

const isFormValid = Boolean(name.trim() && videoId.trim() && transcript.trim())
  const transcriptWordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const transcriptCharCount = transcript.length

const handleSubmit = async () => {
if (!isFormValid) {
setStatus("error")
setMessage("Please fill Name, VideoID, and Transcript.")
return
}

try {
setSubmitting(true)
setStatus("idle")
setMessage("")

const response = await fetch("https://innovation.eoxs.com/webhook/explore-upload", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ name, videoId, transcript }),
})

if (!response.ok) {
const text = await response.text()
throw new Error(text || `Request failed with ${response.status}`)
}

// Update Firestore flag after successful submission
if (selectedDocId) {
  try {
    await updateDoc(doc(db, "videos", selectedDocId), { ["Transcript-upload"]: true })
  } catch (e) {
    console.error("Failed to set Transcript-upload flag", e)
  }
}

setStatus("success")
setMessage("Submitted successfully.")
setName("")
setVideoId("")
setTranscript("")
setSelectedDocId("")
} catch (err: any) {
setStatus("error")
setMessage(err?.message || "Submission failed.")
} finally {
setSubmitting(false)
}
}

return (
<div className="flex flex-col min-h-screen bg-gradient-enhanced">
<main className="flex-1 container py-8 px-4">
<div className="max-w-3xl mx-auto">
<Card className="bg-white dark:bg-gray-800 shadow-lg">
<CardHeader>
<CardTitle className="text-2xl flex items-center">
<Video className="h-6 w-6 mr-2 text-primary" />
Explore Upload
</CardTitle>
<CardDescription>Send Name, VideoID, and Transcript to the webhook</CardDescription>
</CardHeader>

<CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isPickerOpen}
                      className="w-full justify-between"
                      disabled={loadingVideos || videos.length === 0}
                    >
                      {name || (loadingVideos ? "Loading videos..." : "Select a video")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                    <Command>
                      <CommandInput placeholder="Search videos..." />
                      <CommandList>
                        <CommandEmpty>No videos found.</CommandEmpty>
                        {videos
                          .filter((v) => v.transcriptUploaded !== true)
                          .map((v) => (
                          <CommandItem
                            key={v.docId}
                            value={v.title}
                            onSelect={(val) => {
                              setName(val)
                              const selected = videos.find((x) => x.title === val && x.transcriptUploaded !== true)
                              setVideoId(selected?.videoId || "")
                              setSelectedDocId(selected?.docId || "")
                              setIsPickerOpen(false)
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${name === v.title ? 'opacity-100' : 'opacity-0'}`} />
                            {v.title}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 dark:text-gray-400">Search and select a video to auto-fill VideoID.</p>
              </div>

<div className="space-y-2">
<Label htmlFor="videoId">VideoID</Label>
                <Input
id="videoId"
placeholder="Enter VideoID"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  readOnly
/>
</div>

              <div className="space-y-2">
<Label htmlFor="transcript">Transcript</Label>
<Textarea
id="transcript"
placeholder="Paste transcript here"
                  rows={18}
value={transcript}
onChange={(e) => setTranscript(e.target.value)}
/>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>
                    Words: {transcriptWordCount.toLocaleString()} • Characters: {transcriptCharCount.toLocaleString()}
                  </span>
                  {transcriptWordCount > 10000 ? (
                    <span className="text-destructive">Transcript exceeds 10,000 words; ensure the webhook supports large payloads.</span>
                  ) : null}
                </div>
</div>

{status !== "idle" && (
<div className={"text-sm " + (status === "error" ? "text-destructive" : "text-green-600 dark:text-green-400") }>
{status === "error" ? <AlertCircle className="h-4 w-4 inline mr-1" /> : <CheckCircle2 className="h-4 w-4 inline mr-1" />}
{message}
</div>
)}
</CardContent>

<CardFooter className="flex justify-end space-x-4 border-t pt-6">
<Button variant="outline" onClick={() => router.push("/admin-dashboard")} disabled={submitting}>
Cancel
</Button>
<Button onClick={handleSubmit} disabled={!isFormValid || submitting} className="bg-primary hover:bg-primary/90">
<Send className="h-4 w-4 mr-2" />
{submitting ? "Submitting..." : "Submit"}
</Button>
</CardFooter>
</Card>
</div>
</main>
</div>
)
}


