// A faithful port of src/aleph/validation.py (validate_solution_idea).
// Structure and missing values only; mathematical evidence is reviewed elsewhere.
// Check order and error codes follow docs/SPEC.md § 5.1.

export type ValidationStatus = 'OK' | 'OUTPUT_ERROR' | 'QUESTION_ERROR'
export type ValidationCode = 'JSON_INVALID' | 'SCHEMA_INVALID' | 'EMPTY_TEXT' | 'COMPARISON_REQUIRED' | 'MISSING_ELEMENTS' | 'MISSING_MECHANISM'

export interface SolutionIdea {
  concept: string | null
  key_elements: [string, string] | null
  mechanism: string | null
  transferable?: boolean
}

export interface ValidationResult {
  status: ValidationStatus
  error_code: ValidationCode | null
  reason: string | null
  solution_idea: SolutionIdea | null
}

function error(code: ValidationCode, reason: string): ValidationResult {
  const question = code === 'MISSING_ELEMENTS' || code === 'MISSING_MECHANISM'
  return { status: question ? 'QUESTION_ERROR' : 'OUTPUT_ERROR', error_code: code, reason, solution_idea: null }
}

/** JSON.parse that rejects duplicate object keys and the non-standard constants, like the Python hooks do. */
function parseStrict(raw: string): unknown {
  if (/\b(NaN|Infinity|-Infinity)\b/.test(raw.replace(/"(?:[^"\\]|\\.)*"/g, '""'))) throw new Error('non-standard constant')
  // duplicate keys: walk objects with a tiny tokenizer-free check per object literal
  const value = JSON.parse(raw)
  const dupes = (s: string) => {
    // collect keys of the top-level object only (the schema is flat), which is what matters here
    const m = s.match(/^\s*\{([\s\S]*)\}\s*$/)
    if (!m) return false
    const keys: string[] = []
    const re = /"((?:[^"\\]|\\.)*)"\s*:/g
    let depth = 0
    let inStr = false
    let i = 0
    const body = m[1]
    while (i < body.length) {
      const ch = body[i]
      if (inStr) {
        if (ch === '\\') i++
        else if (ch === '"') inStr = false
      } else if (ch === '"') {
        if (depth === 0) {
          re.lastIndex = i
          const k = re.exec(body)
          if (k && k.index === i) {
            keys.push(k[1])
            i = re.lastIndex
            continue
          }
        }
        inStr = true
      } else if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') depth--
      i++
    }
    return new Set(keys).size !== keys.length
  }
  if (dupes(raw)) throw new Error('duplicate key')
  return value
}

const ALLOWED = new Set(['concept', 'key_elements', 'mechanism', 'transferable'])

function schemaValid(v: unknown): v is SolutionIdea {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  for (const k of Object.keys(o)) if (!ALLOWED.has(k)) return false
  for (const k of ['concept', 'key_elements', 'mechanism']) if (!(k in o)) return false
  const str = (x: unknown) => typeof x === 'string' && x.length >= 1
  if (!(o.concept === null || str(o.concept))) return false
  if (!(o.mechanism === null || str(o.mechanism))) return false
  if (o.key_elements !== null) {
    const a = o.key_elements
    if (!Array.isArray(a) || a.length !== 2 || !a.every(str) || a[0] === a[1]) return false
  }
  if ('transferable' in o && typeof o.transferable !== 'boolean') return false
  return true
}

export function validateSolutionIdea(rawOutput: string, comparisonAvailable = false): ValidationResult {
  let idea: unknown
  try {
    idea = parseStrict(rawOutput)
  } catch {
    return error('JSON_INVALID', '중복 키와 비표준 값이 없는 JSON 객체 하나가 필요합니다.')
  }
  if (!schemaValid(idea)) return error('SCHEMA_INVALID', '출력이 SolutionIdea 스키마의 키, 타입 또는 값 제약을 위반했습니다.')
  const texts = [idea.concept, idea.mechanism, ...(idea.key_elements ?? [])]
  if (texts.some((t) => typeof t === 'string' && t.trim() === '')) return error('EMPTY_TEXT', '공백만 있는 문자열을 풀이 정보로 사용할 수 없습니다.')
  if ('transferable' in idea && !comparisonAvailable) return error('COMPARISON_REQUIRED', '전이 여부를 판단하려면 원문과 후보의 풀이 비교 근거가 필요합니다.')
  if (idea.key_elements === null) return error('MISSING_ELEMENTS', '근거 있는 핵심 풀이 요소 두 개가 필요합니다.')
  if (idea.mechanism === null) return error('MISSING_MECHANISM', '두 핵심 풀이 요소의 연결 메커니즘이 필요합니다.')
  return { status: 'OK', error_code: null, reason: null, solution_idea: idea }
}
