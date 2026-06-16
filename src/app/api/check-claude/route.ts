import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function GET() {
  return new Promise<Response>((resolve) => {
    exec('claude --version', { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve(NextResponse.json({ available: false }));
      } else {
        resolve(NextResponse.json({ available: true, version: stdout.trim() }));
      }
    });
  });
}
