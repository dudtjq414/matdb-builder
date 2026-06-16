/**
 * matdb-pipeline.js
 *
 * NotebookLM + Claude 자동 데이터 추출 파이프라인
 *
 * 사용법:
 *   1. 아래 CONFIG 섹션의 값을 본인 연구에 맞게 수정
 *   2. Claude Code 세션에서 실행:
 *        /workflow pipeline.js
 *      또는 Claude Code 채팅에서:
 *        "이 파일을 워크플로우로 실행해줘" + 파일 첨부
 *
 * 사전 준비:
 *   - Claude Code 설치 (claude.ai/code)
 *   - NotebookLM MCP 설정 (아래 README 참고)
 *   - NotebookLM에 논문 소스 업로드 완료
 */

// ═══════════════════════════════════════════════════════════════
//  CONFIG — 여기만 수정하세요
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // NotebookLM 노트북 ID
  // 방법: notebooklm.google.com → 노트북 열기 → URL에서 복사
  // 예: https://notebooklm.google.com/notebook/abc123-def456 → "abc123-def456"
  notebookId: 'YOUR_NOTEBOOK_ID_HERE',

  // 연구 대상 재료 (구체적일수록 좋음)
  material: '아민계 경화 에폭시 수지',

  // 측정하려는 물성
  propertyName: "Young's Modulus",

  // 물성 단위
  unit: 'GPa',

  // 데이터 분류 기준 (표의 주요 열 기준)
  // 예: "에폭시 계열", "경화제 종류", "온도", "섬유 배향각"
  categoryLabel: '에폭시 계열',

  // 제외할 데이터 유형 (있으면 노이즈 크게 줄어듦)
  // 예: "압축시험, DMA 저장탄성률(E'), 나노인덴테이션"
  // 없으면 빈 문자열: ''
  excludeNote: "압축시험(compression test), DMA 저장탄성률(E'), 나노인덴테이션, Split-Hopkinson Bar 시험",

  // 결과 저장 경로 (절대 경로 또는 상대 경로)
  outputPath: './pipeline-result.json',
};

// ═══════════════════════════════════════════════════════════════
//  워크플로우 본문 — 수정 불필요
// ═══════════════════════════════════════════════════════════════

export const meta = {
  name: 'matdb-pipeline',
  description: 'NotebookLM + Claude 자동 데이터 추출 파이프라인',
  phases: [
    { title: '쿼리 생성', detail: 'Claude가 연구 도메인 특화 7개 쿼리 생성' },
    { title: 'NotebookLM 탐색', detail: '7개 쿼리 병렬 실행' },
    { title: '데이터 추출', detail: '각 라운드 결과에서 수치 파싱' },
    { title: '저장', detail: 'JSON 저장' },
  ],
};

const { notebookId, material, propertyName, unit, categoryLabel, excludeNote, outputPath } = CONFIG;

if (notebookId === 'YOUR_NOTEBOOK_ID_HERE') {
  throw new Error('CONFIG.notebookId를 설정해주세요. NotebookLM URL에서 노트북 ID를 복사하세요.');
}

// ── Phase 1: 7개 쿼리 생성 ────────────────────────────────────────────────────
phase('쿼리 생성');

