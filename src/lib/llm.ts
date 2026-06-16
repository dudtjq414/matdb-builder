export type LLMProvider = 'anthropic' | 'gemini' | 'claude-cli';

export function detectProvider(key: string): LLMProvider {
  if (!key) return 'claude-cli';
  if (key.startsWith('AIza')) return 'gemini';
  return 'anthropic';
}

// 로컬 claude CLI 호출 (Claude Code Pro 설치 시 API 키 불필요)
async function callClaudeCLI(systemPrompt: string, userPrompt: string): Promise<string> {
  const { exec } = await import('child_process');
  const { writeFile, unlink } = await import('fs/promises');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  // 프롬프트를 임시 파일에 저장 (CLI 인자 길이 제한 + 특수문자 문제 회피)
  const tmpPath = join(tmpdir(), `matdb_${Date.now()}.txt`);
  await writeFile(tmpPath, `${systemPrompt}\n\n${userPrompt}`, 'utf8');

  try {
    const isWin = process.platform === 'win32';
    const winPath = tmpPath.replace(/\//g, '\\');
    // exec()는 shell을 통해 실행하므로 Windows에서 claude.cmd도 정상 인식
    const cmd = isWin
      ? `powershell -NoProfile -Command "claude -p (Get-Content -Raw -Encoding UTF8 '${winPath}') --output-format text"`
      : `claude -p "$(cat '${tmpPath}')" --output-format text`;

    const { stdout } = await execAsync(cmd, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function callLLM(
  apiKey: string | undefined | null,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  if (!apiKey) return callClaudeCLI(systemPrompt, userPrompt);
  const provider = detectProvider(apiKey);

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      const msg = err?.error?.message ?? JSON.stringify(err);
      throw new Error(msg);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  // Anthropic
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}
