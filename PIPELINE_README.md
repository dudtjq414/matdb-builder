# 파이프라인 상세 가이드

NotebookLM에 논문을 올려놓으면 Claude가 자동으로 수치 데이터를 추출해줍니다.

---

## 전체 흐름

```
git clone
    ↓
Claude Code에서 폴더 열기
    ↓
"파이프라인 실행해줘"
    ↓
Claude가 6가지 정보 질문 (CLAUDE.md 자동 안내)
    ↓
pipeline.js 자동 실행 (7개 쿼리 → NotebookLM → 데이터 추출)
    ↓
pipeline-result.json 생성
    ↓
results-viewer.html 에서 결과 검색·내보내기
```

---

## 1. 사전 준비 (최초 1회)

### Claude Code 설치

1. https://claude.ai/code 에서 설치
2. Claude Pro 구독 필요 (월 $20)

### NotebookLM MCP 설치

Claude Code 채팅창에서:

```
! npm install -g notebooklm-mcp
```

```
! nlm login
```

`! nlm login` 실행 후 브라우저 창이 열리면 Google 계정으로 로그인합니다.

### 이 repo clone

```
! git clone https://github.com/dudtjq414/matdb-builder.git
```

Claude Code에서 **matdb-builder 폴더를 열어주세요.**

> **.claude/settings.json 자동 설정:** repo에 포함되어 있어 NotebookLM MCP 설정이 자동 적용됩니다. 별도 편집 불필요.

---

## 2. NotebookLM 준비

1. https://notebooklm.google.com 에서 새 노트북 생성
2. 논문 PDF 또는 URL을 소스로 추가 (최소 5편 권장)
3. 노트북 URL 확인:
   ```
   https://notebooklm.google.com/notebook/abc123-def456-...
   ```
   브라우저 주소창에서 URL 전체를 복사해 두세요 (ID 추출은 자동)

---

## 3. 파이프라인 실행

Claude Code 채팅창에 입력:

```
파이프라인 실행해줘
```

Claude가 아래 6가지를 하나씩 질문합니다:

| 질문 | 예시 |
|------|------|
| NotebookLM 노트북 URL | `https://notebooklm.google.com/notebook/abc123-...` |
| 연구 재료/시스템 | `아민계 경화 에폭시 수지` |
| 측정 물성 | `Young's Modulus` |
| 물성 단위 | `GPa` |
| 데이터 분류 기준 | `에폭시 계열` |
| 제외할 측정 방법 | `DMA 저장탄성률, 나노인덴테이션` (없으면 `없음` 입력) |

### 입력값 작성 팁

| 필드 | 잘 쓴 예 | 잘못 쓴 예 |
|------|---------|----------|
| 재료/시스템 | `아민계 경화 에폭시 수지` | `에폭시` (너무 광범위) |
| 측정 물성 | `Young's Modulus` | `탄성률` (모호함) |
| 분류 기준 | `에폭시 계열` | `종류` (너무 모호함) |
| 제외 기준 | `DMA E', 나노인덴테이션` | 없으면 `없음` 입력 (Enter는 안 됨) |

**제외 기준을 구체적으로 쓸수록** 노이즈 데이터가 줄어듭니다.

---

## 4. 자동 실행 과정

모든 답변이 완료되면 4단계로 자동 실행됩니다.

1. **쿼리 생성** — 입력한 재료·물성에 특화된 7개 딥리서치 쿼리 생성
2. **NotebookLM 탐색** — 7개 쿼리를 병렬 실행
3. **데이터 추출** — 각 응답에서 수치 데이터 파싱 (재료명·값·출처·연도·유형)
4. **저장** — `pipeline-result.json` 생성

소요 시간: 약 5~10분

---

## 5. 결과 확인

파이프라인 완료 후 `pipeline-result.json`이 생성됩니다.

### results-viewer.html 사용법

1. `results-viewer.html`을 브라우저에서 더블클릭하여 열기
2. `pipeline-result.json` 파일을 드래그하거나 클릭하여 선택
3. 검색·필터 기능 사용:
   - 재료명, 계열, 출처 실시간 검색
   - **Exptl**(실험) / **MD**(시뮬레이션) / **ML** 유형 필터
   - 계열별 칩 필터
   - 값 높은 순/낮은 순/최신 순 정렬
   - CSV 내보내기

---

## 활용 사례 (에폭시 DB 구축 실제 결과)

| 노트북 소스 수 | 추출 건수 | 소요 시간 |
|--------------|----------|----------|
| 31편 논문     | 95건      | 약 8분    |

---

## 문제 해결

| 오류 | 해결 |
|------|------|
| NotebookLM MCP 쿼리 실패 | `! nlm login` 재실행 후 Google 재로그인 |
| 노트북에서 데이터를 못 찾음 | 노트북에 소스 추가 후 재실행 |
| 추출 건수가 너무 적음 | 분류 기준을 넓히거나 제외 기준을 줄여서 재실행 |
| Claude 세션 한도 초과 | 한도 리셋 후 "파이프라인 실행해줘" 재입력 |
