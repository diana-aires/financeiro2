import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/* ═══════════════════════════════════════════════════════════════
   MODELO DE DATAS — baseado nos dados reais do banco:

   LANÇAMENTO SIMPLES (sem parcela):
     data_compra     = data da transação (quando usou o cartão)
     data_vencimento = data de vencimento da FATURA (único, do cabeçalho)

   LANÇAMENTO PARCELADO (ex: linha "22/05 AMAZON 2/6 R$184,32"):
     data_compra     = data da linha na fatura (= quando esta parcela é cobrada)
     data_vencimento = data da ÚLTIMA parcela calculada:
                       vencimento_fatura + (parcelas_restantes × 1 mês)
                       Exemplo: fatura jun/2026, parcela 2/6 →
                         parcelas restantes = 6 - 2 = 4
                         última parcela = jun + 4 meses = out/2026
     parcela_atual   = número da parcela na linha (2)
     parcelas        = total de parcelas (6)
═══════════════════════════════════════════════════════════════ */

export async function extractDataFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        const transactions = parseTransactions(fullText);
        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ─── PARSING PRINCIPAL ─── */
function parseTransactions(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const vencimentoFatura = extractVencimento(lines);  // data do vencimento da fatura inteira
  const nomeCartao       = extractNomeCartao(lines);

  const transactions = [];

  for (const line of lines) {
    if (isLinhaIgnorada(line)) continue;
    const entry = parseLinha(line, vencimentoFatura, nomeCartao);
    if (entry) transactions.push(entry);
  }

  return transactions;
}

