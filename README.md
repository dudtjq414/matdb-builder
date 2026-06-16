# matdb-builder

논문·기술 데이터시트·보고서에서 재료 물성 수치 데이터를 자동으로 수집하여 검색·내보내기 가능한 데이터베이스로 만드는 도구입니다.  
NotebookLM의 딥리서치 기능과 Claude Code(AI)를 연동하며, **코드 수정 없이 채팅창 질문만으로** 전체 파이프라인이 실행됩니다.

> **실제 사례**: 아민계 에폭시 수지의 Young's Modulus 데이터 **95건**을 31편 논문에서 **약 8분** 만에 자동 추출

---

## 전체 흐름

```mermaid
flowchart LR
    A["① 최초 1회\n사전 준비"] --> B["② cd matdb-builder\n&& claude 실행"]
    B --> C["③ 채팅창:\n파이프라인 실행해줘"]
    C --> D["④ Claude가 7가지\n정보 수집"]
    D --> E["⑤ 파이프라인\n자동 실행 5~10분"]
    E --> F["⑥ results-viewer.html\n검색·CSV 내보내기"]
```

### 파이프라인 내부 구조

```mermaid
flowchart TD
    P0["Phase 0: 딥리서치\nNotebookLM이 웹에서\n논문·데이터시트 자동 수집"]
    P1["Phase 1: 쿼리 7개 생성\n연구 도메인 특화"]
    P2["Phase 2: NotebookLM 탐색\n7개 쿼리 병렬 실행"]
    P3["Phase 3: 데이터 추출\n수치·출처·연도·유형 파싱"]
    P4["Phase 4: JSON 저장\n중복 제거 후 저장"]
    P0 --> P1 --> P2 --> P3 --> P4
```

---

## 사전 준비 (최초 1회)

| 항목 | 방법 |
|------|------|
| **Claude Code 설치** | [https://claude.ai/code](https://claude.ai/code) — Claude Pro 구독 필요 (월 $20) |
| **Python 3.8+** | `python --version` 으로 확인. 없으면 [python.org](https://python.org) 설치 |
| **NotebookLM MCP CLI** | PowerShell: `pip install notebooklm-mcp-cli` |
| **NotebookLM 로그인** | PowerShell: `nlm login` → 브라우저에서 Google 계정 로그인 |

---

## 설치 및 시작

```powershell
git clone https://github.com/dudtjq414/matdb-builder.git
cd matdb-builder
claude
```

> **⚠️ 반드시 `cd matdb-builder` 후 `claude`를 실행**해야 합니다.  
> Claude Code가 matdb-builder 폴더에서 시작되어야 `.claude/settings.json`이 로드되어 NotebookLM MCP가 자동으로 연결됩니다.  
> Claude Code 채팅창에서 `! cd matdb-builder`를 입력하는 방법은 **동작하지 않습니다.**

---

## 사용법

Claude Code 채팅창에 입력:

```
파이프라인 실행해줘
```

Claude가 아래 7가지 정보를 하나씩 질문합니다:

| # | 질문 항목 | 입력 예시 |
|---|-----------|----------|
| 1 | NotebookLM 노트북 URL | `https://notebooklm.google.com/notebook/abc123-...` |
| 2 | 연구 재료/시스템 | `아민계 경화 에폭시 수지` |
| 3 | 측정 물성 | `Young's Modulus` |
| 4 | 물성 단위 | `GPa` |
| 5 | 데이터 분류 기준 | `에폭시 계열` |
| 6 | 제외할 측정 방법 | `DMA E', 나노인덴테이션` (없으면 `없음`) |
| 7 | 결과 파일명 | `epoxy-youngs-modulus.json` (없으면 `없음`) |

모든 답변이 완료되면 **자동으로 파이프라인이 실행**됩니다. (약 5~10분 소요)

---

## 결과 확인

파이프라인 완료 후 지정한 JSON 파일이 생성됩니다.  
`results-viewer.html`을 브라우저에서 열고 JSON 파일을 드래그하면 결과를 검색·필터링·CSV 내보내기할 수 있습니다.

---

자세한 사용법은 [PIPELINE_README.md](./PIPELINE_README.md)를 참고하세요.
