# AI 수학 문제 변형 생성기

문서 버전: 0.11.0 · 최종 수정일: 2026-09-08 · 개인 AI 캡스톤 프로젝트

**고난도 Main의 학습 목표를 이어가면서, 숫자만 바꾼 문제가 아닌 새로운 풀이 경험을 만든다.**

Sketch는 Main의 특정 풀이 병목을 연습하는 더 쉬운 문제다. Addition은 조건·표현·보조 개념·풀이 경로를 바꾼, 비슷하거나 조금 더 어려운 문제다. 두 유형 모두 문제·정답·해설과 검증 근거를 함께 만든다. 정답이 맞아도 숫자 치환이거나 Main과 무관하면 성공이 아니다.

## 1. 처음 읽을 문서

| 목적 | 문서 |
|---|---|
| 지휘관·개발자의 상시 작업 규칙 | [AGENTS.md](AGENTS.md) |
| 제품 명세·수용 기준(AC)·품질 게이트 | [docs/SPEC.md](docs/SPEC.md) — 유일한 원문 |
| 현재 진행 상태·근거·다음 작업 | [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) |
| 사용자 결정·데이터·실험 근거 목록 | [docs/EVIDENCE.md](docs/EVIDENCE.md) |
| 명령과 실행 전제 | [docs/RUNBOOK.md](docs/RUNBOOK.md) |
| 과거 세부 개발 계획 | [SOLO_DEVELOPMENT_ROADMAP.md](SOLO_DEVELOPMENT_ROADMAP.md) |

Astra High 지휘관은 AGENTS → PROJECT_STATUS → SPEC의 관련 절 순서로 읽는다. 사람·Sol·Terra도 같은 요구사항 원문을 사용한다. 루트 [SPEC.md](SPEC.md)는 기존 링크용 안내 파일이며 별도 명세 사본이 아니다.

## 2. 현재 가능한 것과 아직 아닌 것

- 현재 데이터: donor 499문항, PDF 41개 가족·205문항. MVP는 공통·미적분이며 추가 데이터 없이 진행한다.
- 구현: 정규화·가족 분할, BM25 검색, Blueprint·Plan·생성 계약, blind 입력 제한, 저장 응답 재생, agent 응답·감사 기록, 로컬 브라우저 데모.
- 첫 development 실험: 후보·blind 풀이·감사 각 24건. 기술 상태는 검토 필요 18건, 거절 6건, 승인 0건이다.
- 미완료: 수학·난이도 일반화 검증, 후보 간 의미 중복, corpus 전체 신규성, RAG 효과 비교, 최종 validation/test, 판매 승인.
- Python 코드가 에이전트를 자율 호출하는 시스템은 아니다. 현재 실제 생성·검수는 에이전트 실행과 기록용 스크립트를 조합한다.

위 수치는 2026-09-08의 상태 요약이다. 최신값과 한계는 [진행 상태](docs/PROJECT_STATUS.md)를 따른다. 테스트 통과나 검수자의 `retain`을 판매 가능 문항 수로 해석하지 않는다.

## 3. 교수자 지침 적용

사용자가 제공한 `00_README.md`의 **저장 위치·산출물 연결·근거 역추적** 형식을 따른다. 강의 번호는 학사 주차가 아니라 자료 일련번호다. 아직 받지 않은 강의별 지침과 루브릭 비중은 임의로 만들지 않는다.

| 책임 | 이 프로젝트에서의 적용 |
|---|---|
| 사람이 정하는 기준 | 문제 정의·AC·절대 규칙·골든 기대값·eval 지표의 최종 확인 |
| 사람이 뼈대, AI가 초안 | 온톨로지·스키마·스파이크·아키텍처·RAG 설정·평가셋 |
| AI가 만들고 사람이 검증 | 이미 명시한 기준에 대한 구현·도구·evals 러너 및 결과 |

