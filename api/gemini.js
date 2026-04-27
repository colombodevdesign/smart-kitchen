export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { systemPrompt, userPrompt } = await req.json()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'GEMINI_API_KEY non configurata sul server' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.json().catch(() => ({}))
    return new Response(JSON.stringify(err), {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(geminiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
