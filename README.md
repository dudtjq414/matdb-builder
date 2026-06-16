# matdb-builder

연구 논문 PDF에서 재료 물성 수치 데이터를 자동으로 수집하여 검색·내보내기 가능한 데이터베이스로 만드는 도구입니다. NotebookLM과 Claude Code를 연동합니다.

---

## 사전 준비 (최초 1회)

### 1. Claude Code 설치

1. https://claude.ai/code 접속
2. **Download for Windows** (또는 Mac) 클릭하여 설치
3. 설치 후 Claude Code 실행
4. Claude Pro 구독 필요 (월 $20) — 구독하지 않았다면 앱 내에서 가입

### 2. Node.js 설치 확인

Claude Code 채팅창에서:

```
! node --version
```

버전이 출력되면 됩니다. Node.js가 없다면 https://nodejs.org 에서 설치하세요.

> **MCP 설정과 설치는 자동입니다.** 이 repo에 `.claude/settings.json`이 포함되어 있어 clone 후 Claude Code가 NotebookLM MCP를 자동으로 내려받고 실행합니다. 처음 파이프라인 실행 시 Google 로그인 창이 자동으로 열립니다.

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

Claude가 순서대로 진행합니다:

**0단계 (최초 1회)** — Google 로그인 확인. 로그인이 안 된 경우 브라우저 창이 열리면 NotebookLM에서 사용하는 Google 계정으로 로그인합니다.

**1~6단계** — 아래 정보를 하나씩 질문합니다:
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