/* ─── EXTRAIR VENCIMENTO DA FATURA ─── */
function extractVencimento(lines) {
  const patterns = [
    /vencimento[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /vencimento[:\s]+(\d{2}\/\d{2}\/\d{2})/i,
    /due\s*date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /data\s*de\s*pagamento[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /pagar\s*até[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /pagamento\s*até[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  ];

  for (const line of lines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) return isoFromBR(m[1]);
    }
  }

  // Fallback: próximo dia 5 a partir de hoje
  const d = new Date();
  d.setDate(5);
  if (d < new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

/* ─── EXTRAIR NOME DO CARTÃO ─── */
function extractNomeCartao(lines) {
  const patterns = [
    { re: /nubank/i, label: 'Nubank' },
    { re: /inter/i, label: 'Inter' },
    { re: /itaú|itau/i, label: 'Itaú' },
    { re: /bradesco/i, label: 'Bradesco' },
    { re: /santander/i, label: 'Santander' },
    { re: /c6\s*bank/i, label: 'C6' },
    { re: /caixa/i, label: 'Caixa' },
    { re: /ourocard|banco\s*do\s*brasil|\bbb\b/i, label: 'OUROCARD BB' },
    { re: /mercado\s*pago/i, label: 'Mercado Pago' },
    { re: /xp\s*visa/i, label: 'XP Visa' },
    { re: /neon/i, label: 'Neon' },
    { re: /next/i, label: 'Next' },
    { re: /picpay/i, label: 'PicPay' },
  ];

  for (const line of lines.slice(0, 25)) {
    for (const { re, label } of patterns) {
      if (re.test(line)) return label;
    }
  }
  return 'Importado';
}

/* ─── LINHAS A IGNORAR ─── */
function isLinhaIgnorada(line) {
  return [
    /total\s+da\s+fatura/i,
    /saldo\s+anterior/i,
    /pagamento\s+recebido/i,
    /limite\s+(total|disponível|disponivel)/i,
    /fatura\s+(fechada|aberta|atual)/i,
    /vencimento/i,
    /data\s+de\s+pagamento/i,
    /^\s*$/,
    /^-+$/,
  ].some(re => re.test(line));
}

/* ─── PARSEAR UMA LINHA ─────────────────────────────────────────
   Formatos suportados:
     "22/05 AMAZON PRIME 2/6 R$ 184,32"
     "22/05/2026 AMAZON PRIME 2/6 184,32"
     "22/05 POSTO DUBAI 180,00"            (sem parcela)
     "22 MAI GALETERIA 55,00"
─────────────────────────────────────────────────────────────── */
function parseLinha(line, vencimentoFatura, cartao) {
  // 1. Detectar valor monetário no final
  const valorRe = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
  const valorMatch = line.match(valorRe);
  if (!valorMatch) return null;

  const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
  if (!valor || valor <= 0 || valor > 50000) return null;

  const semValor = line.slice(0, valorMatch.index).trim();

  // 2. Detectar parcelamento no final da descrição (antes do valor)
  //    Padrão: "2/6" ou "02/06" — garante que é parcela e não data
  //    Heurística: parcela vem APÓS a descrição, antes do valor
  const parcelaRe = /\b(\d{1,2})\/(\d{1,2})\s*$/;
  let parcela_atual = null;
  let parcelas = null;
  let semParcela = semValor;

  const parcelaMatch = semValor.match(parcelaRe);
  if (parcelaMatch) {
    const pa = parseInt(parcelaMatch[1]);
    const pt = parseInt(parcelaMatch[2]);
    // Válido: pa <= pt, pt >= 2, pt <= 96 (máx 8 anos)
    if (pa >= 1 && pa <= pt && pt >= 2 && pt <= 96) {
      parcela_atual = pa;
      parcelas = pt;
      semParcela = semValor.slice(0, parcelaMatch.index).trim();
    }
  }

  // 3. Detectar data da linha (= data da compra/cobrança)
  const dataRe  = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+/;
  const dataRe2 = /^(\d{2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))\s+/i;

  let data_compra = null;
  let descricao = semParcela;

  const dataMatch  = semParcela.match(dataRe);
  const dataMatch2 = semParcela.match(dataRe2);

  if (dataMatch) {
    data_compra = isoFromBR(dataMatch[1], vencimentoFatura);
    descricao = semParcela.slice(dataMatch[0].length).trim();
  } else if (dataMatch2) {
    data_compra = isoFromMesAbrev(dataMatch2[1], vencimentoFatura);
    descricao = semParcela.slice(dataMatch2[0].length).trim();
  }

  if (!data_compra) return null;

  descricao = limpezaDescricao(descricao);
  if (descricao.length < 3) return null;

  // 4. Calcular data_vencimento conforme o modelo real do banco:
  //
  //    Simples  → vencimento da fatura (mesmo para todos)
  //    Parcelado → data da última parcela:
  //                 vencimento_fatura + (parcelas - parcela_atual) meses
  const data_vencimento = calcularVencimento(vencimentoFatura, parcela_atual, parcelas);

  return {
    data_compra,
    data_vencimento,
    descricao: descricao.slice(0, 100),
    valor,
    cat: categorizar(descricao),
    tipo: 'despesa',
    cartao,
    parcelas:      parcelas      ?? null,
    parcela_atual: parcela_atual ?? null,
    observacao: parcelas
      ? `Importado da fatura — parcela ${parcela_atual}/${parcelas}`
      : 'Importado da fatura',
  };
}

/* ─── CALCULAR DATA DE VENCIMENTO ─────────────────────────────
   Simples:    retorna vencimentoFatura direto
   Parcelado:  vencimentoFatura + parcelas_restantes meses
               Ex: fatura vence 05/06/2026, parcela 2/6
                   restantes = 6 - 2 = 4
                   última = 05/10/2026
─────────────────────────────────────────────────────────────── */
function calcularVencimento(vencimentoFatura, parcela_atual, parcelas) {
  if (!parcelas || !parcela_atual) return vencimentoFatura;

  const restantes = parcelas - parcela_atual;
  if (restantes === 0) return vencimentoFatura;

  const [ano, mes, dia] = vencimentoFatura.split('-').map(Number);
  const d = new Date(ano, mes - 1 + restantes, dia);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/* ─── CONVERSÃO DE DATAS ─── */

/**
 * "22/05/2026" → "2026-05-22"
 * "22/05/26"   → "2026-05-22"
 * "22/05"      → ano inferido pelo vencimento da fatura:
 *                 se mês da compra > mês do vencimento → ano anterior
 */
function isoFromBR(dateStr, vencimentoFatura = null) {
  const parts = dateStr.trim().split('/');
  const day   = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');

  let year;
  if (parts[2]) {
    year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  } else if (vencimentoFatura) {
    const vAno = parseInt(vencimentoFatura.slice(0, 4));
    const vMes = parseInt(vencimentoFatura.slice(5, 7));
    const cMes = parseInt(month);
    year = String(cMes > vMes ? vAno - 1 : vAno);
  } else {
    year = String(new Date().getFullYear());
  }

  return `${year}-${month}-${day}`;
}

const MESES_ABREV = { jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12 };

function isoFromMesAbrev(str, vencimentoFatura = null) {
  const parts = str.trim().split(/\s+/);
  const day   = parts[0].padStart(2, '0');
  const month = String(MESES_ABREV[parts[1].toLowerCase()] || 1).padStart(2, '0');

  let year;
  if (vencimentoFatura) {
    const vAno = parseInt(vencimentoFatura.slice(0, 4));
    const vMes = parseInt(vencimentoFatura.slice(5, 7));
    const cMes = parseInt(month);
    year = String(cMes > vMes ? vAno - 1 : vAno);
  } else {
    year = String(new Date().getFullYear());
  }

  return `${year}-${month}-${day}`;
}

/* ─── LIMPEZA DE DESCRIÇÃO ─── */
function limpezaDescricao(str) {
  return str
    .replace(/r\$\s*/gi, '')
    .replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, '')
    .replace(/[^\w\s\u00C0-\u00FF\-\.\/]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toUpperCase();
}

/* ─── CATEGORIZAÇÃO ─── */
const CATEGORIAS_MAP = [
  { re: /supermercado|mercado|carrefour|extra|pao\s*de\s*acucar|atacadao|assai|mateus|emporio|spazio|ilha\s*super|minimarket/i, cat: 'Supermercados' },
  { re: /ifood|rappi|uber\s*eat|delivery|pizza|burger|mcdonalds|subway|restaurante|lanchonete|padaria|bistro|galeteria|bonsai|kfc|cabana|selfitari|diverno|dali\s*pizza|casa\s*de\s*paes/i, cat: 'Restaurantes' },
  { re: /netflix|spotify|amazon\s*prime|disney|hbo|globo\s*play|paramount|deezer|apple\s*tv|smiles/i, cat: 'Assinaturas' },
  { re: /uber|99\s*pop|cabify|taxi|estacionamento/i, cat: 'Transporte' },
  { re: /posto|petrobras|shell|ipiranga|gasolina|combustivel|dubai/i, cat: 'Transporte' },
  { re: /farmacia|drogaria|droga\s*raia|pacheco|ultrafarma|drogasil|extrafarma/i, cat: 'Saude' },
  { re: /medico|clinica|hospital|laboratorio|exame|plano\s*de\s*saude|unimed|amil/i, cat: 'Saude' },
  { re: /amazon|mercado\s*livre|shopee|aliexpress|americanas|magazineluiza|magazine\s*luiza|submarino|havan|casas\s*bahia|pex\s*onr|magalu|acacia|livra/i, cat: 'Compras' },
  { re: /energia|light|enel|cemig|copel|eletropaulo|coelba/i, cat: 'Energia' },
  { re: /internet|fibra|banda\s*larga/i, cat: 'Internet' },
  { re: /vivo|claro|tim|oi\b/i, cat: 'Telefone' },
  { re: /hotel|airbnb|booking|pousada|hostel|bussola\s*de\s*passagens/i, cat: 'Viagem' },
  { re: /latam|gol|azul|tam|passagem|aeroporto/i, cat: 'Viagem' },
  { re: /cinema|ingresso|teatro|show|evento/i, cat: 'Lazer' },
  { re: /academia|crossfit|smart\s*fit|bodytech|gym/i, cat: 'Saude' },
  { re: /sallve|natura|avon|boticario|sephora|esmalteria/i, cat: 'Beleza' },
  { re: /escola|faculdade|curso|udemy|alura/i, cat: 'Insumos' },
  { re: /financiamento|emprestimo/i, cat: 'Financiamento' },
  { re: /investimento|tesouro|cdb|fundo/i, cat: 'Investimento' },
  { re: /itech|servico|manutencao/i, cat: 'Servicos' },
];

function categorizar(descricao) {
  const d = descricao.toUpperCase();
  for (const { re, cat } of CATEGORIAS_MAP) {
    if (re.test(d)) return cat;
  }
  return 'Outro';
}

export { isoFromBR, calcularVencimento, categorizar };

