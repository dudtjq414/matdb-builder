import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { parseAnthropicError } from '@/lib/anthropicError';

interface ExtractedEntry {
  materialName: string;
  category: string;
  value: number;
  notes: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 503 });
  }

  const body = await req.json();
  const { pastedText, schema } = body as {
    pastedText: string;
    schema: {
      material: string;
      propertyName: string;
      unit: string;
      categoryLabel: string;
      excludeNote: string;
      customFields: { key: string; label: string }[];
    };
  };

  if (!pastedText?.trim()) {
    return NextResponse.json({ error: '붙여넣기 텍스트가 없습니다.' }, { status: 400 });
  }

  const customFieldDesc = schema.customFields.length > 0
    ? `- 추가 필드: ${schema.customFields.map(f => f.label).join(', ')}`
    : '';

  const systemPrompt = `당신은 재료과학 딥리서치 결과에서 수치 데이터를 추출하는 전문가입니다. 반드시 JSON 배열로만 응답하세요.`;

  const userPrompt = `아래는 NotebookLM의 딥리서치 결과 텍스트입니다.
이 텍스트에서 "${schema.propertyName}" (단위: ${schema.unit}) 측정값을 모두 추출해주세요.

【데이터베이스 스키마】
- 재료: ${schema.material}
- 물성: ${schema.propertyName} (${schema.unit})
- 분류 기준: ${schema.categoryLabel}
${customFieldDesc}
${schema.excludeNote ? `- 제외 기준: ${schema.excludeNote}` : ''}

【NotebookLM 딥리서치 결과】
${pastedText.slice(0, 8000)}

【지시사항】
1. ${schema.propertyName} 구체적인 수치 데이터를 빠짐없이 추출하세요.
2. 단위가 ${schema.unit}인 값만 추출하세요.
3. 제외 기준에 해당하는 데이터는 제외하세요.
4. 중복 수치는 한 번만 포함하세요.
5. JSON 배열로만 반환하세요. JSON 외 텍스트는 절대 포함하지 마세요.
6. 데이터가 없으면 빈 배열 []을 반환하세요.

【반환 형식】
[
  {
    "materialName": "재료명 (논문에 표기된 그대로)",
    "category": "${schema.categoryLabel} 값",
    "value": 숫자(${schema.unit} 단위),
    "notes": "측정 조건, 출처, 특이사항"
  }
]`;

  try {
    const text = await callLLM(apiKey, systemPrompt, userPrompt, 2048);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ entries: [] });
    const entries: ExtractedEntry[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ entries });
  } catch (err) {
    const { message, type } = parseAnthropicError(err);
    return NextResponse.json({ error: message, errorType: type }, { status: 500 });
  }
}
