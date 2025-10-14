import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
)

export const dynamic = 'force-dynamic'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function chunkify(t: string, size = 1800, overlap = 200) {
  const out: string[] = []
  let i = 0
  while (i < t.length) {
    out.push(t.slice(i, i + size).trim())
    i += size - overlap
  }
  return out.filter(Boolean)
}

async function embedBatch(inputs: string[]) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: inputs }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.data.map((d: any) => d.embedding as number[])
}

export async function POST(req: NextRequest) {
  try {
    const { video_title, video_id, transcript } = await req.json()
    if (!video_title?.trim() || !video_id?.trim() || !transcript?.trim()) {
      return NextResponse.json(
        { error: 'Missing video_title, video_id, or transcript' },
        { status: 400, headers: corsHeaders },
      )
    }
    const title = (video_title as string).trim()
    const vid = (video_id as string).trim()

    const chunks = chunkify(transcript as string)
    if (!chunks.length) return NextResponse.json({ inserted_chunks: 0 }, { headers: corsHeaders })

    const BATCH = 64
    let inserted = 0
    let skipped = 0
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH)
      const embs = await embedBatch(slice)

      const calls = embs.map((embedding: number[], idx: number) => {
        if (!Array.isArray(embedding)) throw new Error('Embedding missing')
        const content = slice[idx]
        const vectorLiteral = `[${embedding.join(',')}]`
        return supabase.rpc('insert_document', {
          p_video_title: title,
          p_video_id: vid,
          p_content: content,
          p_embedding: vectorLiteral,
        })
      })

      const results = await Promise.all(calls)

      for (const res of results) {
        if ((res as any).error) {
          throw new Error(`insert_document failed: ${(res as any).error.message}`)
        }
        const row = Array.isArray((res as any).data) ? (res as any).data[0] : null
        if (row?.inserted === true) {
          inserted += 1
          // optional: console.log('inserted doc', row.doc_id)
        } else {
          skipped += 1 // ON CONFLICT DO NOTHING
        }
      }
    }

    return NextResponse.json({ inserted_chunks: inserted, skipped_duplicates: skipped }, { headers: corsHeaders })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}


