export const meta = {
  name: 'matdb-pipeline',
  description: 'NotebookLM + Claude 자동 데이터 추출 파이프라인',
  phases: [
    { title: '딥리서치', detail: 'NotebookLM이 웹에서 논문 자동 검색 및 소스 추가' },
    { title: '쿼리 생성', detail: 'Claude가 연구 도메인 특화 7개 쿼리 생성' },
    { title: 'NotebookLM 탐색', detail: '7개 쿼리 병렬 실행' },
    { title: '데이터 추출', detail: '각 라운드 결과에서 수치 파싱' },
    { title: '저장', detail: 'JSON 저장' },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  CONFIG — args로 전달받지 못한 경우의 기본값
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  notebookId: 'YOUR_NOTEBOOK_ID_HERE',
  material: '아민계 경화 에폭시 수지',
  propertyName: "Young's Modulus",
  unit: 'GPa',
  categoryLabel: '에폭시 계열',
  excludeNote: '',
  outputPath: './pipeline-result.json',
};

// ═══════════════════════════════════════════════════════════════
//  워크플로우 본문
// ═══════════════════════════════════════════════════════════════

function extractId(urlOrId) {
  const m = (urlOrId || '').match(/notebook\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : urlOrId;
}

// pipeline-config.json에서 설정 읽기
const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    notebookId:    { type: 'string' },
    material:      { type: 'string' },
    propertyName:  { type: 'string' },
    unit:          { type: 'string' },
    categoryLabel: { type: 'string' },
    excludeNote:   { type: 'string' },
    outputPath:    { type: 'string' },
  },
  required: ['notebookId', 'material', 'propertyName', 'unit', 'categoryLabel'],
};

const fileConfig = await agent(
  'pipeline-config.json 파일을 Read 도구로 읽고 내용을 StructuredOutput으로 반환하세요.',
  { label: '설정 읽기', schema: CONFIG_SCHEMA }
);

const notebookId    = extractId(fileConfig?.notebookId    || CONFIG.notebookId);
const material      = fileConfig?.material      || CONFIG.material;
const propertyName  = fileConfig?.propertyName  || CONFIG.propertyName;
const unit          = fileConfig?.unit          || CONFIG.unit;
const categoryLabel = fileConfig?.categoryLabel || CONFIG.categoryLabel;
const rawExclude    = fileConfig?.excludeNote   ?? CONFIG.excludeNote;
const excludeNote   = (rawExclude === '없음' || rawExclude === '-') ? '' : rawExclude;
const outputPath    = fileConfig?.outputPath    || CONFIG.outputPath;

if (!notebookId || notebookId === 'YOUR_NOTEBOOK_ID_HERE') {
  throw new Error('노트북 ID가 없습니다. pipeline-config.json 파일이 저장됐는지 확인하세요.');
}

// ── Phase 0: NotebookLM 딥리서치 — 논문 자동 검색 및 소스 추가 ──────────────
phase('딥리서치');

await agent(`
NotebookLM MCP의 딥리서치 기능으로 아래 주제 논문을 자동 검색하여 노트북에 소스로 추가하세요.

【연구 주제】
${material}의 ${propertyName}(단위: ${unit}) — ${categoryLabel} 기준 실험/시뮬레이션 데이터

【실행 순서】
1. mcp__notebooklm-mcp__research_start 도구를 호출하세요.
   - 노트북 ID: "${notebookId}"
   - 검색 주제: "${material} ${propertyName} ${unit} experimental measurement research papers"
   (영어로 검색해야 더 많은 논문이 검색됩니다)

2. research_start가 반환한 research ID로 mcp__notebooklm-mcp__research_status를 호출하여 상태를 확인하세요.
   완료(complete/done) 상태가 될 때까지 반복 확인하세요.

3. 완료되면 mcp__notebooklm-mcp__research_import를 호출하여 검색된 논문을 노트북 소스로 추가하세요.

추가된 소스 수를 반환하세요.
`, { label: '딥리서치 실행', phase: '딥리서치' });

log('딥리서치 완료 — 논문 소스 추가됨');

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
4. MD/ML 계산값 vs 실험값 대응 탐색: 동일 시스템의 시뮬레이션 예측값과 실험값 모두 보고된 사례
5. 최근 5년(2020-2025) 고성능 달성 사례와 구조-물성 메커니즘
6. 측정 방법 구별 및 수록 기준 검증 (방법별 수치 차이, 제외 기준 타당성)
7. 데이터 공백 특화 탐색: ${material}에서 ${propertyName} 데이터가 희소한 계열/조합 집중 탐색

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
