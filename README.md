# matdb-builder

연구 논문 PDF에서 재료 물성 수치 데이터를 자동으로 수집하여 검색·내보내기 가능한 데이터베이스로 만드는 도구입니다. NotebookLM과 Claude Code를 연동합니다.

---

## 사전 준비 (최초 1회)

### 1. Claude Code 설치

1. https://claude.ai/code 접속
2. **Download for Windows** (또는 Mac) 클릭하여 설치
3. 설치 후 Claude Code 실행
4. Claude Pro 구독 필요 (월 $20) — 구독하지 않았다면 앱 내에서 가입

### 2. NotebookLM MCP 설치 및 로그인

Claude Code를 열고 채팅창에 아래 명령어를 입력합니다 (`!` 를 앞에 붙이면 터미널 명령으로 실행됩니다):

```
! npm install -g notebooklm-mcp
```

설치 완료 후 Google 계정 로그인:

```
! nlm login
```

브라우저 창이 열리면 NotebookLM에서 사용하는 Google 계정으로 로그인합니다.

> **MCP 설정은 자동입니다.** 이 repo에 `.claude/settings.json`이 포함되어 있어 clone 후 Claude Code가 NotebookLM MCP를 자동으로 인식합니다.

---

## 실행 방법

Claude Code 채팅창에서 순서대로 입력합니다:

```
! git clone https://github.com/dudtjq414/matdb-builder.git
```

```
! cd matdb-builder && npm install && npm run dev
```

브라우저에서 아래 주소로 접속합니다:

```
http://localhost:3000/pipeline
```

---

## 사용법

1. **NotebookLM 준비** — https://notebooklm.google.com 에서 새 노트북 생성 후 논문 PDF·URL을 소스로 추가
2. **파이프라인 설정** — 노트북 URL, 재료명, 측정 물성, 단위 등 입력
3. **자동 실행** — "파이프라인 자동 실행" 버튼 클릭
4. **결과 확인** — 5~10분 후 데이터 테이블에서 검색·JSON/CSV 내보내기

자세한 사용법은 [PIPELINE_README.md](./PIPELINE_README.md)를 참고하세요.
