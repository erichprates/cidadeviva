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

const VISION_PROMPT = `Você é um especialista em leitura de comprovantes fiscais brasileiros. Analise esta imagem e extraia os dados em JSON.

TIPOS DE DOCUMENTO QUE VOCÊ VAI ENCONTRAR:
1. Cupom de maquininha (Getnet, Cielo, Stone, Rede, PagSeguro)
2. Cupom fiscal de PDV (impressora térmica de caixa)
3. Nota fiscal impressa
4. Recibo manual ou impresso
5. Comprovante PIX emitido pela maquininha (diferente do comprovante bancário do app)

REGRA CRÍTICA PARA CNPJ:
O CNPJ brasileiro tem SEMPRE o formato XX.XXX.XXX/XXXX-XX (com pontos, barra e traço).
Em cupons de maquininha Getnet, Cielo, Stone e similares, o CNPJ aparece
SOZINHO em uma linha logo abaixo do nome do estabelecimento, SEM nenhum label.
Exemplo exato de como aparece: 52.101.403/0001-20
Procure por qualquer sequência de 18 caracteres nesse padrão em toda a imagem.
NUNCA confunda com: EC:, CV:, DOC:, AUT:, TERM:, AID:, ARQC: — esses são códigos internos.
Se encontrar o padrão XX.XXX.XXX/XXXX-XX em qualquer parte da imagem, esse é o CNPJ.

REGRAS ADICIONAIS PARA ENCONTRAR O CNPJ:
- Em notas fiscais: pode aparecer como "CNPJ: XX.XXX.XXX/XXXX-XX" no cabeçalho
- Em comprovantes PIX da maquininha: aparece na seção "Dados do Estabelecimento"
- O CNPJ sempre tem a barra / no meio: XXXX/XXXX

REGRAS PARA ENCONTRAR O VALOR TOTAL:
- Em cupons de maquininha procure por: "VALOR: R$", "DÉBITO R$", "CRÉDITO R$", "Valor R$", "TOTAL R$"
- O valor fica geralmente no final do cupom ou dentro de uma caixa/retângulo
- Em cupons com "DÉBITO A VISTA" o valor está na linha VALOR: R$
- Ignore valores parciais, taxas, troco — pegue sempre o TOTAL PAGO
- Formato: número sem R$ e sem pontos de milhar (ex: 49.00, 22.50)

REGRAS PARA ENCONTRAR A DATA:
- Em cupons de maquininha: formato DD/MM/AA HH:MM:SS (ex: 02/04/26 18:33:25)
- Converta sempre para YYYY-MM-DD (ex: 2026-04-02)
- A data fica geralmente na linha após o CNPJ ou no cabeçalho ao lado de "Via Estab"

SOBRE is_suspicious:
- NÃO marque como suspeito por: papel amassado, dedo na foto, foto torta, má iluminação, borrão
- MARQUE como suspeito APENAS se: claramente é screenshot de tela de celular/computador (barra de status visível, ícones de bateria/wifi, interface de app), ou se a imagem parecer editada digitalmente
- Comprovante de maquininha PIX (Getnet, Cielo etc com seção "Dados do Estabelecimento") é VÁLIDO — não é o mesmo que comprovante bancário do Nubank/Inter
- Foto tirada de um comprovante real, mesmo com qualidade ruim, NÃO é suspeita

SOBRE document_type:
- "cupom_maquininha": comprovante de cartão/PIX emitido pela maquininha (Getnet, Cielo, Stone etc)
- "cupom_fiscal": cupom fiscal de caixa registradora/PDV
- "nf": nota fiscal impressa com chave de acesso
- "recibo": recibo simples impresso ou manuscrito
- "pix_bancario": comprovante gerado pelo app do banco (Nubank, Inter, BB etc) — REJEITAR
- "outro": qualquer outro tipo

Retorne APENAS JSON válido sem texto adicional:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "merchant_name": "nome do estabelecimento ou null",
  "total_amount": 0.00,
  "purchase_date": "YYYY-MM-DD ou null",
  "document_type": "cupom_maquininha | cupom_fiscal | nf | recibo | pix_bancario | outro",
  "confidence": 0.95,
  "is_suspicious": false,
  "suspicion_reason": null
}`;

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

  const client = new Anthropic({ apiKey, timeout: 25_000 });

  try {
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 500,
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
