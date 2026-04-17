import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const business_name = typeof body?.business_name === 'string' ? body.business_name.trim() : '';
  const contact_name = typeof body?.contact_name === 'string' ? body.contact_name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!business_name) return NextResponse.json({ error: 'Nome do estabelecimento é obrigatório.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  if (business_name.length > 160 || message.length > 2000) {
    return NextResponse.json({ error: 'Conteúdo excede o limite permitido.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from('partner_leads').insert({
    business_name,
    contact_name: contact_name || null,
    email,
    phone: phone || null,
    message: message || null,
  });
  if (error) {
    console.error('[partners/lead] insert error:', error);
    return NextResponse.json({ error: 'Não foi possível enviar. Tente de novo em instantes.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
