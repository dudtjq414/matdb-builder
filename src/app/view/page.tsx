'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { DBProject, DataEntry } from '@/lib/types';
import { categoryColor, PALETTE } from '@/lib/types';

// ── URL 해시 / localStorage에서 프로젝트 로드 ─────────────────────────────
function loadProject(): DBProject | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1);
    if (hash) {
      return JSON.parse(decodeURIComponent(escape(atob(hash))));
    }
    const stored = localStorage.getItem('matdb-project');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

// ── StatsBar ──────────────────────────────────────────────────────────────
function StatsBar({ project }: { project: DBProject }) {
  const vals = project.entries.map(e => e.value);
  const cats = [...new Set(project.entries.map(e => e.category))];
  const papers = [...new Set(project.entries.map(e => e.reference).filter(Boolean))];
  const yMin = Math.min(...project.entries.map(e => e.year));
  const yMax = Math.max(...project.entries.map(e => e.year));

  const stats = [
    { v: `${project.entries.length}건`, l: '총 데이터 수', s: '수록된 조합 수', c: 'text-indigo-400' },
    { v: `${Math.min(...vals).toFixed(2)}–${Math.max(...vals).toFixed(2)}`, l: `범위 (${project.schema.unit})`, s: `최고값: ${Math.max(...vals).toFixed(2)} ${project.schema.unit}`, c: 'text-emerald-400' },
    { v: `${cats.length}개`, l: `${project.schema.categoryLabel} 계열`, s: cats.slice(0, 3).join(' · ') + (cats.length > 3 ? ' ...' : ''), c: 'text-amber-400' },
    { v: `${papers.length}편`, l: '수록 논문', s: `${yMin}–${yMax}`, c: 'text-violet-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {stats.map(s => (
        <div key={s.l} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
          <p className="text-sm text-slate-200 font-medium">{s.l}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{s.s}</p>
        </div>
      ))}
    </div>
  );
}

