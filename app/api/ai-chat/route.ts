import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Ensure these are set in .env.local and NEVER hard-coded in code
const apiKey = process.env.OPENAI_API_KEY
const assistantId = process.env.OPENAI_ASSISTANT_ID

const client = new OpenAI({ apiKey })

export async function POST(req: NextRequest) {
  try {
    if (!apiKey || !assistantId) {
      return NextResponse.json({ error: "Server is not configured (missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID)." }, { status: 500 })
    }

    const body = await req.json()
    const { message, threadId } = body as { message: string; threadId?: string }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message'" }, { status: 400 })
    }

    // Create thread if not provided
    const thread = threadId
      ? { id: threadId }
      : await client.beta.threads.create()

    // Add user message
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    })

    // Run the assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    })

    // Poll until completed (simple long-polling)
    let runStatus = run
    const start = Date.now()
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      // Safety timeout ~25s
      if (Date.now() - start > 25000) break
      await new Promise((r) => setTimeout(r, 1000))
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id)
    }

    // Fetch latest assistant message
    const list = await client.beta.threads.messages.list(thread.id, { limit: 1 })
    const assistantMessage = list.data[0]
    const text = assistantMessage?.content?.[0]?.type === "text"
      ? (assistantMessage.content[0] as any).text.value
      : "I couldn't generate a response right now. Please try again."

    return NextResponse.json({ reply: text, threadId: thread.id })
  } catch (err: any) {
    console.error("AI chat error:", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}