**AI 초안, 개발 실험, 사람 승인, 수업 제출 완료는 서로 다르다.** 현재 AC 표와 새 수업 문서는 `human_review=pending`이다. 인터뷰·관찰은 사용자가 별도로 수행하므로 개발 로드맵에 넣지 않고, 미수령 상태와 저장 위치만 마련한다. 사용자에게 개별 수학 문제의 검수를 개발 선행 조건으로 요구하지 않는다.

교수자 예시의 특정 도구용 import 문법은 그대로 복사하지 않는다. Codex의 진입 파일은 `AGENTS.md`이고, 여기서 `docs/SPEC.md`의 관련 절을 명시적으로 읽도록 한다.

## 4. 저장소 구조

아래는 **현재 마련한 골격**이다. `초안/대기` 표시는 구현이나 승인 완료가 아니다.

```text
.
├── README.md
├── AGENTS.md
├── SPEC.md                         # docs/SPEC.md로 연결
├── docs/
│   ├── research/interviews.md      # 강의 2: 미수령
│   ├── ontology.yaml              # 강의 2: AI 초안
│   ├── PROBLEM.md                  # 강의 4: 문제 정의 초안
│   ├── SPEC.md                     # 강의 4: 명세 + AC 원문
│   ├── spikes/README.md            # 강의 4: 날짜별 스파이크 기록 위치
│   ├── ARCHITECTURE.md             # 강의 6: 현 구현 설명 초안
│   ├── prompts/delegation_examples.md # 강의 5: 위임 기록 안내
│   ├── PROJECT_STATUS.md           # 상태·다음 작업
│   ├── EVIDENCE.md                 # 근거 ID
│   ├── RUNBOOK.md                  # 현 실행 명령
│   └── DATA_HISTORY.md             # 기존 데이터·실험 이력
├── src/mathgen/                    # 교수자 지정 제출 위치; runtime 아님
│   ├── schemas/README.md           # *.schema.json export 대기
│   ├── prompts/parse_query.md      # 강의 3: 요구 확인 대기
│   └── tools/README.md             # 강의 6: 도구 이관 대기
├── config/rag.yaml                # 강의 6: 문서화 초안; 미연결
├── tests/
│   ├── harness/golden_cases.yaml   # 강의 5: 승인 케이스 대기
│   ├── fixtures/                  # 기존 결정적 회귀용; 교육 gold 아님
│   └── test_*.py                  # 실제 unittest
├── evals/
│   ├── README.md                  # 강의 7: 설계·위치 매핑
│   ├── judge_prompt.md            # 감사 기준과 현 생성 경로 안내
│   └── results/README.md          # 공개 가능한 측정 기록만
├── data/
│   ├── seed/README.md             # 허가된 예시 데이터 대기
│   └── interim/pdf_family_manifest.json
├── mathgen/                       # 실제 Python 패키지; 이번 작업에서 이동 안 함
├── prompts/                       # 실제 단계별 버전 프롬프트
├── scripts/                       # 실제 로더·실행·검수 CLI
└── artifacts/private/             # 비공개 데이터·실험, Git 제외
```

`src/` 구조로 패키지를 이관하거나 기존 코드를 복제하지 않았다. 교수자 지정 위치와 현재 실행 위치가 다른 부분은 아래 표에 표시했다. **골격 마련은 완료됐지만 모든 산출물의 지정 경로 이행은 아직 완료가 아니다.**

## 5. 산출물 목록과 연결

