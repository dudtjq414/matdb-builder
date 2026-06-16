'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DBSchema, DataEntry, DBProject, CustomField } from '@/lib/types';

const LS_GEMINI = 'matdb-gemini-key';
const LS_ANTHROPIC = 'matdb-anthropic-key';

function useApiKey() {
  const [apiKey, setApiKeyState] = useState('');
  useEffect(() => {
    // Gemini 키 우선, 없으면 Anthropic 키
    const saved = localStorage.getItem(LS_GEMINI) || localStorage.getItem(LS_ANTHROPIC) || '';
    setApiKeyState(saved);
  }, []);
  function setApiKey(val: string) {
    setApiKeyState(val);
    if (!val) {
      localStorage.removeItem(LS_GEMINI);
      localStorage.removeItem(LS_ANTHROPIC);
    } else if (val.startsWith('AIza')) {
      localStorage.setItem(LS_GEMINI, val);
      localStorage.removeItem(LS_ANTHROPIC);
    } else {
      localStorage.setItem(LS_ANTHROPIC, val);
      localStorage.removeItem(LS_GEMINI);
    }
  }
  return { apiKey, setApiKey };
}

function apiFetch(url: string, options: RequestInit, apiKey: string) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(options.headers ?? {}),
    },
  });
}

// ── API 키 입력 패널 ──────────────────────────────────────────────────────────
function ApiKeyPanel({ apiKey, setApiKey }: { apiKey: string; setApiKey: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'gemini' | 'anthropic'>('gemini');
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);

  const isGemini = apiKey.startsWith('AIza');
  const providerLabel = !apiKey ? 'API 키 필요' : isGemini ? 'Gemini 키 설정됨' : 'Anthropic 키 설정됨';

  useEffect(() => {
    if (open) {
      setInput(apiKey);
      setTab(apiKey.startsWith('AIza') ? 'gemini' : 'anthropic');
    }
  }, [open, apiKey]);

  function save() {
    setApiKey(input.trim());
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          apiKey ? 'border-emerald-700 text-emerald-400 hover:border-emerald-500'
                 : 'border-amber-700 text-amber-400 hover:border-amber-500 animate-pulse'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {providerLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-88 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3" style={{width: '22rem'}}>
          {/* 탭 */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
            <button onClick={() => { setTab('gemini'); setInput(''); }}
              className={`flex-1 py-2 font-medium transition-colors ${tab === 'gemini' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              Gemini <span className="text-emerald-300 font-bold">무료</span>
            </button>
            <button onClick={() => { setTab('anthropic'); setInput(''); }}
              className={`flex-1 py-2 font-medium transition-colors ${tab === 'anthropic' ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              Anthropic (유료)
            </button>
          </div>

          {tab === 'gemini' ? (
            <div className="space-y-2">
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3 text-xs text-emerald-300 space-y-1">
                <p className="font-semibold">Google Gemini API — 완전 무료</p>
                <p className="text-emerald-400/80">• 신용카드·결제 없이 하루 1,500회 무료<br />• Google 계정만 있으면 즉시 발급</p>
              </div>
              <div className="flex gap-2">
                <input type={show ? 'text' : 'password'} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="AIza..."
                  className="flex-1 bg-slate-800 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono" />
                <button onClick={() => setShow(s => !s)} className="px-2 text-slate-500 hover:text-slate-300 text-xs border border-slate-700 rounded-lg">{show ? '숨김' : '표시'}</button>
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={!input.trim()} className="flex-1 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg font-medium">저장</button>
                {apiKey && <button onClick={() => { setApiKey(''); setInput(''); setOpen(false); }} className="px-3 py-1.5 text-xs text-red-400 border border-slate-700 rounded-lg">삭제</button>}
              </div>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                className="block text-xs text-emerald-400 hover:text-emerald-300 text-center pt-1">
                무료 키 발급 → aistudio.google.com/apikey ↗
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Claude Haiku를 사용합니다. API 크레딧이 필요합니다 (Claude Pro 구독과 별개).</p>
              <div className="flex gap-2">
                <input type={show ? 'text' : 'password'} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="sk-ant-..."
                  className="flex-1 bg-slate-800 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono" />
                <button onClick={() => setShow(s => !s)} className="px-2 text-slate-500 hover:text-slate-300 text-xs border border-slate-700 rounded-lg">{show ? '숨김' : '표시'}</button>
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={!input.trim()} className="flex-1 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-medium">저장</button>
                {apiKey && <button onClick={() => { setApiKey(''); setInput(''); setOpen(false); }} className="px-3 py-1.5 text-xs text-red-400 border border-slate-700 rounded-lg">삭제</button>}
              </div>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="block text-xs text-indigo-400 hover:text-indigo-300 text-center pt-1">
                API 키 발급 → console.anthropic.com ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExtractedEntry {
  materialName: string;
  category: string;
  value: number;
  notes: string;
}

interface GeneratedQuery {
  title: string;
  badge: string;
  prompt: string;
}

// ── 단계 표시기 ──────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = ['1 연구 정의', '2 NotebookLM 탐색', '3 데이터 입력'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              active ? 'bg-indigo-600 text-white' :
              done  ? 'bg-indigo-900/60 text-indigo-300' :
                      'bg-slate-800 text-slate-500'
            }`}>
              {done && <span className="text-xs">✓</span>}
              {label}
            </div>
            {i < 2 && <span className="text-slate-600">→</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── 공통 입력 ──────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-0.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-indigo-500 w-full";

// ── Step 1: 스키마 설정 ──────────────────────────────────────────────────────
function SchemaStep({ schema, onChange }: { schema: DBSchema; onChange: (s: DBSchema) => void }) {
  function set(key: keyof DBSchema, val: string) { onChange({ ...schema, [key]: val }); }
  function setCustom(i: number, field: Partial<CustomField>) {
    const cf = [...schema.customFields]; cf[i] = { ...cf[i], ...field };
    onChange({ ...schema, customFields: cf });
  }
  function addCustom() {
    if (schema.customFields.length >= 3) return;
    onChange({ ...schema, customFields: [...schema.customFields, { key: `field${schema.customFields.length + 1}`, label: '' }] });
  }
  function removeCustom(i: number) { onChange({ ...schema, customFields: schema.customFields.filter((_, idx) => idx !== i) }); }

  return (
    <div className="space-y-5">
      <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 text-sm text-indigo-300">
        여기서 입력한 정보를 바탕으로 다음 단계에서 <strong>Claude가 연구 도메인에 특화된 NotebookLM 딥리서치 쿼리 7개</strong>를 직접 생성합니다.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="데이터베이스 이름 *" hint="예: 아민 경화 에폭시 영률 데이터베이스">
          <input className={inputCls} value={schema.dbName} onChange={e => set('dbName', e.target.value)} placeholder="예: 탄소섬유 복합재 ILSS 데이터베이스" />
        </Field>
        <Field label="주요 재료 분야 *" hint="예: 아민계 경화 에폭시 수지">
          <input className={inputCls} value={schema.material} onChange={e => set('material', e.target.value)} placeholder="예: 탄소섬유 강화 에폭시 복합재" />
        </Field>
        <Field label="측정 물성명 *" hint="예: Young's Modulus">
          <input className={inputCls} value={schema.propertyName} onChange={e => set('propertyName', e.target.value)} placeholder="예: 층간전단강도 (ILSS)" />
        </Field>
        <Field label="단위 *" hint="예: GPa, MPa, W/mK">
          <input className={inputCls} value={schema.unit} onChange={e => set('unit', e.target.value)} placeholder="예: MPa" />
        </Field>
        <Field label="주요 분류 기준 *" hint="차트 그룹화에 사용 (예: 에폭시 계열)">
          <input className={inputCls} value={schema.categoryLabel} onChange={e => set('categoryLabel', e.target.value)} placeholder="예: 섬유 종류" />
        </Field>
        <Field label="수록 제외 기준" hint="품질 관리용 — 비워도 됨">
          <input className={inputCls} value={schema.excludeNote} onChange={e => set('excludeNote', e.target.value)} placeholder="예: 압축시험·DMA 저장탄성률 제외" />
        </Field>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-300">추가 분류 필드 <span className="text-slate-500 text-xs">(선택, 최대 3개)</span></p>
          {schema.customFields.length < 3 && (
            <button onClick={addCustom} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800 rounded px-2 py-1">+ 필드 추가</button>
          )}
        </div>
        <div className="space-y-2">
          {schema.customFields.map((cf, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={`${inputCls} flex-1`} value={cf.label}
                onChange={e => setCustom(i, { label: e.target.value, key: e.target.value.replace(/\s+/g, '_').toLowerCase() || `field${i + 1}` })}
                placeholder="필드 이름 (예: 경화제 종류)" />
              <button onClick={() => removeCustom(i)} className="text-slate-500 hover:text-red-400 px-2">✕</button>
            </div>
          ))}
          {schema.customFields.length === 0 && <p className="text-xs text-slate-600 italic">예: 경화제 종류, 함침 방법, 적층 방향 등</p>}
        </div>
      </div>
    </div>
  );
}

// ── 클라이언트 사이드 프롬프트 생성 (Claude.ai 수동 모드용) ──────────────────
function buildManualGenPrompt(schema: DBSchema): string {
  return `아래 연구 스키마에 맞는 NotebookLM 딥리서치 쿼리 7개를 생성해주세요.

【연구 스키마】
- 재료/시스템: ${schema.material}
- 측정 물성: ${schema.propertyName} (단위: ${schema.unit})
- 주요 분류 기준: ${schema.categoryLabel}
- 수록 제외 기준: ${schema.excludeNote || '없음'}
- 추가 필드: ${schema.customFields.length > 0 ? schema.customFields.map(f => f.label).join(', ') : '없음'}

【쿼리 7개 구성】
1. 전체 ${schema.categoryLabel} 계열 수치 데이터를 표 형식으로 망라 (인장/굽힘 실험값 우선)
2. ${schema.categoryLabel}에 따른 ${schema.propertyName} 차이를 정량적으로 비교 (범위·평균·대표값 포함)
3. 친환경/바이오/신소재 계열 실험값 탐색 (범용 재료 대비 수치 비교 포함)
4. MD/ML 계산값 vs 실험값 대응 탐색 — 시뮬레이션 예측값만 있고 실험 검증이 없는 조합의 실험값 우선 발굴
5. 최근 5년(2020–2025) 고성능 달성 사례와 구조-물성 메커니즘
6. 측정 방법 구별 및 수록 기준 검증 (인장·굽힘·DMA·나노인덴테이션 수치 차이, 제외 기준 타당성)
7. 데이터 공백 탐색 — ${schema.material}에서 ${schema.propertyName} 데이터가 희소한 계열·조합을 집중 탐색, 발견된 수치 전부 표로 정리

쿼리 4와 7은 기존에 시뮬레이션값만 알려져 있고 실험 검증이 부족한 조합을 적극 발굴하는 것을 목표로 하세요.
각 쿼리는 "${schema.material}"와 "${schema.propertyName}" 분야에 특화하여 전문적으로 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 설명 텍스트 없이):
[
  { "badge": "1라운드", "title": "쿼리 제목", "prompt": "NotebookLM에 붙여넣을 전체 쿼리 텍스트" },
  ... 총 7개
]`;
}

function buildManualExtractPrompt(pastedText: string, schema: DBSchema): string {
  return `아래 NotebookLM 딥리서치 결과에서 "${schema.propertyName}" (단위: ${schema.unit}) 수치 데이터를 모두 추출해주세요.

【수록 기준】
- 재료: ${schema.material}
- 분류 기준: ${schema.categoryLabel}
- 단위: ${schema.unit}인 값만 수록
${schema.excludeNote ? `- 제외: ${schema.excludeNote}` : ''}

【NotebookLM 결과】
${pastedText.slice(0, 6000)}

반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 텍스트 없이):
[
  {
    "materialName": "재료명",
    "category": "${schema.categoryLabel} 값",
    "value": 숫자,
    "notes": "측정 조건/출처"
  }
]`;
}

function parseJsonFromText(text: string): ExtractedEntry[] | GeneratedQuery[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ── Step 2: NotebookLM 탐색 ──────────────────────────────────────────────────
function NotebookLMStep({
  schema,
  onExtracted,
  apiKey,
}: {
  schema: DBSchema;
  onExtracted: (entries: Omit<DataEntry, 'id'>[]) => void;
  apiKey: string;
}) {
  // API 키 없거나 크레딧 부족이면 자동으로 수동 모드 시작
  const [mode, setMode] = useState<'api' | 'manual'>(apiKey ? 'api' : 'manual');
  const [queries, setQueries] = useState<GeneratedQuery[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // 수동 모드 — 쿼리 생성 프롬프트 붙여넣기
  const [manualGenPromptCopied, setManualGenPromptCopied] = useState(false);
  const [manualGenResponse, setManualGenResponse] = useState('');
  const [manualGenError, setManualGenError] = useState('');

  const [activeRound, setActiveRound] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const [pasteTexts, setPasteTexts] = useState<string[]>(Array(10).fill(''));

  // 수동 추출 모드: 라운드별 추출 프롬프트 상태
  const [extractPromptCopied, setExtractPromptCopied] = useState<number | null>(null);
  const [manualExtractResponse, setManualExtractResponse] = useState<string[]>(Array(10).fill(''));

  const [parsing, setParsing] = useState<number | null>(null);
  const [parsed, setParsed] = useState<Record<number, ExtractedEntry[]>>({});

  // API 키 생기면 자동으로 API 모드로
  useEffect(() => { if (apiKey && mode === 'manual' && !queries) setMode('api'); }, [apiKey]);

  async function generateViaApi() {
    setGenerating(true); setGenError(null);
    try {
      const res = await apiFetch('/api/generate-queries', { method: 'POST', body: JSON.stringify({ schema }) }, apiKey);
      const data = await res.json();
      if (data.errorType === 'billing' || data.error === 'credit_low') { setGenError('billing'); return; }
      if (data.error) { setGenError(data.error); return; }
      setQueries(data.queries ?? []);
    } finally {
      setGenerating(false);
    }
  }

  function applyManualGenResponse() {
    const parsed = parseJsonFromText(manualGenResponse) as GeneratedQuery[] | null;
    if (!parsed || parsed.length === 0 || !parsed[0].prompt) {
      setManualGenError('JSON을 찾지 못했습니다. Claude.ai 응답 전체를 그대로 붙여넣으세요.');
      return;
    }
    setManualGenError('');
    setQueries(parsed);
    setPasteTexts(Array(parsed.length).fill(''));
    setManualExtractResponse(Array(parsed.length).fill(''));
  }

  function copyQuery(i: number) {
    if (!queries) return;
    navigator.clipboard.writeText(queries[i].prompt).then(() => {
      setCopied(i); setTimeout(() => setCopied(null), 2000);
    });
  }

  function setPaste(i: number, val: string) {
    setPasteTexts(prev => { const a = [...prev]; a[i] = val; return a; });
  }
  function setManualExtract(i: number, val: string) {
    setManualExtractResponse(prev => { const a = [...prev]; a[i] = val; return a; });
  }

  function applyExtracted(i: number, entries: ExtractedEntry[]) {
    setParsed(prev => ({ ...prev, [i]: entries }));
    if (entries.length > 0) {
      onExtracted(entries.map(e => ({
        materialName: e.materialName,
        category: e.category,
        value: e.value,
        customValues: Object.fromEntries(schema.customFields.map(f => [f.key, ''])),
        reference: '',
        year: new Date().getFullYear(),
        notes: e.notes,
      })));
    }
  }

  async function doParseViaApi(i: number) {
    if (!pasteTexts[i].trim()) return;
    setParsing(i);
    try {
      const res = await apiFetch('/api/extract', { method: 'POST', body: JSON.stringify({ pastedText: pasteTexts[i], schema }) }, apiKey);
      const data = await res.json();
      if (data.errorType === 'billing' || data.error === 'credit_low') {
        setGenError('billing'); setMode('manual'); return;
      }
      if (data.error) { alert(data.error); return; }
      applyExtracted(i, data.entries ?? []);
    } finally { setParsing(null); }
  }

  function doParseManual(i: number) {
    const entries = parseJsonFromText(manualExtractResponse[i]) as ExtractedEntry[] | null;
    if (!entries) { alert('JSON을 찾지 못했습니다. Claude.ai 응답 전체를 그대로 붙여넣으세요.'); return; }
    applyExtracted(i, entries);
  }

  const totalExtracted = Object.values(parsed).reduce((sum, arr) => sum + arr.length, 0);
  const manualGenPrompt = buildManualGenPrompt(schema);

  return (
    <div className="space-y-5">
      {/* NotebookLM 준비 가이드 + 모드 선택 */}
      <div className="bg-slate-800/70 rounded-xl border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-bold text-white">NotebookLM 준비 순서</p>
          {/* 모드 전환 탭 */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
            <button
              onClick={() => setMode('api')}
              className={`px-3 py-1.5 transition-colors ${mode === 'api' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              API 자동 모드
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 transition-colors ${mode === 'manual' ? 'bg-violet-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Claude.ai 수동 모드
            </button>
          </div>
        </div>

        {mode === 'manual' && (
          <div className="bg-violet-950/40 border border-violet-800/60 rounded-lg p-3 text-xs text-violet-300">
            <strong>Claude Pro / claude.ai 사용:</strong> API 키·크레딧 불필요. 프롬프트를 복사해 claude.ai에 붙여넣고, 응답을 다시 여기에 붙여넣으면 됩니다.
          </div>
        )}

        <ol className="space-y-2">
          {[
            <><a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline font-medium">notebooklm.google.com</a> → 새 노트북 만들기 (Google 계정 필요)</>,
            <>소스 추가: 핵심 리뷰 논문 3–5편 URL 또는 PDF 업로드</>,
            mode === 'api'
              ? <>아래 <strong className="text-white">쿼리 생성하기</strong> 클릭 → 7개 쿼리 자동 생성</>
              : <>아래 <strong className="text-white">쿼리 생성 프롬프트 복사</strong> → <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">claude.ai</a>에 붙여넣기 → 응답 붙여넣기 → 쿼리 적용</>,
            <>각 라운드 쿼리 복사 → NotebookLM에 붙여넣기 → 결과 붙여넣기 → {mode === 'api' ? 'AI 파싱' : 'claude.ai 파싱'}</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-300">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 쿼리 미생성 상태 */}
      {!queries && (
        <div className="space-y-4">
          {/* API 모드 */}
          {mode === 'api' && (
            <div className="flex flex-col items-center gap-4 py-8 bg-slate-800/40 rounded-xl border border-dashed border-slate-600">
              <div className="text-center">
                <p className="text-white font-semibold text-sm mb-1">
                  Claude API가 <span className="text-indigo-400">{schema.material}</span> / <span className="text-indigo-400">{schema.propertyName}</span> 전용 쿼리를 생성합니다
                </p>
                <p className="text-slate-500 text-xs">연구 도메인에 맞는 NotebookLM 쿼리 7개를 자동 작성합니다</p>
              </div>
              <button onClick={generateViaApi} disabled={generating || !apiKey}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2">
                {generating ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Claude가 쿼리 생성 중…</>
                ) : 'Claude로 쿼리 생성하기'}
              </button>
              {!apiKey && <p className="text-xs text-amber-400">우측 상단에서 API 키를 먼저 입력하세요 (또는 수동 모드 사용)</p>}
              {genError === 'billing' && (
                <div className="bg-amber-950/50 border border-amber-700 rounded-xl p-4 text-sm text-center space-y-2 max-w-sm">
                  <p className="text-amber-300 font-semibold">Anthropic 크레딧이 부족합니다</p>
                  <p className="text-amber-400/80 text-xs">Claude Pro(claude.ai) 구독은 API 크레딧과 별개입니다.</p>
                  <div className="flex gap-2 justify-center mt-1">
                    <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg font-medium">크레딧 충전 →</a>
                    <button onClick={() => { setMode('manual'); setGenError(null); }}
                      className="px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white text-xs rounded-lg font-medium">수동 모드로 전환</button>
                  </div>
                </div>
              )}
              {genError && genError !== 'billing' && <p className="text-xs text-red-400">{genError}</p>}
            </div>
          )}

          {/* 수동 모드 — 쿼리 생성 프롬프트 */}
          {mode === 'manual' && (
            <div className="bg-slate-800/40 rounded-xl border border-violet-800/40 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">1단계: 쿼리 생성 프롬프트를 Claude.ai에 붙여넣기</p>
                  <p className="text-xs text-slate-400 mt-0.5">아래 프롬프트를 복사 → <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">claude.ai</a> 새 대화에 붙여넣기 → 응답 전체를 아래 칸에 붙여넣기</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(manualGenPrompt); setManualGenPromptCopied(true); setTimeout(() => setManualGenPromptCopied(false), 2000); }}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${manualGenPromptCopied ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300' : 'bg-violet-900/60 border-violet-700 text-violet-300 hover:border-violet-500'}`}
                >
                  {manualGenPromptCopied ? '✓ 복사됨' : '프롬프트 복사'}
                </button>
              </div>
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono bg-slate-900/60 rounded-lg p-3 max-h-36 overflow-y-auto border border-slate-700/50">{manualGenPrompt}</pre>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Claude.ai 응답 붙여넣기</label>
                <textarea
                  value={manualGenResponse}
                  onChange={e => setManualGenResponse(e.target.value)}
                  placeholder="claude.ai에서 받은 JSON 응답 전체를 여기에 붙여넣으세요..."
                  rows={4}
                  className="w-full bg-slate-900 text-slate-300 placeholder-slate-600 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-violet-500 resize-y font-mono"
                />
                <div className="flex items-center gap-3">
                  <button onClick={applyManualGenResponse} disabled={!manualGenResponse.trim()}
                    className="px-4 py-1.5 text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
                    쿼리 적용하기
                  </button>
                  {manualGenError && <p className="text-xs text-red-400">{manualGenError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 생성된 쿼리 — 라운드별 탐색 */}
      {queries && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {queries.map((q, i) => (
                <button key={i} onClick={() => setActiveRound(i)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    activeRound === i ? 'bg-indigo-600 border-indigo-500 text-white'
                    : parsed[i] ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-600 hover:text-slate-200'
                  }`}>
                  {parsed[i] ? `✓ ${q.badge}` : q.badge}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {totalExtracted > 0 && <span className="text-xs text-emerald-400">총 {totalExtracted}건 추출됨</span>}
              <button onClick={() => { setQueries(null); setGenError(null); setManualGenResponse(''); setManualGenError(''); }}
                className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-lg px-2 py-1">재생성</button>
            </div>
          </div>

          {queries.map((q, i) => (
            <div key={i} className={activeRound === i ? 'block' : 'hidden'}>
              <div className="bg-slate-800/70 rounded-xl border border-slate-700 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-indigo-400 font-medium">{q.badge}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{q.title}</h3>
                  </div>
                  <button onClick={() => copyQuery(i)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${copied === i ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-500 hover:text-indigo-300'}`}>
                    {copied === i ? '✓ 복사됨' : '쿼리 복사 → NotebookLM'}
                  </button>
                </div>

                <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-mono bg-slate-900/60 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-700/50">{q.prompt}</pre>

                {/* NotebookLM 결과 붙여넣기 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-indigo-900 text-indigo-300 text-xs flex items-center justify-center">↓</span>
                    NotebookLM 결과 붙여넣기
                  </label>
                  <textarea
                    value={pasteTexts[i]}
                    onChange={e => setPaste(i, e.target.value)}
                    placeholder="NotebookLM 응답 전체를 여기에 붙여넣으세요..."
                    rows={5}
                    className="w-full bg-slate-900 text-slate-300 placeholder-slate-600 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-indigo-500 resize-y font-mono"
                  />
                </div>

                {/* 파싱: API 모드 */}
                {mode === 'api' && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => doParseViaApi(i)} disabled={!pasteTexts[i].trim() || parsing === i}
                      className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
                      {parsing === i ? 'AI 파싱 중…' : 'AI 파싱 → 데이터 추출'}
                    </button>
                    {parsed[i] && <span className="text-xs text-emerald-400">{parsed[i].length > 0 ? `✓ ${parsed[i].length}건 추출됨` : '수치 없음'}</span>}
                  </div>
                )}

                {/* 파싱: 수동 모드 — claude.ai 파싱 프롬프트 */}
                {mode === 'manual' && pasteTexts[i].trim() && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-300">데이터 파싱: claude.ai에서 수치 추출</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(buildManualExtractPrompt(pasteTexts[i], schema));
                          setExtractPromptCopied(i); setTimeout(() => setExtractPromptCopied(null), 2000);
                        }}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${extractPromptCopied === i ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300' : 'bg-violet-900/60 border-violet-700 text-violet-300 hover:border-violet-500'}`}
                      >
                        {extractPromptCopied === i ? '✓ 복사됨' : '파싱 프롬프트 복사 → claude.ai'}
                      </button>
                    </div>
                    <textarea
                      value={manualExtractResponse[i]}
                      onChange={e => setManualExtract(i, e.target.value)}
                      placeholder="claude.ai의 JSON 응답을 여기에 붙여넣으세요..."
                      rows={3}
                      className="w-full bg-slate-900 text-slate-300 placeholder-slate-600 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-violet-500 resize-y font-mono"
                    />
                    <button onClick={() => doParseManual(i)} disabled={!manualExtractResponse[i].trim()}
                      className="px-4 py-1.5 text-xs bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
                      JSON 파싱 → 데이터 추출
                    </button>
                    {parsed[i] && <span className="text-xs text-emerald-400">{parsed[i].length > 0 ? `✓ ${parsed[i].length}건 추출됨` : '수치 없음'}</span>}
                  </div>
                )}

                {parsed[i] && parsed[i].length > 0 && (
                  <div className="bg-emerald-950/30 rounded-lg border border-emerald-800/50 p-3">
                    <p className="text-xs font-semibold text-emerald-400 mb-2">추출된 데이터 (3단계에 자동 추가됨)</p>
                    <div className="grid gap-1">
                      {parsed[i].map((e, j) => (
                        <div key={j} className="flex gap-3 text-xs">
                          <span className="font-mono text-emerald-300 font-semibold w-20 shrink-0">{e.value} {schema.unit}</span>
                          <span className="text-white">{e.materialName}</span>
                          <span className="text-slate-400">{e.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {i < queries.length - 1 && (
                  <button onClick={() => setActiveRound(i + 1)} className="text-xs text-slate-400 hover:text-indigo-300 transition-colors">
                    다음 라운드로 → {queries[i + 1].badge}
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Step 3: 데이터 입력 ──────────────────────────────────────────────────────
const EMPTY_FORM = (schema: DBSchema): Omit<DataEntry, 'id'> => ({
  materialName: '',
  category: '',
  value: 0,
  customValues: Object.fromEntries(schema.customFields.map(f => [f.key, ''])),
  reference: '',
  year: new Date().getFullYear(),
  notes: '',
});

function DataStep({ schema, entries, setEntries }: {
  schema: DBSchema; entries: DataEntry[]; setEntries: (e: DataEntry[]) => void;
}) {
  const [form, setForm] = useState<Omit<DataEntry, 'id'>>(() => EMPTY_FORM(schema));
  const [editId, setEditId] = useState<number | null>(null);

  function setF(key: keyof Omit<DataEntry, 'id' | 'customValues'>, val: string | number) { setForm(f => ({ ...f, [key]: val })); }
  function setCV(key: string, val: string) { setForm(f => ({ ...f, customValues: { ...f.customValues, [key]: val } })); }

  function submit() {
    if (!form.materialName || !form.value) return;
    if (editId !== null) {
      setEntries(entries.map(e => e.id === editId ? { ...form, id: editId } : e));
      setEditId(null);
    } else {
      setEntries([...entries, { ...form, id: Date.now() + Math.random() }]);
    }
    setForm(EMPTY_FORM(schema));
  }

  function startEdit(e: DataEntry) {
    setForm({ materialName: e.materialName, category: e.category, value: e.value, customValues: { ...e.customValues }, reference: e.reference, year: e.year, notes: e.notes });
    setEditId(e.id);
  }

  return (
    <div className="space-y-5">
      {entries.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3 text-sm text-emerald-300">
          AI 파싱으로 <strong>{entries.length}건</strong>이 자동 추가되었습니다. 아래에서 수정·보완하세요.
        </div>
      )}

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-5">
        <h3 className="text-sm font-bold text-indigo-300 mb-4">{editId !== null ? '항목 수정' : '수동 추가'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="재료명 *">
            <input className={inputCls} value={form.materialName} onChange={e => setF('materialName', e.target.value)} placeholder="예: DGEBA" />
          </Field>
          <Field label={`${schema.categoryLabel || '분류'} *`}>
            <input className={inputCls} value={form.category} onChange={e => setF('category', e.target.value)} placeholder="분류 값 입력" />
          </Field>
          <Field label={`${schema.propertyName || '물성값'} (${schema.unit}) *`}>
            <input className={inputCls} type="number" step="any" value={form.value || ''} onChange={e => setF('value', parseFloat(e.target.value) || 0)} placeholder="예: 3.20" />
          </Field>
          {schema.customFields.map(cf => (
            <Field key={cf.key} label={cf.label}>
              <input className={inputCls} value={form.customValues[cf.key] ?? ''} onChange={e => setCV(cf.key, e.target.value)} />
            </Field>
          ))}
          <Field label="참고문헌">
            <input className={inputCls} value={form.reference} onChange={e => setF('reference', e.target.value)} placeholder="저자 et al. (연도) 저널명" />
          </Field>
          <Field label="연도">
            <input className={inputCls} type="number" value={form.year} onChange={e => setF('year', parseInt(e.target.value) || 2024)} />
          </Field>
          <Field label="비고">
            <input className={inputCls} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="측정 조건, 특이사항" />
          </Field>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={!form.materialName || !form.value}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
            {editId !== null ? '수정 저장' : '추가'}
          </button>
          {editId !== null && (
            <button onClick={() => { setEditId(null); setForm(EMPTY_FORM(schema)); }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">취소</button>
          )}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-sm font-medium text-slate-300">수록 데이터 <span className="text-indigo-400">{entries.length}건</span></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left py-2 px-3">재료명</th>
                  <th className="text-left py-2 px-3">{schema.categoryLabel || '분류'}</th>
                  <th className="text-right py-2 px-3">{schema.propertyName} ({schema.unit})</th>
                  {schema.customFields.map(cf => <th key={cf.key} className="text-left py-2 px-3">{cf.label}</th>)}
                  <th className="text-left py-2 px-3">출처</th>
                  <th className="text-left py-2 px-3">연도</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map(row => (
                  <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-700/40">
                    <td className="py-2 px-3 text-white font-medium">{row.materialName}</td>
                    <td className="py-2 px-3 text-slate-300">{row.category}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-300">{row.value}</td>
                    {schema.customFields.map(cf => <td key={cf.key} className="py-2 px-3 text-slate-400">{row.customValues[cf.key] ?? '—'}</td>)}
                    <td className="py-2 px-3 text-slate-400 max-w-[140px] truncate">{row.reference}</td>
                    <td className="py-2 px-3 text-slate-500">{row.year}</td>
                    <td className="py-2 px-3 flex gap-2">
                      <button onClick={() => startEdit(row)} className="text-slate-400 hover:text-indigo-300">✎</button>
                      <button onClick={() => setEntries(entries.filter(e => e.id !== row.id))} className="text-slate-400 hover:text-red-400">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-600 text-sm">
          2단계에서 NotebookLM 결과를 붙여넣으면 자동으로 채워집니다.
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
const DEFAULT_SCHEMA: DBSchema = {
  dbName: '', material: '', propertyName: '', unit: '',
  categoryLabel: '', excludeNote: '', customFields: [],
};

export default function BuilderPage() {
  const router = useRouter();
  const { apiKey, setApiKey } = useApiKey();
  const [step, setStep] = useState(1);
  const [schema, setSchema] = useState<DBSchema>(DEFAULT_SCHEMA);
  const [entries, setEntries] = useState<DataEntry[]>([]);

  const schemaReady = !!(schema.dbName && schema.material && schema.propertyName && schema.unit && schema.categoryLabel);

  const handleExtracted = useCallback((extracted: Omit<DataEntry, 'id'>[]) => {
    setEntries(prev => {
      const existing = new Set(prev.map(e => `${e.materialName}|${e.value}`));
      const fresh = extracted
        .filter(e => !existing.has(`${e.materialName}|${e.value}`))
        .map(e => ({ ...e, id: Date.now() + Math.random() }));
      return [...prev, ...fresh];
    });
  }, []);

  const goView = useCallback(() => {
    const project: DBProject = { schema, entries };
    if (typeof window !== 'undefined') localStorage.setItem('matdb-project', JSON.stringify(project));
    router.push('/view');
  }, [schema, entries, router]);

  const shareLink = useCallback(() => {
    const project: DBProject = { schema, entries };
    const hash = btoa(unescape(encodeURIComponent(JSON.stringify(project))));
    navigator.clipboard.writeText(`${window.location.origin}/view#${hash}`)
      .then(() => alert('공유 링크가 복사되었습니다!'));
  }, [schema, entries]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">M</div>
          <span className="font-bold text-white tracking-tight">MatDB Builder</span>
          <span className="text-slate-500 text-sm hidden sm:block">재료 물성 데이터베이스 빌더</span>
          <Link href="/pipeline" className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800 hover:border-indigo-600 rounded-lg px-3 py-1.5 transition-colors hidden sm:block">파이프라인 도구</Link>
          <div className="ml-auto flex items-center gap-2">
            <ApiKeyPanel apiKey={apiKey} setApiKey={setApiKey} />
            {entries.length > 0 && (
              <>
                <button onClick={shareLink} className="text-xs text-slate-400 hover:text-indigo-300 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors">공유 링크</button>
                <button onClick={goView} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 transition-colors font-medium">시각화 보기 →</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {step === 1 && entries.length === 0 && (
          <section className="mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 text-xs text-indigo-400 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              NotebookLM 딥리서치 연계 · 에폭시-db와 동일한 방법론
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
              재료 물성 데이터베이스를<br />
              <span className="text-indigo-400">3단계로 — 계정 없이</span>
            </h1>
            <p className="text-slate-400 max-w-2xl text-sm leading-relaxed mb-6">
              연구 주제를 입력하면 NotebookLM 딥리서치 쿼리 7개가 자동 생성됩니다.
              쿼리 결과를 붙여넣으면 AI가 수치를 자동 파싱해 데이터 테이블을 채웁니다.
              에폭시-db를 만든 것과 동일한 방법입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { n: '1', t: '연구 정의', d: '재료·물성·분류 기준 입력' },
                { n: '2', t: 'NotebookLM 딥리서치', d: '7개 쿼리 자동 생성 → NotebookLM에서 실행 → 결과 붙여넣기 → AI 파싱' },
                { n: '3', t: '데이터 확인 + 시각화', d: '자동 파싱된 수치 검토·보완 후 차트·테이블 생성' },
              ].map(c => (
                <div key={c.n} className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex gap-3">
                  <span className="text-2xl font-bold text-indigo-600/60">{c.n}</span>
                  <div><p className="font-semibold text-white">{c.t}</p><p className="text-slate-400 mt-0.5">{c.d}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}

        <StepIndicator current={step} />

        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 mb-6">
          {step === 1 && <SchemaStep schema={schema} onChange={setSchema} />}
          {step === 2 && <NotebookLMStep schema={schema} onExtracted={handleExtracted} apiKey={apiKey} />}
          {step === 3 && <DataStep schema={schema} entries={entries} setEntries={setEntries} />}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="px-5 py-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors">
            ← 이전
          </button>
          <div className="flex gap-3">
            {step === 3 && entries.length > 0 && (
              <button onClick={goView} className="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors">
                시각화 사이트 보기 →
              </button>
            )}
            {step < 3 && (
              <button onClick={() => setStep(s => Math.min(3, s + 1))} disabled={step === 1 && !schemaReady}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">
                다음 →
              </button>
            )}
          </div>
        </div>

        {step === 1 && !schemaReady && (
          <p className="text-center text-xs text-slate-600 mt-3">* 필수 항목을 모두 입력해야 다음 단계로 넘어갈 수 있습니다.</p>
        )}

        <div className="mt-10 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">이 도구로 만든 실제 예시: 아민계 경화 에폭시 Young&apos;s Modulus DB</p>
            <p className="text-xs text-slate-400 mt-0.5">87건 · 11개 계열 · 22편 논문 · NotebookLM 7라운드 딥리서치로 구축</p>
          </div>
          <a href="https://epoxy-db.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800 rounded-lg px-3 py-2 transition-colors whitespace-nowrap">
            epoxy-db.vercel.app →
          </a>
        </div>
      </main>
    </div>
  );
}
