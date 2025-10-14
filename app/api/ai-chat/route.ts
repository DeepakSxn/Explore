import { NextResponse } from "next/server"

// This route is deprecated since the app now uses a webhook directly.
export async function POST() {
  return NextResponse.json({ error: "Deprecated. Use webhook directly from client." }, { status: 410 })
}