| 강의 | 파일·형식 / 지정 위치 | 무엇을 담는가 | 선행 근거 | 이후 사용 | 현재 상태 |
|---|---|---|---|---|---|
| 2 | `docs/research/interviews.md` | 프로토콜·로그·관찰·Job Story | 실제 인터뷰/관찰 | 온톨로지·문제 정의 | 미수령; 위치만 마련 |
| 2 | `docs/ontology.yaml` | 대표어·관계·evidence | 사용자 결정·인터뷰 | 스키마·용어집 | AI 초안, 인터뷰 근거 없음 |
| 3 | `src/mathgen/schemas/*.schema.json` | 필드·타입·enum 계약 | 온톨로지·데이터 | 도구·골든 케이스 | 대기; 현재 원문은 `mathgen/models.py` |
| 3 | `src/mathgen/prompts/parse_query.md` | 요청 해석 계약 | 요청 시나리오·스키마 | 입력 단계 | 대기; 현재는 구조화 Main 입력 |
| 4 | `docs/PROBLEM.md` | 문제·대상·범위·증거 | 사용자 결정·관찰 | SPEC | AI 초안 |
| 4 | `docs/SPEC.md`, `AGENTS.md` | AC·품질 기준 / 상시 규칙 | 문제 정의·사용자 결정 | 모든 위임·검증 | 원문 배치, AC 사람 검토 대기 |
| 4 | `docs/spikes/YYYY-MM-DD_가설.md` | 가설·실험·판정 | AC·기술 불확실성 | 아키텍처 | 위치 마련; 개별 지침 미수령 |
| 5 | `tests/harness/golden_cases.yaml`, `tests/test_*_golden.py` | 승인된 결정 층 케이스·검사 | AC·사람의 기대값 확인 | 도구·CI | cases 비어 있음; 전용 테스트 미작성 |
| 5 | `docs/prompts/delegation_examples.md` | 위임 입력·결과·검증 루프 | AC·실제 실행 기록 | 감사·회고 | 기록 위치·양식 안내 |
| 6 | `docs/ARCHITECTURE.md`, `src/mathgen/tools/` | 구성요소·도구 경계 | 스키마·스파이크 | 구현·관측 | 설계 초안; 도구는 현재 `mathgen/` |
| 6 | `config/rag.yaml` | 검색 corpus·필터·누수 정책 | 데이터·아키텍처 | RAG 실행·평가 | 문서화 초안; runtime 미연결 |
| 7 | `evals/evalset.jsonl`, `evals/README.md` | 평가 입력·분모·분할·지표 | AC·관측 로그 | 통계 평가 | 설계 골격; 공개 evalset 미작성 |
| 7 | `evals/judge_prompt.md`, `evals/run_evals.py` | 판정 기준·러너 | 골든 케이스·평가셋 | 결과·오류 분석 | 러너 이관 대기; 기존 `scripts/` 사용 |
| 7 | `evals/results/YYYY-MM-DD.json` | 공개 가능한 집계 | 실제 실행 | 개선·회고 | 비공개 실험은 `artifacts/private/`에 유지 |
| 공통 | `data/seed/` | 직접 제작/허가된 최소 예시 | 사용·공개 범위 확인 | 재현·시연 | 위치 마련, 데이터 미추가 |

`evidence → FR/QG → AC → golden case → tests/evals → 결과`로 연결한다. 존재하지 않는 인터뷰 로그나 사람 승인을 만들어 연결하지 않는다. 예를 들어 AC-004는 FR-415와 blind 입력 제한 테스트로 이어지지만, 학습자 품질 검증까지 완료했다는 뜻은 아니다.

## 6. 기술 스택과 실행

| 영역 | 현재 사용 | 아직 필수가 아닌 것 |
|---|---|---|
| 언어·스키마 | Python 3.11+, Pydantic 2 | 추가 데이터 프레임워크 |
| 저장·검색 | JSON/JSONL, stdlib BM25 | 별도 벡터 DB·임베딩 |
| 테스트 | unittest, 저장 응답 fixture | 교육 품질 자동 보증 |
| 모델 경계 | LLMProvider, agent packet/response 기록 | Python의 에이전트 자율 호출 |
| UI | stdlib http.server 로컬 데모 | FastAPI·Gradio |
| 수학 검증 | 답 비교·부분 결정적 검사·독립 풀이·감사 | 일반 SymPy 검산·형식 증명 |

저장소 루트에서 실행한다. 기존 환경이 있다면 재설치할 필요 없다.

