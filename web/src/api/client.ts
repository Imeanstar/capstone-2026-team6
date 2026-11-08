// The live API: POST /api/extract on the Worker. Everything else the client
// still simulates (see mock.ts), and says so on screen.

import type { SolutionIdea } from './types'

export interface ExtractImage {
  media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
  data: string
}
export interface ExtractInput {
  problem: { text?: string; image?: ExtractImage }
  explanation: { text?: string; image?: ExtractImage }
}

export type ExtractOutcome =
  | { kind: 'ok'; idea: SolutionIdea; model: string; latency_ms: number; attempts: number }
  | { kind: 'question_error'; error_code: 'MISSING_ELEMENTS' | 'MISSING_MECHANISM'; reason: string; model: string; latency_ms: number }
  | { kind: 'output_error'; error_code: string; reason: string; raw: string; model: string }
  | { kind: 'unavailable'; error_code: string; reason: string }

export async function extractIdea(input: ExtractInput, signal?: AbortSignal): Promise<ExtractOutcome> {
  let res: Response
  try {
    res = await fetch('/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return { kind: 'unavailable', error_code: 'NETWORK', reason: '서버에 연결하지 못했습니다.' }
  }
  let body: Record<string, unknown>
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    return { kind: 'unavailable', error_code: `HTTP_${res.status}`, reason: `서버가 ${res.status}로 응답했습니다.` }
  }
  if (!res.ok) return { kind: 'unavailable', error_code: String(body.error_code ?? `HTTP_${res.status}`), reason: String(body.reason ?? '') }
  const model = String(body.model ?? '')
  const latency_ms = Number(body.latency_ms ?? 0)
  if (body.status === 'OK' && body.solution_idea) return { kind: 'ok', idea: body.solution_idea as SolutionIdea, model, latency_ms, attempts: Number(body.attempts ?? 1) }
  if (body.status === 'QUESTION_ERROR') return { kind: 'question_error', error_code: body.error_code as 'MISSING_ELEMENTS' | 'MISSING_MECHANISM', reason: String(body.reason), model, latency_ms }
  return { kind: 'output_error', error_code: String(body.error_code), reason: String(body.reason), raw: String(body.raw ?? ''), model }
}

/** File → base64 payload for the API (no data: prefix). */
export async function fileToImage(file: File): Promise<ExtractImage | null> {
  const type = file.type as ExtractImage['media_type']
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) return null
  const buf = await file.arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { media_type: type, data: btoa(bin) }
}
