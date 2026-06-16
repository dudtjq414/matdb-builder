'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── 타입 ─────────────────────────────────────────────────────────────────────
interface Config {
  notebookUrl: string;
  material: string;
  propertyName: string;
  unit: string;
  categoryLabel: string;
  excludeNote: string;
  apiKey: string; // 비어있으면 claude CLI 사용
}

interface Query { badge: string; title: string; prompt: string }

interface Entry {
  materialName: string;
  category: string;
  value: number;
  dataType: 'Exptl' | 'MD' | 'ML';
  reference: string;
  year: number;
  notes: string;
}

type RoundStatus = 'pending' | 'querying' | 'extracting' | 'done' | 'manual' | 'error';

interface Round {
  status: RoundStatus;
  pasteText: string;
  entries: Entry[];
  error?: string;
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const LS_KEY = 'matdb-pipeline-v2';

function extractNotebookId(url: string): string {
  const m = url.match(/notebook\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : url.trim();
}

function post(path: string, body: object, apiKey?: string) {
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

const inp = 'w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-indigo-500';

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [cfg, setCfg] = useState<Config>({
    notebookUrl: '', material: '', propertyName: '',
    unit: '', categoryLabel: '', excludeNote: '', apiKey: '',
  });

  const [claudeAvail, setClaudeAvail] = useState<boolean | null>(null); // null = 감지 중
  const [claudeVersion, setClaudeVersion] = useState('');

  const [queries, setQueries] = useState<Query[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const [showKey, setShowKey] = useState(false);

  // localStorage 복원
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) setCfg(JSON.parse(s));
    } catch {}
  }, []);

  // claude CLI 감지 (로컬 실행 시만 의미 있음)
  useEffect(() => {
    fetch('/api/check-claude')
      .then(r => r.json())
      .then(d => { setClaudeAvail(d.available); setClaudeVersion(d.version ?? ''); })
      .catch(() => setClaudeAvail(false));
  }, []);

  const update = useCallback((patch: Partial<Config>) => {
    setCfg(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const notebookId = extractNotebookId(cfg.notebookUrl);
  const nlmLink = notebookId ? `https://notebooklm.google.com/notebook/${notebookId}` : 'https://notebooklm.google.com';

  // Claude Code 모드: API 키 없이 로컬 claude CLI 사용
  const isClaudeMode = claudeAvail && !cfg.apiKey;
  // API 키 모드: 직접 API 키 사용
  const isApiMode = !!cfg.apiKey;
  // 실행 가능 조건
  const canRun = cfg.material && cfg.propertyName && (isClaudeMode || isApiMode);

  const schema = {
    material: cfg.material, propertyName: cfg.propertyName, unit: cfg.unit,
    categoryLabel: cfg.categoryLabel, excludeNote: cfg.excludeNote,
    customFields: [], dbName: `${cfg.material} ${cfg.propertyName} DB`,
  };

  // ── 자동 실행 (Claude Code 모드 또는 API 모드 공통) ─────────────────────────
  async function handleAutoRun() {
    if (!canRun) return;
    setRunning(true);
    setStatusMsg('쿼리 생성 중...');
    setQueries([]);
    setRounds([]);
    setActive(0);

    // 1. 쿼리 생성
    const genRes = await post('/api/generate-queries', { schema }, cfg.apiKey || undefined);
    if (genRes.error) {
      setStatusMsg(`오류: ${genRes.error}`);
      setRunning(false);
      return;
    }
    const qs: Query[] = genRes.queries ?? [];
    setQueries(qs);
    const initRounds: Round[] = qs.map(() => ({ status: 'pending', pasteText: '', entries: [] }));
    setRounds(initRounds);

    // 2. 각 라운드 순차 실행
    for (let i = 0; i < qs.length; i++) {
      setActive(i);
      setStatusMsg(`라운드 ${i + 1}/${qs.length}: ${qs[i].title}`);
      setRounds(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'querying' } : r));

      // NotebookLM 쿼리 (claude CLI 모드: /api/claude-notebook, API 모드: 수동)
      let rawText = '';
      if (isClaudeMode && notebookId) {
        const nlmRes = await post('/api/claude-notebook', { notebookId, query: qs[i].prompt });
        if (nlmRes.needsManual || nlmRes.error) {
          // MCP 실패 → 이 라운드는 수동으로
          setRounds(prev => prev.map((r, idx) => idx === i
            ? { ...r, status: 'manual', error: nlmRes.error } : r));
          continue;
        }
        rawText = nlmRes.text ?? '';
      } else {
        // API 모드: NotebookLM은 수동 붙여넣기 (쿼리만 자동 생성됨)
        setRounds(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'manual' } : r));
        continue;
      }

      // 3. 추출
      setRounds(prev => prev.map((r, idx) => idx === i
        ? { ...r, status: 'extracting', pasteText: rawText } : r));
      const extRes = await post('/api/pipeline-extract',
        { pastedText: rawText, schema }, cfg.apiKey || undefined);

      const entries: Entry[] = extRes.entries ?? [];
      setRounds(prev => prev.map((r, idx) => idx === i
        ? { ...r, status: 'done', entries } : r));
    }

    setStatusMsg('완료');
    setRunning(false);
  }

  // ── 수동 라운드 파싱 ─────────────────────────────────────────────────────────
  async function handleManualParse(i: number) {
    const r = rounds[i];
    if (!r?.pasteText.trim() || r.status === 'extracting') return;
    setRounds(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'extracting' } : x));
    const res = await post('/api/pipeline-extract',
      { pastedText: r.pasteText, schema }, cfg.apiKey || undefined);
    if (res.error) {
      setRounds(prev => prev.map((x, idx) => idx === i ? { ...x, status: 'error', error: res.error } : x));
      return;
    }
    setRounds(prev => prev.map((x, idx) => idx === i
      ? { ...x, status: 'done', entries: res.entries ?? [] } : x));
    if (i < rounds.length - 1) setActive(i + 1);
  }

  // ── 결과 집계 ────────────────────────────────────────────────────────────────
  const allEntries: Entry[] = rounds.flatMap(r => r.entries);
  const seen = new Set<string>();
  const unique = allEntries.filter(e => {
    const k = `${e.materialName?.toLowerCase()}|${e.value}|${e.dataType}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const filtered = unique.filter(e =>
    !search ||
    (e.materialName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.reference ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const doneCount = rounds.filter(r => r.status === 'done').length;
  const manualCount = rounds.filter(r => r.status === 'manual').length;

  function copyQuery(i: number) {
    navigator.clipboard.writeText(queries[i]?.prompt ?? '');
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  function dl(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: name.replace(/\s+/g, '-') }).click();
    URL.revokeObjectURL(url);
  }
  function exportJSON() {
    dl(new Blob([JSON.stringify({ material: cfg.material, propertyName: cfg.propertyName, unit: cfg.unit, notebookId, totalEntries: unique.length, entries: unique }, null, 2)], { type: 'application/json' }), `${cfg.material}-${cfg.propertyName}.json`);
  }
  function exportCSV() {
    const header = 'materialName,category,value,unit,dataType,reference,year,notes';
    const rows = unique.map(e => [e.materialName, e.category, e.value, cfg.unit, e.dataType, e.reference, e.year, e.notes].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    dl(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }), `${cfg.material}-${cfg.propertyName}.csv`);
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-7">

        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">matdb 파이프라인</h1>
            <p className="text-slate-500 text-xs mt-0.5">NotebookLM + Claude → 수치 데이터 자동 추출</p>
          </div>
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-400">← 빌더</Link>
        </div>

        {/* ① 설정 */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-300">① 연구 설정</h2>

            {/* Claude Code 상태 */}
            <div className="flex items-center gap-1.5 text-xs">
              {claudeAvail === null && (
                <span className="text-slate-600">Claude 감지 중...</span>
              )}
              {claudeAvail === true && (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Claude Code 연결됨 {claudeVersion && <span className="text-emerald-600">· {claudeVersion}</span>}
                </span>
              )}
              {claudeAvail === false && (
                <span className="flex items-center gap-1.5 text-amber-500 bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  API 키 필요
                </span>
              )}
            </div>
          </div>

          {/* NotebookLM URL */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">NotebookLM 노트북 URL</label>
            <input className={inp}
              placeholder="https://notebooklm.google.com/notebook/abc123-..."
              value={cfg.notebookUrl}
              onChange={e => update({ notebookUrl: e.target.value })} />
            {notebookId && notebookId !== cfg.notebookUrl.trim() && (
              <p className="text-xs text-indigo-400 mt-1 font-mono">노트북 ID: {notebookId}</p>
            )}
          </div>

          {/* 재료 + 물성 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">재료/시스템</label>
              <input className={inp} placeholder="예: 아민계 경화 에폭시 수지"
                value={cfg.material} onChange={e => update({ material: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">측정 물성</label>
              <input className={inp} placeholder="예: Young's Modulus"
                value={cfg.propertyName} onChange={e => update({ propertyName: e.target.value })} />
            </div>
          </div>

          {/* 단위 + 분류 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">단위</label>
              <input className={inp} placeholder="예: GPa"
                value={cfg.unit} onChange={e => update({ unit: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">분류 기준</label>
              <input className={inp} placeholder="예: 에폭시 계열"
                value={cfg.categoryLabel} onChange={e => update({ categoryLabel: e.target.value })} />
            </div>
          </div>

          {/* 제외 기준 */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">제외 기준</label>
            <input className={inp} placeholder="예: DMA 저장탄성률(E'), 나노인덴테이션, 압축시험"
              value={cfg.excludeNote} onChange={e => update({ excludeNote: e.target.value })} />
          </div>

          {/* API 키 (Claude Code 모드가 아닐 때 또는 선택 오버라이드) */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              API 키 <span className="text-slate-700">(Claude Code 사용 시 비워두세요)</span>
            </label>
            <div className="flex gap-2">
              <input type={showKey ? 'text' : 'password'} className={`${inp} flex-1 font-mono`}
                placeholder="비워두면 로컬 Claude Code 사용 · Gemini: AIza... · Anthropic: sk-ant..."
                value={cfg.apiKey} onChange={e => update({ apiKey: e.target.value })} />
              <button onClick={() => setShowKey(s => !s)}
                className="px-3 py-2 text-xs text-slate-500 border border-slate-700 rounded-lg hover:text-slate-300">
                {showKey ? '숨김' : '표시'}
              </button>
            </div>
          </div>

          {/* 실행 버튼 */}
          <button onClick={handleAutoRun} disabled={running || !canRun}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors">
            {running
              ? statusMsg || '실행 중...'
              : isClaudeMode
                ? '② 파이프라인 자동 실행 (Claude Code + NotebookLM MCP) →'
                : isApiMode
                  ? '② 쿼리 자동 생성 + 탐색 가이드 시작 →'
                  : '② 파이프라인 실행 →'}
          </button>

          {!canRun && !running && (
            <p className="text-xs text-amber-500 text-center">
              {!cfg.material || !cfg.propertyName
                ? '재료명과 측정 물성을 입력해주세요'
                : !claudeAvail && !cfg.apiKey
                  ? 'Claude Code가 없으면 API 키를 입력해주세요'
                  : ''}
            </p>
          )}

          {/* 모드 안내 */}
          {claudeAvail === true && (
            <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
              <p className="font-semibold">✓ Claude Code 자동 모드</p>
              <p className="text-emerald-400/80">NotebookLM MCP 설정이 되어 있으면 7라운드 전체가 자동 실행됩니다. MCP 미설정 라운드는 수동 붙여넣기로 전환됩니다.</p>
            </div>
          )}
          {claudeAvail === false && !cfg.apiKey && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Claude Code 미감지 — API 키 모드</p>
              <p className="text-amber-400/80">쿼리는 자동 생성되고, NotebookLM 탐색은 직접 복사·붙여넣기로 진행합니다.</p>
            </div>
          )}
        </section>

        {/* ③ 라운드 */}
        {queries.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-300">③ 탐색 라운드</h2>
              <span className="text-xs text-slate-500">
                {doneCount}완료 {manualCount > 0 ? `· ${manualCount}수동대기` : ''} / {queries.length}
              </span>
            </div>

            {/* 진행 바 */}
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${queries.length ? (doneCount / queries.length) * 100 : 0}%` }} />
            </div>

            {/* 라운드 탭 */}
            <div className="flex gap-1.5 flex-wrap">
              {queries.map((q, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    active === i ? 'bg-indigo-600 text-white' :
                    rounds[i]?.status === 'done' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/60' :
                    rounds[i]?.status === 'manual' ? 'bg-amber-900/40 text-amber-300 border border-amber-800/50' :
                    rounds[i]?.status === 'querying' || rounds[i]?.status === 'extracting' ? 'bg-indigo-900/60 text-indigo-300 animate-pulse' :
                    'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}>
                  {rounds[i]?.status === 'done' ? '✓ ' :
                   rounds[i]?.status === 'manual' ? '✎ ' :
                   (rounds[i]?.status === 'querying' || rounds[i]?.status === 'extracting') ? '● ' : ''}
                  {q.badge}
                </button>
              ))}
            </div>

            {/* 활성 라운드 */}
            {queries[active] && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
                    {queries[active].badge}
                  </span>
                  <span className="text-sm font-medium text-white">{queries[active].title}</span>
                  {rounds[active]?.status === 'done' && (
                    <span className="ml-auto text-xs text-emerald-400">✓ {rounds[active].entries.length}건</span>
                  )}
                  {(rounds[active]?.status === 'querying' || rounds[active]?.status === 'extracting') && (
                    <span className="ml-auto text-xs text-indigo-400 animate-pulse">
                      {rounds[active]?.status === 'querying' ? 'NotebookLM 탐색 중...' : '데이터 추출 중...'}
                    </span>
                  )}
                </div>

                {/* 쿼리 텍스트 */}
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-700/40 max-h-36 overflow-y-auto">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {queries[active].prompt}
                  </pre>
                </div>

                {/* 복사 + NotebookLM 링크 */}
                <div className="flex gap-2">
                  <button onClick={() => copyQuery(active)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                      copied === active
                        ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500'
                    }`}>
                    {copied === active ? '✓ 복사됨' : '쿼리 복사'}
                  </button>
                  <a href={nlmLink} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 text-xs text-center rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 hover:bg-blue-900/50 transition-colors">
                    NotebookLM 열기 →
                  </a>
                </div>

                {/* 수동 모드: 붙여넣기 영역 */}
                {(rounds[active]?.status === 'manual' || rounds[active]?.status === 'pending') && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">
                        {rounds[active]?.status === 'manual' && isClaudeMode
                          ? '⚠ NotebookLM MCP 쿼리 실패 — 직접 붙여넣기'
                          : 'NotebookLM 응답 붙여넣기'}
                      </label>
                      <textarea rows={5}
                        className="w-full bg-slate-950 text-slate-300 placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs border border-slate-700 focus:outline-none focus:border-indigo-500 resize-y font-mono"
                        placeholder="NotebookLM에서 쿼리 실행 후 응답을 여기에 붙여넣으세요..."
                        value={rounds[active]?.pasteText ?? ''}
                        onChange={e => setRounds(prev => prev.map((r, i) =>
                          i === active ? { ...r, pasteText: e.target.value } : r))} />
                    </div>
                    <button onClick={() => handleManualParse(active)}
                      disabled={!rounds[active]?.pasteText.trim()}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-colors">
                      데이터 파싱 →
                    </button>
                  </>
                )}

                {/* 완료 미리보기 */}
                {rounds[active]?.status === 'done' && rounds[active].entries.length > 0 && (
                  <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-300">{rounds[active].entries.length}건 추출</p>
                    {rounds[active].entries.slice(0, 4).map((e, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-indigo-300 w-14 shrink-0">{e.value} {cfg.unit}</span>
                        <span className="text-slate-300 truncate">{e.materialName}</span>
                        <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-xs ${
                          e.dataType === 'Exptl' ? 'bg-emerald-900/60 text-emerald-400' :
                          e.dataType === 'MD' ? 'bg-blue-900/60 text-blue-400' :
                          'bg-purple-900/60 text-purple-400'
                        }`}>{e.dataType}</span>
                      </div>
                    ))}
                    {rounds[active].entries.length > 4 && (
                      <p className="text-xs text-slate-600">+{rounds[active].entries.length - 4}건 더</p>
                    )}
                  </div>
                )}

                {rounds[active]?.status === 'done' && active < queries.length - 1 && (
                  <button onClick={() => setActive(active + 1)}
                    className="w-full py-2 text-xs text-indigo-400 hover:text-indigo-300 border border-slate-800 rounded-xl transition-colors">
                    다음 → {queries[active + 1]?.badge}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ④ 결과 */}
        {unique.length > 0 && (
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-sm text-slate-300">④ 결과</h2>
                <p className="text-xs text-slate-500">{unique.length}건 (중복 제거)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportJSON}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg border border-slate-700">
                  JSON
                </button>
                <button onClick={exportCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg border border-slate-700">
                  CSV
                </button>
              </div>
            </div>

            {/* 검색란 */}
            <input className={inp}
              placeholder="재료명, 계열, 출처로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)} />

            {/* 결과 테이블 */}
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/80">
                  <tr>
                    {['재료명', '계열', `값 (${cfg.unit || '단위'})`, '유형', '출처', '연도'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-white">{e.materialName}</td>
                      <td className="px-3 py-2 text-slate-400">{e.category}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-300">{e.value}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                          e.dataType === 'Exptl' ? 'bg-emerald-900/60 text-emerald-300' :
                          e.dataType === 'MD' ? 'bg-blue-900/60 text-blue-300' :
                          'bg-purple-900/60 text-purple-300'
                        }`}>{e.dataType ?? '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{e.reference}</td>
                      <td className="px-3 py-2 text-slate-500">{e.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-8 text-center text-slate-600 text-xs">검색 결과 없음</p>
              )}
            </div>
          </section>
        )}

        {/* 초기 안내 */}
        {queries.length === 0 && !running && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-xs text-slate-600 space-y-3">
            <p className="font-semibold text-slate-500">사용 방법</p>
            <div className="space-y-2">
              <p className="text-slate-400 font-medium">자동 모드 (Claude Code 설치 + notebooklm-mcp 설정)</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 ml-2">
                <li>NotebookLM URL + 연구 파라미터 입력</li>
                <li>"파이프라인 자동 실행" → 7라운드 전체 자동 처리</li>
                <li>결과 테이블에서 검색·내보내기</li>
              </ol>
              <p className="text-slate-400 font-medium mt-2">수동 모드 (API 키 또는 Claude Code만)</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 ml-2">
                <li>파라미터 입력 후 실행 → 7개 쿼리 자동 생성</li>
                <li>각 쿼리를 NotebookLM에 직접 붙여넣고 응답 복사</li>
                <li>응답을 각 라운드 입력란에 붙여넣기 → 자동 파싱</li>
              </ol>
            </div>
            <p className="text-slate-700">입력값은 브라우저에 자동 저장됩니다.</p>
          </div>
        )}

      </div>
    </main>
  );
}
