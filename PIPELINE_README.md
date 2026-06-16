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
Claude Code 채팅창에서:
```
! npm install -g notebooklm-mcp
```
```
! nlm login
```
`! nlm login` 실행 후 브라우저에서 Google 계정 로그인.

### 이 repo clone
```
! git clone https://github.com/dudtjq414/matdb-builder.git
```
```
! cd matdb-builder && npm install && npm run dev
```

브라우저에서 `http://localhost:3000/pipeline` 접속.

> MCP 설정은 자동입니다 — `.claude/settings.json`이 repo에 포함되어 있어 별도 설정 불필요.

---

## 2. NotebookLM 준비

1. https://notebooklm.google.com 에서 새 노트북 생성
2. 논문 PDF 또는 URL을 소스로 추가 (많을수록 좋음, 최소 5편 권장)
3. 노트북 URL 복사:
   ```
   https://notebooklm.google.com/notebook/abc123-def456-...
                                           ↑ 이 URL 전체를 파이프라인 페이지에 붙여넣기
   ```

---

## 3. 파이프라인 설정

`http://localhost:3000/pipeline` 에서 입력란을 채웁니다:

```
NotebookLM URL : https://notebooklm.google.com/notebook/abc123-...
재료/시스템    : 아민계 경화 에폭시 수지
측정 물성      : Young's Modulus
단위           : GPa
분류 기준      : 에폭시 계열
제외 기준      : 압축시험, DMA 저장탄성률(E'), 나노인덴테이션
API 키         : (비워두기 — Claude Code 자동 사용)
```

### 입력값 작성 팁

| 필드 | 잘 쓴 예 | 잘못 쓴 예 |
|------|---------|----------|
| 재료/시스템 | `아민계 경화 에폭시 수지` | `에폭시` (너무 광범위) |
| 측정 물성 | `Young's Modulus` | `탄성률` (모호함) |
| 제외 기준 | `DMA E', 나노인덴테이션` | (비워두면 노이즈 많음) |
| 분류 기준 | `에폭시 계열` | `종류` (너무 모호함) |

**제외 기준을 구체적으로 쓸수록** 노이즈 데이터가 줄어듭니다.

---

## 4. 실행

**"파이프라인 자동 실행"** 버튼 클릭.

실행 시간: 약 5~10분 (7라운드 × NotebookLM 응답 대기)

---

## 5. 결과 확인

결과 테이블에서 재료명·계열·출처로 검색 후 JSON 또는 CSV로 내보내기.

---

## 활용 사례 (에폭시 DB 구축 실제 결과)

| 노트북 소스 수 | 추출 건수 | 소요 시간 |
|--------------|----------|----------|
| 31편 논문     | 95건      | 약 8분    |

---

## 문제 해결

| 오류 | 해결 |
|------|------|
| "Claude Code 연결됨"이 안 뜸 | Claude Code 실행 상태 확인, 또는 Gemini API 키 입력으로 대체 |
| NotebookLM MCP 쿼리 실패 | `! nlm login` 재실행 후 Google 재로그인 |
| 수동 붙여넣기 모드로 전환됨 | MCP 미설정 상태 — 각 라운드 쿼리를 직접 NotebookLM에 복사·붙여넣기 |
| 추출 건수가 너무 적음 | 노트북에 소스 추가 후 재실행 |
| Claude 세션 한도 초과 | 한도 리셋 후 페이지 새로고침, 완료된 라운드는 유지됨 |
