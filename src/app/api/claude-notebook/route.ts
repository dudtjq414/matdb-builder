import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  const { notebookId, query } = await req.json() as { notebookId: string; query: string };

  if (!notebookId || !query) {
    return NextResponse.json({ error: 'notebookId와 query가 필요합니다.' }, { status: 400 });
  }

  const prompt = `NotebookLM MCP 툴을 사용하여 노트북 ID "${notebookId}"에 아래 쿼리를 실행하고, 응답 텍스트 전체를 그대로 출력하세요. 요약하거나 수정하지 마세요.

쿼리:
${query}`;

  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'text'],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );
    const text = stdout.trim();
    if (!text) {
      return NextResponse.json({ error: '빈 응답', needsManual: true }, { status: 200 });
    }
    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // claude CLI 없거나 MCP 미설정 → 수동 모드로 전환
    return NextResponse.json({ error: msg, needsManual: true }, { status: 200 });
  }
}