const QUERY_SCHEMA = {
  type: 'object',
  properties: {
    queries: {
      type: 'array',
      minItems: 7,
      items: {
        type: 'object',
        properties: {
          badge: { type: 'string' },
          title: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['badge', 'title', 'prompt'],
      },
    },
  },
  required: ['queries'],
};

const genResult = await agent(`
아래 연구 스키마에 맞는 NotebookLM 딥리서치 쿼리 7개를 생성해주세요.

【연구 스키마】
- 재료/시스템: ${material}
- 측정 물성: ${propertyName} (단위: ${unit})
- 주요 분류 기준: ${categoryLabel}
- 수록 제외 기준: ${excludeNote || '없음'}

【쿼리 7개 구성 지침】
1. 종합 탐색: 전체 ${categoryLabel} 계열 수치 데이터를 표 형식으로 망라 (인장/굽힘 실험값 우선)
2. 분류별 심층: ${categoryLabel}에 따른 ${propertyName} 차이를 정량적으로 비교 (범위·평균·대표값 포함)
3. 친환경/바이오/신소재 계열 실험값 탐색 (범용 재료 대비 수치 비교 포함)
4. MD/ML 계산값 vs 실험값 대응 탐색: 동일 시스템의 시뮬레이션 예측값과 실험값 모두 보고된 사례. 특히 MD 시뮬레이션 값만 있고 실험값이 없는 조합을 우선 발굴
5. 최근 5년(2020-2025) 고성능 달성 사례와 구조-물성 메커니즘
6. 측정 방법 구별 및 수록 기준 검증 (방법별 수치 차이, 제외 기준 타당성)
7. 데이터 공백 특화 탐색: ${material}에서 ${propertyName} 데이터가 희소한 계열/조합 집중 탐색 — 발견된 수치 전부 표로 정리

각 쿼리는 NotebookLM 채팅창에 바로 붙여넣을 수 있는 완결된 형태로, "${material}"와 "${propertyName}" 분야에 특화하여 작성하세요.
반드시 7개 정확히 반환하세요. StructuredOutput으로 반환하세요.
`, { label: '7개 쿼리 생성', phase: '쿼리 생성', schema: QUERY_SCHEMA });

const queries = genResult?.queries ?? [];
log(`생성된 쿼리: ${queries.length}개`);

// ── Phase 2: NotebookLM 7라운드 병렬 탐색 ────────────────────────────────────
phase('NotebookLM 탐색');

const NLM_SCHEMA = {
  type: 'object',
  properties: {
    badge: { type: 'string' },
    rawText: { type: 'string' },
  },
  required: ['badge', 'rawText'],
};

const roundResults = await parallel(queries.map((q, i) => () =>
  agent(`
NotebookLM MCP를 사용하여 아래 쿼리를 노트북 ID "${notebookId}"에서 실행하세요.

【쿼리】
${q.prompt}

mcp__notebooklm-mcp__notebook_query 도구를 호출하여 응답 전체를 rawText에 저장하세요.
StructuredOutput으로 반환하세요.
  `, {
    label: `NLM ${q.badge}`,
    phase: 'NotebookLM 탐색',
    schema: NLM_SCHEMA,
  }).then(r => r ? { ...r, badge: q.badge } : null)
));

const validRounds = roundResults.filter(Boolean);
log(`NotebookLM 응답: ${validRounds.length}/${queries.length}라운드`);

// ── Phase 3: 데이터 추출 ──────────────────────────────────────────────────────
phase('데이터 추출');

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          materialName: { type: 'string' },
          category: { type: 'string' },
          value: { type: 'number' },
          dataType: { type: 'string', enum: ['Exptl', 'MD', 'ML'] },
          reference: { type: 'string' },
          year: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['materialName', 'category', 'value', 'dataType', 'reference', 'year', 'notes'],
      },
    },
    excluded: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          materialName: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['materialName', 'reason'],
      },
    },
  },
  required: ['entries', 'excluded'],
};

const extractedPerRound = await parallel(validRounds.map((round) => () =>
  agent(`
아래 NotebookLM 딥리서치 결과(${round.badge})에서 ${material}의 ${propertyName}(${unit}) 데이터를 추출하세요.

【수록 기준】
- 인장 시험(tensile) 또는 굽힘 시험(flexural/bending) 측정값 수록
- MD/ML 시뮬레이션 계산값도 수록 가능 (dataType: "MD" 또는 "ML")
- 단위가 ${unit}인 값만 수록

【제외 기준】
${excludeNote ? excludeNote : '없음'}

【지시사항】
1. 위 기준을 만족하는 수치 데이터를 빠짐없이 추출하세요
2. 같은 재료라도 조건이 다르면 별도 항목으로 추출
3. 수치 없는 항목은 excluded에 이유와 함께 기재

【NotebookLM 응답 텍스트】
${(round.rawText ?? '').slice(0, 10000)}

StructuredOutput으로 반환하세요.
  `, {
    label: `추출 ${round.badge}`,
    phase: '데이터 추출',
    schema: EXTRACT_SCHEMA,
  })
));

// ── Phase 4: 중복 제거 + 저장 ────────────────────────────────────────────────
phase('저장');

const allEntries = extractedPerRound.filter(Boolean).flatMap(r => r.entries ?? []);
const allExcluded = extractedPerRound.filter(Boolean).flatMap(r => r.excluded ?? []);

const seen = new Set();
const deduped = allEntries.filter(e => {
  const key = `${e.materialName.trim().toLowerCase()}|${e.value}|${e.dataType}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const byCategory = {};
for (const e of deduped) {
  byCategory[e.category] = (byCategory[e.category] || 0) + 1;
}

log(`추출 완료: ${deduped.length}건 수록 / ${allExcluded.length}건 제외`);
log(`계열별: ${JSON.stringify(byCategory, null, 2)}`);

const result = {
  material,
  propertyName,
  unit,
  notebookId,
  totalEntries: deduped.length,
  totalExcluded: allExcluded.length,
  byCategory,
  queries: queries.map(q => ({ badge: q.badge, title: q.title, prompt: q.prompt })),
  entries: deduped,
  excluded: allExcluded,
};

await agent(`
아래 JSON을 파일 "${outputPath}"에 Write 도구로 저장하세요.

${JSON.stringify(result, null, 2)}
`, { label: '결과 저장', phase: '저장' });

return {
  total: deduped.length,
  excluded: allExcluded.length,
  byCategory,
  outputPath,
};
