// Cloudflare Worker: static site + /api.
// POST /api/extract runs the real first stage of the pipeline: the versioned
// SolutionIdea parser prompt against Claude, then validate_solution_idea on the
// raw output (structure and missing values). Candidate generation and review
// are not served here yet; the client uses stored responses and says so.

import Anthropic from '@anthropic-ai/sdk'
import { PARSE_PROMPT, PROMPT_VERSION } from './prompt.generated'
import { validateSolutionIdea, type ValidationResult } from './validate'

export interface Env {
  ASSETS: Fetcher
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
}

interface ImagePart {
  media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
  data: string // base64, no data: prefix
}
interface SourcePart {
  text?: string
  image?: ImagePart
}
interface ExtractRequest {
  problem: SourcePart
  explanation: SourcePart
}
export interface ExtractResponse extends ValidationResult {
  raw: string
  model: string
  prompt_version: string
  latency_ms: number
  attempts: number
  usage?: { input_tokens: number; output_tokens: number }
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } })

const MAX_IMAGE_B64 = 6_500_000 // ~4.9 MB decoded, under the API's 5 MB per-image limit

function userContent(req: ExtractRequest): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = []
  const part = (label: string, p: SourcePart) => {
    if (p.image) {
      blocks.push({ type: 'text', text: `[${label} 이미지]` })
      blocks.push({ type: 'image', source: { type: 'base64', media_type: p.image.media_type, data: p.image.data } })
    }
    if (p.text && p.text.trim()) blocks.push({ type: 'text', text: `[${label} 텍스트]\n${p.text.trim()}` })
  }
  part('원본문항', req.problem)
  part('해설', req.explanation)
  blocks.push({ type: 'text', text: '후보 문항과 풀이는 아직 없습니다. 위 자료만으로 SolutionIdea JSON 객체 하나를 출력하세요.' })
  return blocks
}

function badRequest(reason: string) {
  return json({ status: 'INPUT_ERROR', error_code: 'BAD_REQUEST', reason }, 400)
}

async function extract(request: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ status: 'UNAVAILABLE', error_code: 'NO_API_KEY', reason: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. wrangler secret put ANTHROPIC_API_KEY 로 등록하세요.' }, 503)
  }
  let body: ExtractRequest
  try {
    body = (await request.json()) as ExtractRequest
  } catch {
    return badRequest('JSON 본문이 필요합니다.')
  }
  const hasProblem = !!(body?.problem?.text?.trim() || body?.problem?.image?.data)
  const hasExplanation = !!(body?.explanation?.text?.trim() || body?.explanation?.image?.data)
  if (!hasProblem || !hasExplanation) return badRequest('문항과 해설 각각에 이미지 또는 텍스트가 하나 이상 필요합니다.')
  for (const p of [body.problem, body.explanation]) {
    if (p.image && p.image.data.length > MAX_IMAGE_B64) return badRequest('이미지가 너무 큽니다. 5 MB 이하로 줄여 주세요.')
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const model = env.ANTHROPIC_MODEL || 'claude-opus-5-5'
  const t0 = Date.now()
  let raw = ''
  let attempts = 0
  let result: ValidationResult | null = null
  let usage: ExtractResponse['usage']

  // One retry, and only for JSON/schema errors (prompt failure modes 6 and 7).
  // Two-elements-missing or unreadable input is a question error, never retried.
  while (attempts < 2) {
    attempts++
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent(body) }]
    if (attempts === 2 && result) {
      messages.push({ role: 'assistant', content: raw || '(빈 출력)' })
      messages.push({ role: 'user', content: `출력이 스키마를 위반했습니다(${result.error_code}). 설명 없이 JSON 객체 하나만 다시 출력하세요.` })
    }
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: [{ type: 'text', text: PARSE_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium' },
      messages,
    })
    usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
    if (response.stop_reason === 'refusal') {
      return json({ status: 'UNAVAILABLE', error_code: 'REFUSAL', reason: '모델이 이 입력의 처리를 거부했습니다.', model, latency_ms: Date.now() - t0 }, 502)
    }
    raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    // tolerate a fenced block even though the prompt forbids it; the validator still sees the inner text
    const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
    const candidate = fenced ? fenced[1] : raw
    result = validateSolutionIdea(candidate, false)
    if (result.status !== 'OUTPUT_ERROR') break
  }

  const out: ExtractResponse = { ...(result as ValidationResult), raw, model, prompt_version: PROMPT_VERSION, latency_ms: Date.now() - t0, attempts, usage }
  return json(out)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') {
      return json({ ok: true, model: env.ANTHROPIC_MODEL || 'claude-opus-5-5', has_key: !!env.ANTHROPIC_API_KEY, prompt_version: PROMPT_VERSION })
    }
    if (url.pathname === '/api/extract') {
      if (request.method !== 'POST') return json({ reason: 'POST only' }, 405, { allow: 'POST' })
      try {
        return await extract(request, env)
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) return json({ status: 'UNAVAILABLE', error_code: 'AUTH', reason: 'API 키가 유효하지 않습니다.' }, 503)
        if (err instanceof Anthropic.RateLimitError) return json({ status: 'UNAVAILABLE', error_code: 'RATE_LIMIT', reason: '요청이 많아 잠시 뒤 다시 시도해야 합니다.' }, 503)
        if (err instanceof Anthropic.APIError) return json({ status: 'UNAVAILABLE', error_code: 'API', reason: `Anthropic API 오류 ${err.status}: ${err.message}` }, 502)
        return json({ status: 'UNAVAILABLE', error_code: 'UNKNOWN', reason: err instanceof Error ? err.message : String(err) }, 500)
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ reason: 'not found' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
