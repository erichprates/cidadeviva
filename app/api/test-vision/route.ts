export const maxDuration = 60;

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return NextResponse.json({
        status: 'ERRO',
        problema: 'ANTHROPIC_API_KEY não encontrada nas variáveis de ambiente',
      });
    }

    const client = new Anthropic({ apiKey: key, timeout: 8000 });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'responda só: ok' }],
    });

    return NextResponse.json({
      status: 'OK',
      key_prefix: key.substring(0, 10) + '...',
      resposta: response.content[0],
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERRO',
      tipo: error.constructor.name,
      mensagem: error.message,
      status_code: error.status,
    });
  }
}
