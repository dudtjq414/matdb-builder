# matdb-pipeline 사용 가이드

NotebookLM에 논문을 올려놓으면 Claude가 자동으로 수치 데이터를 추출해줍니다.

---

## 1. 사전 준비 (최초 1회)

### Claude Code 설치
```
https://claude.ai/code
```
- Desktop 앱 또는 VS Code 확장 설치
- Claude Pro 구독 필요 (월 $20)

### NotebookLM MCP 설치
터미널에서:
```bash
npm install -g notebooklm-mcp
nlm login
```
`nlm login` 실행 후 브라우저에서 Google 계정 로그인.

### MCP 서버 등록 (Claude Code 설정)
Claude Code 설정 파일(`~/.claude/settings.json` 또는 Settings > MCP)에 추가:
```json
{
  "mcpServers": {
    "notebooklm-mcp": {
      "command": "npx",
      "args": ["notebooklm-mcp"]
    }
  }
}
```

---

## 2. NotebookLM 준비

1. https://notebooklm.google.com 에서 새 노트북 생성
2. 논문 PDF 또는 URL을 소스로 추가 (많을수록 좋음, 최소 5편 권장)
3. URL에서 노트북 ID 복사:
   ```
   https://notebooklm.google.com/notebook/abc123-def456-...
                                           ↑ 이 부분
   ```

---

## 3. pipeline.js 설정

`pipeline.js` 파일 상단의 CONFIG 섹션만 수정:

```javascript
const CONFIG = {
  notebookId: 'abc123-def456-...',    // 복사한 노트북 ID
  material: '탄소섬유/에폭시 복합재',  // 연구 대상 재료
  propertyName: '층간전단강도 (ILSS)', // 측정 물성
  unit: 'MPa',                         // 물성 단위
  categoryLabel: '섬유 배향각',         // 분류 기준
  excludeNote: 'short beam 이외 방법', // 제외할 측정 방법
  outputPath: './my-result.json',      // 결과 저장 경로
};
```

### 입력값 작성 팁

| 필드 | 잘 쓴 예 | 잘못 쓴 예 |
|------|---------|----------|
| material | `아민계 경화 에폭시 수지` | `에폭시` (너무 광범위) |
| propertyName | `Young's Modulus` | `탄성률` (모호함) |
| excludeNote | `DMA E', 나노인덴테이션` | (비워두면 노이즈 많음) |
| categoryLabel | `에폭시 계열` | `종류` (너무 모호함) |

**제외 기준을 구체적으로 쓸수록** 쓰레기 데이터가 줄어듭니다.

---

## 4. 실행

Claude Code를 열고 이 폴더에서:

**방법 A — 채팅에서 실행**
```
"pipeline.js 파일을 워크플로우로 실행해줘"
```

**방법 B — /workflow 명령**
```
/workflow pipeline.js
```

실행 시간: 약 5~10분 (라운드 수 × NotebookLM 응답 대기)

---

## 5. 결과 확인

`pipeline-result.json` 파일에 저장됩니다:

```json
{
  "totalEntries": 45,
  "byCategory": {
    "DGEBA 계열": 15,
    "바이오 기반": 8
  },
  "entries": [
    {
      "materialName": "DGEBA / IPDA",
      "category": "DGEBA 계열",
      "value": 2.65,
      "dataType": "Exptl",
      "reference": "Orselly et al. (2022)",
      "year": 2022,
      "notes": "인장 시험 (ASTM D638)"
    }
  ]
}
```

이 결과를 https://matdb-builder.vercel.app 에서 시각화할 수 있습니다.

---

## 활용 사례 (에폭시 DB 구축 실제 결과)

| 노트북 소스 수 | 추출 건수 | 소요 시간 |
|--------------|----------|----------|
| 31편 논문     | 95건      | 약 8분    |

---

## 문제 해결

| 오류 | 해결 |
|------|------|
| `notebookId를 설정해주세요` | CONFIG.notebookId에 실제 ID 입력 |
| NotebookLM 인증 오류 | 터미널에서 `nlm login` 재실행 |
| Claude 세션 한도 초과 | 한도 리셋 후 `/workflow pipeline.js` 재실행 (이전 결과 캐시됨) |
| 추출 건수가 너무 적음 | 노트북에 소스 추가 후 재실행 |
