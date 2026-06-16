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

Claude Code 채팅창에서:

```
! npm install -g notebooklm-mcp
```

그 다음 Claude Code 채팅창에서 아래 명령을 실행합니다:

```
! cmd /c nlm login
```

> **`! nlm login`은 Windows에서 안 됩니다.** Claude Code의 `!`는 Git Bash를 사용하는데, Windows npm 전역 바이너리가 Git Bash PATH에 없습니다. `cmd /c`를 앞에 붙이면 Windows cmd를 거쳐 실행되어 `nlm`을 찾을 수 있습니다.
> Mac/Linux에서는 `! nlm login`을 그대로 사용하세요.

브라우저 창이 열리면 NotebookLM에서 사용하는 Google 계정으로 로그인합니다.

> **MCP 설정은 자동입니다.** 이 repo에 `.claude/settings.json`이 포함되어 있어 clone 후 Claude Code가 NotebookLM MCP를 자동으로 인식합니다.

---

## 설치

Claude Code 채팅창에서:

```
! git clone https://github.com/dudtjq414/matdb-builder.git
```

---

## 사용법

Claude Code에서 matdb-builder 폴더를 열고 채팅창에 입력합니다:

```
파이프라인 실행해줘
```

Claude가 아래 정보를 하나씩 질문합니다:

1. NotebookLM 노트북 URL
2. 연구 재료/시스템
3. 측정 물성
4. 단위
5. 분류 기준
6. 제외 기준 (선택 — 없으면 "없음" 입력)

모든 답변이 완료되면 자동으로 파이프라인이 실행됩니다. (약 5~10분 소요)

---

## 결과 확인

파이프라인 완료 후 `pipeline-result.json`이 생성됩니다.
`results-viewer.html`을 브라우저에서 열고 JSON 파일을 드래그하면 결과를 검색·필터링할 수 있습니다.

---

자세한 사용법은 [PIPELINE_README.md](./PIPELINE_README.md)를 참고하세요.
