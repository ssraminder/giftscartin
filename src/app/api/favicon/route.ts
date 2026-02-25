export const dynamic = 'force-dynamic'

export async function GET() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-assets/branding/favicon.ico`
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
