import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Ensure these are set in .env.local and NEVER hard-coded in code
const apiKey = process.env.OPENAI_API_KEY
const assistantId = process.env.OPENAI_ASSISTANT_ID

console.log("API Key exists:", !!apiKey)
console.log("Assistant ID exists:", !!assistantId)
console.log("Assistant ID:", assistantId)

const client = new OpenAI({ apiKey })

export async function POST(req: NextRequest) {
  try {
    console.log("API route called")
    console.log("API Key exists:", !!apiKey)
    console.log("Assistant ID exists:", !!assistantId)
    
    if (!apiKey || !assistantId) {
      console.error("Missing API key or assistant ID")
      return NextResponse.json({ error: "Server is not configured (missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID)." }, { status: 500 })
    }

    const body = await req.json()
    console.log("Request body:", body)
    const { message, threadId } = body as { message: string; threadId?: string }

    if (!message || typeof message !== "string") {
      console.error("Invalid message:", message)
      return NextResponse.json({ error: "Missing 'message'" }, { status: 400 })
    }
    
    console.log("Processing message:", message, "Thread ID:", threadId)

    // Create thread if not provided
    console.log("Creating/using thread:", threadId ? threadId : "new")
    const thread = threadId
      ? { id: threadId }
      : await client.beta.threads.create()
    
    console.log("Thread ID:", thread.id)

    // Add user message
    console.log("Adding user message to thread")
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    })

    // Run the assistant
    console.log("Starting assistant run with ID:", assistantId)
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    })
    
    console.log("Run started:", run.id, "Status:", run.status)

    // Poll until completed (simple long-polling)
    console.log("Polling for run completion...")
    let runStatus = run
    const start = Date.now()
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      // Safety timeout ~25s
      if (Date.now() - start > 25000) break
      await new Promise((r) => setTimeout(r, 1000))
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id)
      console.log("Run status:", runStatus.status)
    }
    
    console.log("Final run status:", runStatus.status)

    // Fetch latest assistant message
    console.log("Fetching assistant messages...")
    const list = await client.beta.threads.messages.list(thread.id, { limit: 1 })
    console.log("Messages found:", list.data.length)
    const assistantMessage = list.data[0]
    console.log("Assistant message:", assistantMessage)
    
    const text = assistantMessage?.content?.[0]?.type === "text"
      ? (assistantMessage.content[0] as any).text.value
      : "I couldn't generate a response right now. Please try again."
    
    console.log("Extracted text:", text)

    console.log("Returning response:", { reply: text, threadId: thread.id })
    return NextResponse.json({ reply: text, threadId: thread.id })
  } catch (err: any) {
    console.error("AI chat error:", err)
    console.error("Error details:", err.message, err.stack)
    return NextResponse.json({ error: "Unexpected server error", details: err.message }, { status: 500 })
  }
}


