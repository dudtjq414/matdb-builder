# matdb-builder

연구 논문에서 재료 물성 수치 데이터를 자동 추출하는 파이프라인 도구.

---

## 파이프라인 실행 방법

사용자가 "파이프라인", "pipeline", "실행", "데이터 추출", "run pipeline", "extract data", "start pipeline" 등을 요청하면 **아래 절차를 반드시 따르세요.**

**언어 감지**: 사용자가 영어로 요청하면 질문도 영어로, 한국어로 요청하면 한국어로 진행하세요.

### 1단계 — 정보 수집 (실행 전에 반드시 먼저 질문)

아래 항목을 **한 번에 하나씩** 물어보세요. 사용자가 대답하면 다음 질문으로 넘어가세요.

**한국어 사용자:**

1. **NotebookLM 노트북 URL**
   - 예: `https://notebooklm.google.com/notebook/abc123-def456-...`
   - URL 전체를 받으면 됩니다 (ID 추출은 자동)

2. **연구 재료/시스템**
   - 예: `아민계 경화 에폭시 수지`, `탄소섬유 복합재`, `리튬이온 배터리 양극재`
   - 구체적일수록 결과가 좋습니다

3. **측정하려는 물성**
   - 예: `Young's Modulus`, `인장강도`, `열전도도`, `이온전도도`

4. **물성 단위**
   - 예: `GPa`, `MPa`, `W/mK`, `mS/cm`

5. **데이터 분류 기준**
   - 표의 주요 열이 될 항목
   - 예: `에폭시 계열`, `경화제 종류`, `온도`, `섬유 배향각`

6. **제외할 측정 방법** (선택사항)
   - 노이즈를 줄이기 위해 제외할 측정법
   - 예: `DMA 저장탄성률(E'), 나노인덴테이션, 압축시험`
   - 없으면 "없음" 또는 "-" 입력 → excludeNote는 빈 문자열("")로 처리

7. **결과 파일명**
   - 저장할 JSON 파일 이름 (확장자 .json 포함)
   - 예: `epoxy-youngs-modulus.json`, `cf-tensile-strength.json`
   - 없으면 "없음" 입력 → `pipeline-result.json`으로 저장

**English users (ask in English):**

1. **NotebookLM notebook URL**
   - e.g. `https://notebooklm.google.com/notebook/abc123-def456-...`
   - Paste the full URL (ID is extracted automatically)

2. **Material / system to study**
   - e.g. `amine-cured epoxy resin`, `carbon fiber composite`, `NMC cathode`
   - More specific = better results

3. **Property to measure**
   - e.g. `Young's Modulus`, `tensile strength`, `thermal conductivity`

4. **Unit**
   - e.g. `GPa`, `MPa`, `W/mK`, `mS/cm`

5. **Data classification criterion** (main grouping column)
   - e.g. `epoxy type`, `curing agent`, `fiber orientation angle`

6. **Measurement methods to exclude** (optional)
   - e.g. `DMA storage modulus (E'), nanoindentation, compression test`
   - Type `none` if not applicable → excludeNote will be empty

7. **Output filename**
   - JSON filename including `.json` extension
   - e.g. `epoxy-youngs-modulus.json`, `cf-tensile-strength.json`
   - Type `none` → saves as `pipeline-result.json`

### 2단계 — 설정 파일 저장

수집한 값을 **Write 도구**로 `pipeline-config.json` 파일에 저장하세요.
파일 내용은 아래 JSON 형식을 그대로 사용하고, 꺾쇠 부분만 실제 값으로 교체합니다.
7번 파일명이 "없음"이면 outputPath는 `"./pipeline-result.json"`으로 씁니다:

```json
{
  "notebookId": "<수집한 URL 전체 또는 ID>",
  "material": "<수집한 재료명>",
  "propertyName": "<수집한 물성명>",
  "unit": "<수집한 단위>",
  "categoryLabel": "<수집한 분류 기준>",
  "excludeNote": "<수집한 제외 기준, 없으면 빈 문자열>",
  "outputPath": "./<수집한 파일명>"
}
```

### 3단계 — 워크플로우 실행

파일 저장이 완료되면 Workflow 도구로 pipeline.js를 실행하세요:

```
Workflow({ scriptPath: "pipeline.js" })
```

### 4단계 — 완료 후

파이프라인이 완료되면 지정한 파일명으로 JSON이 생성됩니다.
`results-viewer.html`을 브라우저에서 열고 JSON 파일을 드래그하면 결과를 검색할 수 있습니다.

---

## 주의사항

- NotebookLM MCP(`notebooklm-mcp-cli`)가 설정되어 있어야 자동 실행됩니다
- 노트북에 논문 소스가 최소 5편 이상 있어야 결과가 충분합니다
