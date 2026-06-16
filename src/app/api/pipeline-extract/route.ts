import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { parseAnthropicError } from '@/lib/anthropicError';

export interface PipelineEntry {
  materialName: string;
  category: string;
  value: number;
  dataType: 'Exptl' | 'MD' | 'ML';
  reference: string;
  year: number;
  notes: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY;
  // apiKey 없으면 로컬 claude CLI 사용 (callLLM 내부에서 처리)

  const body = await req.json();
  const { pastedText, schema } = body as {
    pastedText: string;
    schema: {
      material: string;
      propertyName: string;
      unit: string;
      categoryLabel: string;
      excludeNote: string;
    };
  };

  if (!pastedText?.trim()) {
    return NextResponse.json({ entries: [] });
  }

  const systemPrompt = `당신은 재료과학 논문 데이터 추출 전문가입니다. JSON 배열만 반환하세요.`;

  const userPrompt = `아래 딥리서치 결과에서 "${schema.propertyName}" (단위: ${schema.unit}) 데이터를 추출하세요.

【재료/시스템】${schema.material}
【분류 기준】${schema.categoryLabel}
${schema.excludeNote ? `【제외 기준】${schema.excludeNote}` : ''}

【텍스트】
${pastedText.slice(0, 9000)}

【추출 규칙】
1. ${schema.unit} 단위 수치만 추출 (단위 변환 불가)
2. 제외 기준 데이터는 반드시 제외
3. dataType: "Exptl"(실험), "MD"(분자동역학), "ML"(머신러닝)
4. reference: "저자 (연도)" 형식 (예: "Kim et al. (2023)")
5. year: 발표 연도 숫자
6. 중복 제외 (같은 재료·값·출처는 1회만)
7. JSON 배열 외 텍스트 절대 금지

[
  {
    "materialName": "재료명",
    "category": "${schema.categoryLabel} 값",
    "value": 숫자,
    "dataType": "Exptl",
    "reference": "저자 (연도)",
    "year": 연도숫자,
    "notes": "측정방법, 특이사항"
  }
]`;

  try {
    const text = await callLLM(apiKey, systemPrompt, userPrompt, 3000);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ entries: [] });
    const entries: PipelineEntry[] = JSON.parse(match[0]);
    return NextResponse.json({ entries });
  } catch (err) {
    const { message, type } = parseAnthropicError(err);
    return NextResponse.json({ error: message, errorType: type }, { status: 500 });
  }
}
