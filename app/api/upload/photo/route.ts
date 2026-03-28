import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  endpoint: process.env.RAILWAY_STORAGE_ENDPOINT!,
  region: process.env.RAILWAY_STORAGE_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.RAILWAY_STORAGE_BUCKET!

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }))

    const endpoint = process.env.RAILWAY_STORAGE_ENDPOINT!.replace(/\/$/, '')
    const publicUrl = `${endpoint}/${BUCKET}/${key}`

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
