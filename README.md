# matdb-builder

NotebookLM에 올린 논문에서 수치 데이터를 자동 추출하는 파이프라인 도구입니다.

## 사전 준비 (최초 1회)

### 1. Claude Code 설치
- https://claude.ai/code 에서 Desktop 앱 다운로드
- Claude Pro 구독 필요 (월 $20)

### 2. NotebookLM MCP 설치 및 로그인
```bash
npm install -g notebooklm-mcp
nlm login
```
`nlm login` 실행 후 브라우저에서 Google 계정 로그인.

> **MCP 설정은 자동입니다.** 이 repo를 clone하면 `.claude/settings.json`이 포함되어 있어 Claude Code가 자동으로 NotebookLM MCP를 인식합니다.

---

## 실행 방법

```bash
git clone https://github.com/dudtjq414/matdb-builder.git
cd matdb-builder
npm install
npm run dev
```

브라우저에서 `http://localhost:3000/pipeline` 열기.

---

## 사용법

1. NotebookLM에 논문 PDF/URL을 소스로 추가
2. 파이프라인 페이지에서 노트북 URL + 연구 파라미터 입력
3. **"파이프라인 자동 실행"** 버튼 클릭
4. 5~10분 후 결과 테이블에서 데이터 확인 · JSON/CSV 내보내기

자세한 사용법은 [PIPELINE_README.md](./PIPELINE_README.md)를 참고하세요.
