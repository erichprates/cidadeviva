import Anthropic from '@anthropic-ai/sdk';

const VISION_MODEL = 'claude-sonnet-4-20250514';

export class VisionServiceError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'VisionServiceError';
  }
}

export interface VisionResult {
  cnpj: string | null;
  merchant_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
  document_type: 'cupom_maquininha' | 'cupom_fiscal' | 'nf' | 'recibo' | 'pix_bancario' | 'outro';
  confidence: number;
  is_suspicious: boolean;
  suspicion_reason: string | null;
  raw?: unknown;
}

const VISION_PROMPT = `Extraia dados deste comprovante fiscal brasileiro em JSON.

CNPJ (crítico): formato XX.XXX.XXX/XXXX-XX (18 caracteres com pontos, barra e traço).
Em cupons de maquininha (Getnet, Cielo, Stone) aparece SOZINHO numa linha abaixo do nome do lojista, SEM label. Ex: 52.101.403/0001-20.
NUNCA confunda com EC:, CV:, DOC:, AUT:, TERM:, AID:, ARQC: — códigos internos.

VALOR TOTAL: procure "VALOR: R$", "TOTAL R$", "DÉBITO R$", "CRÉDITO R$". É o total pago, não parcial/taxa/troco. Retorne número puro (ex: 49.00).

DATA: converta DD/MM/AA para YYYY-MM-DD.

document_type: "cupom_maquininha" | "cupom_fiscal" | "nf" | "recibo" | "pix_bancario" (app do banco — rejeitar) | "outro".

is_suspicious: true APENAS se for screenshot de tela (barra de status, ícones de bateria/wifi) ou imagem editada. Foto real com qualidade ruim NÃO é suspeita.

Retorne APENAS JSON:
{"cnpj":"XX.XXX.XXX/XXXX-XX ou null","merchant_name":"nome ou null","total_amount":0.00,"purchase_date":"YYYY-MM-DD ou null","document_type":"...","confidence":0.95,"is_suspicious":false,"suspicion_reason":null}`;

function failResult(reason: string): VisionResult {
  return {
    cnpj: null,
    merchant_name: null,
    total_amount: null,
    purchase_date: null,
    document_type: 'outro',
    confidence: 0,
    is_suspicious: true,
    suspicion_reason: reason,
  };
}

const MOCK_MERCHANTS = [
  { cnpj: '12.345.678/0001-90', name: 'Mercado Família' },
  { cnpj: '98.765.432/0001-10', name: 'Farmácia Vida' },
];

function mockResult(): VisionResult {
  const m = MOCK_MERCHANTS[Math.floor(Math.random() * MOCK_MERCHANTS.length)];
  const amount = Number((15 + Math.random() * (180 - 15)).toFixed(2));
  const today = new Date().toISOString().slice(0, 10);
  return {
    cnpj: m.cnpj,
    merchant_name: m.name,
    total_amount: amount,
    purchase_date: today,
    document_type: 'recibo',
    confidence: 0.92,
    is_suspicious: false,
    suspicion_reason: null,
    raw: { mock: true, reason: 'ANTHROPIC_API_KEY ausente — usando stub de desenvolvimento' },
  };
}

export async function extractReceipt(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
): Promise<VisionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return mockResult();

  const client = new Anthropic({ apiKey, timeout: 9_000 });

  try {
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: VISION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return failResult('Resposta Vision vazia');

    const text = textBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return failResult('JSON não encontrado na resposta');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      cnpj: parsed.cnpj ?? null,
      merchant_name: parsed.merchant_name ?? null,
      total_amount: typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
      purchase_date: parsed.purchase_date ?? null,
      document_type: parsed.document_type ?? 'outro',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      is_suspicious: Boolean(parsed.is_suspicious),
      suspicion_reason: parsed.suspicion_reason ?? null,
      raw: response,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[vision] error:', raw);
    if (/could not process image|image/i.test(raw)) {
      return failResult('Não conseguimos ler essa imagem. Envie uma foto mais nítida e bem iluminada.');
    }
    throw new VisionServiceError(raw, err);
  }
}
