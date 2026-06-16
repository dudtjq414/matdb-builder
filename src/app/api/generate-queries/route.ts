import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { parseAnthropicError } from '@/lib/anthropicError';

export interface GeneratedQuery {
  title: string;
  badge: string;
  prompt: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY ?? '';

  const body = await req.json();
  const { schema } = body as {
    schema: {
      dbName: string;
      material: string;
      propertyName: string;
      unit: string;
      categoryLabel: string;
      excludeNote: string;
      customFields: { key: string; label: string }[];
    };
  };

  if (!schema.material || !schema.propertyName) {
    return NextResponse.json({ error: '재료명과 물성명이 필요합니다.' }, { status: 400 });
  }

  const systemPrompt = `당신은 재료과학 분야의 문헌 탐색 전문가입니다.
사용자가 제공한 연구 스키마를 분석하여 NotebookLM 딥리서치에 최적화된 쿼리 6개를 생성합니다.

각 쿼리는:
- 연구 도메인 특성을 충분히 반영한 구체적인 내용이어야 합니다
- NotebookLM 채팅창에 바로 붙여넣을 수 있는 완결된 형태여야 합니다
- 표 형식 출력 요청을 포함해야 합니다
- 반드시 JSON 배열로만 응답하세요. JSON 외 텍스트는 절대 포함하지 마세요.`;

  const mdOnlyNote = schema.excludeNote
    ? `- 수록 제외 기준: ${schema.excludeNote}`
    : '';

  const userPrompt = `아래 연구 스키마에 맞는 NotebookLM 딥리서치 쿼리 7개를 생성해주세요.

【연구 스키마】
- DB 이름: ${schema.dbName}
- 재료/시스템: ${schema.material}
- 측정 물성: ${schema.propertyName} (단위: ${schema.unit})
- 주요 분류 기준: ${schema.categoryLabel}
${mdOnlyNote}
- 추가 필드: ${schema.customFields.length > 0 ? schema.customFields.map(f => f.label).join(', ') : '없음'}

【쿼리 7개 구성 지침】
1. 종합 탐색: 전체 ${schema.categoryLabel} 계열 수치 데이터를 표 형식으로 망라 (인장/굽힘 시험 실험값 우선)
2. 분류별 심층: ${schema.categoryLabel}에 따른 ${schema.propertyName} 차이를 정량적으로 비교 (범위·평균·대표값 포함)
3. 친환경/바이오/신소재 계열 실험값 탐색 (해당 분야 최신 트렌드, 범용 재료 대비 수치 비교 포함)
4. MD/ML 계산값 vs 실험값 대응 탐색: 같은 시스템에 대해 시뮬레이션 예측값과 실제 측정값이 모두 보고된 사례를 찾아 오차율 분석. **특히 MD 시뮬레이션 값만 있고 실험값이 보고되지 않은 조합을 주목하여 해당 실험값을 우선 탐색**
5. 최근 5년(2020–2025) 고성능 달성 사례와 구조-물성 메커니즘
6. 측정 방법 구별 및 수록 기준 검증 (인장·굽힘·DMA·나노인덴테이션 등 방법별 수치 차이, 제외 기준 타당성)
7. 데이터 공백 탐색: ${schema.material} 분야에서 **아직 ${schema.propertyName} 데이터가 희소한 계열이나 조합**(예: 특정 경화제 계열, 상업용 바이오 에폭시 신제품, 최신 논문의 미보고 조합)을 집중 탐색하고 발견되는 모든 수치 데이터를 표로 정리

각 쿼리는 "${schema.material}"와 "${schema.propertyName}" 분야에 특화된 구체적인 내용으로 작성하세요.
특히 쿼리 4(MD vs 실험값)와 쿼리 7(공백 탐색)은 기존에 시뮬레이션 예측치만 알려져 있고 실험적 검증이 부족한 조합을 적극적으로 발굴하는 것을 목표로 하세요.

【반환 형식】 (JSON만, 설명 텍스트 없이)
[
  { "badge": "1라운드", "title": "쿼리 제목", "prompt": "NotebookLM에 붙여넣을 전체 쿼리 텍스트" },
  ...7개
]`;

  try {
    const text = await callLLM(apiKey, systemPrompt, userPrompt, 4096);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: '쿼리 생성 응답 파싱 실패', raw: text.slice(0, 500) }, { status: 500 });
    }
    const queries: GeneratedQuery[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ queries });
  } catch (err) {
    const { message, type } = parseAnthropicError(err);
    return NextResponse.json({ error: message, errorType: type }, { status: 500 });
  }
}
