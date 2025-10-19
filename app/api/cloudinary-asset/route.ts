import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get('publicId')

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    const cloudName = 'dnx1sl0nq'
    const apiKey = 571681432539216 // Hardcoded for debugging, should be from env
    const apiSecret = "6ElK2o523zR13rILz8udde5VKR4" // Hardcoded for debugging, should be from env

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary API credentials not configured' },
        { status: 500 }
      )
    }

    // Use Cloudinary Search API to find asset by public_id
    const searchQueryParams = new URLSearchParams({
      expression: `public_id:${publicId}`,
      resource_type: 'video',
      max_results: '1'
    })

    console.log('🔍 Searching for asset with public_id:', publicId)
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search?${searchQueryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudinary API error:', errorData)
      return NextResponse.json(
        { error: `Failed to fetch asset: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      )
    }

    const searchResult = await response.json()
    
    console.log('🔍 Search API Response:', {
      total_count: searchResult.total_count,
      resources: searchResult.resources?.length || 0
    })
    
    // Check if we found any results
    if (!searchResult.resources || searchResult.resources.length === 0) {
      return NextResponse.json(
        { error: 'Asset not found in Cloudinary' },
        { status: 404 }
      )
    }
    
    // Get the first (and should be only) result
    const assetData = searchResult.resources[0]
    
    // Log the asset data for debugging
    console.log('📊 Cloudinary Asset Data:', {
      public_id: assetData.public_id,
      asset_id: assetData.asset_id,
      format: assetData.format,
      duration: assetData.duration,
      bytes: assetData.bytes,
      width: assetData.width,
      height: assetData.height,
      created_at: assetData.created_at,
      secure_url: assetData.secure_url
    })
    
    // Log all available fields to see what we're actually getting
    console.log('🔍 All available fields:', Object.keys(assetData))

    return NextResponse.json(assetData)

  } catch (error) {
    console.error('Error fetching Cloudinary asset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