// ── Top N Cards ───────────────────────────────────────────────────────────
function TopNCards({ project }: { project: DBProject }) {
  const allCats = [...new Set(project.entries.map(e => e.category))];
  const top5 = [...project.entries].sort((a, b) => b.value - a.value).slice(0, 5);
  const rankStyle = [
    { badge: 'bg-amber-400 text-slate-900' },
    { badge: 'bg-slate-300 text-slate-900' },
    { badge: 'bg-orange-700 text-white' },
    { badge: 'bg-slate-700 text-slate-200' },
    { badge: 'bg-slate-700 text-slate-200' },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">Top 5</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {top5.map((entry, i) => {
          const s = rankStyle[i] ?? rankStyle[4];
          return (
            <div key={entry.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`${s.badge} text-xs font-bold px-2 py-0.5 rounded-full min-w-[28px] text-center`}>#{i + 1}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(entry.category, allCats) }} />
              </div>
              <p className="text-2xl font-bold text-white">{entry.value.toFixed(2)} <span className="text-sm font-normal text-slate-300">{project.schema.unit}</span></p>
              <p className="text-sm font-semibold text-slate-100 leading-tight">{entry.materialName}</p>
              <p className="text-xs text-slate-400">{entry.category}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────
function CategoryChart({ project }: { project: DBProject }) {
  const allCats = [...new Set(project.entries.map(e => e.category))];
  const data = allCats.map(cat => {
    const vals = project.entries.filter(e => e.category === cat).map(e => e.value);
    return {
      name: cat.length > 14 ? cat.slice(0, 13) + '…' : cat,
      fullName: cat,
      avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3)),
      max: Math.max(...vals),
      count: vals.length,
    };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-5">
      <h3 className="text-sm font-bold text-white mb-4">{project.schema.categoryLabel}별 평균 {project.schema.propertyName}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 40, left: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit={` ${project.schema.unit}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v, _name, p) => {
              const num = typeof v === 'number' ? v : Number(v);
              return [`${num.toFixed(3)} ${project.schema.unit} (avg) · max: ${(p.payload as { max: number }).max.toFixed(3)}`, (p.payload as { fullName: string }).fullName];
            }}
            labelFormatter={() => ''}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={PALETTE[allCats.indexOf(d.fullName) % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 데이터 테이블 ─────────────────────────────────────────────────────────
function DataTableView({ project }: { project: DBProject }) {
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('전체');
  const allCats = [...new Set(project.entries.map(e => e.category))];

  const filtered = useMemo(() => {
    return project.entries.filter(e => {
      if (selCat !== '전체' && e.category !== selCat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.materialName.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.value - a.value);
  }, [project.entries, selCat, search]);

  const inputCls = "bg-slate-700 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-indigo-500";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명 검색..." className={`${inputCls} w-48`} />
        <select value={selCat} onChange={e => setSelCat(e.target.value)} className={inputCls}>
          <option>전체</option>
          {allCats.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="text-slate-400 text-sm self-center ml-auto">{filtered.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs">
              <th className="text-left py-2 pr-3 font-medium">재료명</th>
              <th className="text-left py-2 pr-3 font-medium">{project.schema.categoryLabel}</th>
              {project.schema.customFields.map(cf => (
                <th key={cf.key} className="text-left py-2 pr-3 font-medium">{cf.label}</th>
              ))}
              <th className="text-right py-2 pr-3 font-medium">{project.schema.propertyName} ({project.schema.unit})</th>
              <th className="text-left py-2 pr-3 font-medium">출처</th>
              <th className="text-left py-2 font-medium">연도</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(row.category, allCats) }} />
                    <span className="text-white font-medium">{row.materialName}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-slate-300">{row.category}</td>
                {project.schema.customFields.map(cf => (
                  <td key={cf.key} className="py-2 pr-3 text-slate-400 text-xs">{row.customValues[cf.key] ?? '—'}</td>
                ))}
                <td className="py-2 pr-3 text-right font-mono font-semibold text-indigo-300">{row.value.toFixed(3)}</td>
                <td className="py-2 pr-3 text-slate-400 text-xs max-w-[180px] truncate">{row.reference}</td>
                <td className="py-2 text-slate-500 text-xs">{row.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 메인 뷰 페이지 ────────────────────────────────────────────────────────
export default function ViewPage() {
  const router = useRouter();
  const [project, setProject] = useState<DBProject | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (!project || project.entries.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-slate-400">데이터가 없습니다. 빌더에서 먼저 데이터를 입력해주세요.</p>
        <button onClick={() => router.push('/')} className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-800 rounded-lg px-4 py-2">
          빌더로 돌아가기
        </button>
      </div>
    );
  }

  const allCats = [...new Set(project.entries.map((e: DataEntry) => e.category))];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">M</div>
          <span className="font-bold text-white tracking-tight truncate">{project.schema.dbName || '물성 데이터베이스'}</span>
          <div className="ml-auto flex gap-3 text-xs text-slate-400">
            <a href="#chart" className="hover:text-indigo-300">차트</a>
            <a href="#table" className="hover:text-indigo-300">데이터</a>
            <button onClick={() => router.push('/')} className="hover:text-indigo-300 border border-slate-700 rounded px-2 py-1">
              ← 편집
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* 히어로 */}
        <section className="mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 text-xs text-indigo-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            MatDB Builder 생성 · {project.schema.material}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-2">
            <span className="text-indigo-400">{project.schema.propertyName}</span> 종합 데이터베이스
          </h1>
          <p className="text-slate-400 text-sm">
            총 <strong className="text-white">{project.entries.length}건</strong>의 데이터 수록 ·
            {allCats.length}개 계열 · 단위: {project.schema.unit}
          </p>
        </section>

        {/* 통계 */}
        <StatsBar project={project} />

        {/* Top 5 */}
        <TopNCards project={project} />

        {/* 차트 */}
        <section id="chart" className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">데이터 시각화</h2>
          {/* 범례 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allCats.map(cat => (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColor(cat, allCats) }} />
                {cat}
              </div>
            ))}
          </div>
          <CategoryChart project={project} />
        </section>

        {/* 테이블 */}
        <section id="table" className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            전체 데이터 테이블
            <span className="text-sm font-normal text-slate-400 ml-2">· 재료명 검색, 계열 필터</span>
          </h2>
          <DataTableView project={project} />
        </section>

        {/* 빌더 CTA */}
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <p className="font-semibold text-white text-sm">이 DB를 수정하거나 새 DB를 만드세요</p>
            <p className="text-xs text-slate-400 mt-0.5">MatDB Builder에서 데이터를 추가하거나 새 프로젝트를 시작할 수 있습니다.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => router.push('/')} className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-800 rounded-lg px-4 py-2">
              빌더로 돌아가기
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 px-4 text-center text-xs text-slate-500">
        <p>MatDB Builder로 생성 · NotebookLM 딥리서치 기반</p>
        <p className="mt-1">{project.schema.dbName} · {project.entries.length}건 수록</p>
      </footer>
    </div>
  );
}