```powershell
# 현재 PC의 설치된 환경: 모델 호출 없이 회귀 검사
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

새 환경은 Python 3.11+에서 `python -m pip install -e .`로 설치한다. 의존성이 없는 새 환경에서는 패키지 저장소 연결이 필요할 수 있다.

공개 fixture만 사용하는 하네스 재생 예시(실제 새 문제 생성 아님):

```powershell
.\.venv\Scripts\python.exe scripts/run_harness.py --cases tests/fixtures/evaluation_cases.jsonl --responses tests/fixtures/recorded_responses.json --prompt prompts/baseline/v1.md --output artifacts/private/runs/readme-fixture
```

실제 agent 실험, 비공개 데이터 준비, 선택적 endpoint 데모의 전제와 명령은 [RUNBOOK](docs/RUNBOOK.md)을 따른다. endpoint 연결을 현재 개발의 선행 조건으로 요구하지 않는다.

## 7. 개발 로드맵

| 순서 | 목표 산출물 | 종료 기준 |
|---|---|---|
| 완료된 기반 | 데이터 진단·가족 분할·최소 하네스·첫 개발 실험 | 데이터·실행·실패 근거를 재현 가능하게 보존 |
| 다음 1 | Addition 추론·난이도 기준, 후보별 다른 Plan | 난이도 하락·숫자형 형제에 대한 검수 기준과 실패 사례 연결 |
| 다음 2 | pool/corpus 신규성·검증 상태 정리 | 비교 범위·미검증 상태를 숨기지 않고 관련 회귀 검사 통과 |
| 다음 3 | 새 development 개선 실험 | 생성→blind→감사→비교 보고, 기존 첫 시도 보존 |
| 이후 | RAG 비교→validation→동결 test | 동일 예산·분할·지표로 평가, test로 반복 튜닝하지 않음 |
| 이후 | UI 회귀·수업 시연 | 실제 가능한 기능과 실패 상태를 재현 |
| 최후순위 | 기하·벡터·작도 연구 | MVP 안정화 후 별도 범위 결정 |

인터뷰 일정·모델 이전·결제 구현은 이 개발 로드맵에 포함하지 않는다. 수업의 선행 산출물 미완료 상태는 §5에서 별도로 관리한다.

## 8. 자가 점검

- [x] 제품 핵심 가치와 Sketch/Addition의 차이가 명확하다.
- [x] 교수자 지정 경로의 골격과 현재 runtime 위치를 구분했다.
- [x] AGENTS / 제품 계약 / 진행 상태의 원문이 하나씩 있다.
- [x] FR/QG와 연결된 AC-001~010 초안이 있다.
- [x] 실제 데이터·실험·테스트 근거와 한계를 기록했다.
- [ ] 사람 검토가 필요한 AC·온톨로지·골든 기대값 승인이 기록됐다.
- [ ] 미수령 인터뷰·관찰과 강의별 세부 지침이 반영됐다.
- [ ] schema export·tools·evals가 지정 경로에서 실제 실행된다.
- [ ] 의미 중복·수학·난이도 품질을 검증해 MVP 완료 기준을 충족했다.

루브릭의 실제 항목·비중은 강의별 문서 수령 후 반영한다. 현재 임의의 배점은 없다.

## 9. 공개·판매 경계

원본 PDF/JSON·생성 풀이·민감 로그·키는 공개 커밋하지 않는다. `data/raw/`, `artifacts/private/`, PDF와 비밀 파일은 Git 제외 대상이다. 공개 seed·evalset에는 직접 제작했거나 허가된 자료만 둔다. 기술 상태와 운영자의 판매 승인은 별개이며 현재 판매 승인 문항은 없다.

형식 근거: 사용자 제공 교수자 `00_README.md` ([EVD-COURSE-001](docs/EVIDENCE.md)). 에이전트 문서 구성 참고: [OpenAI Astra 지침](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra). 전용 형식으로 성능이 검증됐다는 주장이 아니라, 읽기 순서·역할·완료 기준을 명확히 한 구성이다.
