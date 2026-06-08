import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Usa o worker empacotado pelo Vite — sem CDN externo, sem dependência de versão
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/* ═══════════════════════════════════════════════════════════════
   MODELO DE DADOS — baseado nos lançamentos reais do banco:

   Todos os itens de uma fatura compartilham:
     data_vencimento = vencimento da fatura (define o MÊS da fatura)
     cartao          = nome do cartão
     observacao      = "Fatura <Cartão> <mês>/<ano>"  ← agrupa a fatura

   Cada item tem individualmente:
     data_compra     = data real da transação
     descricao, valor, cat, tipo

   Parcelados (ex: "2/6"):
     parcela_atual, parcelas preenchidos
     observacao = "Fatura <Cartão> <mês>/<ano>" (igual aos demais)
     data_vencimento = vencimento desta parcela (= vencimento da fatura atual)

   Mês de referência da fatura = mês do vencimento (data_vencimento)
   Lançamentos simples e parcelados de fatura vão para Lançamentos normalmente.
   A aba Faturas organiza e exibe por fatura (via campo observacao).
═══════════════════════════════════════════════════════════════ */

const MESES_EXTENSO = ["janeiro","fevereiro","março","abril","maio","junho",
                        "julho","agosto","setembro","outubro","novembro","dezembro"];

/**
 * Extrai dados do PDF e retorna:
 * {
 *   faturaLabel: "Fatura OUROCARD BB junho/2026",
 *   vencimento: "2026-06-05",
 *   cartao: "OUROCARD BB",
 *   totalFatura: 1234.56,
 *   lancamentos: [ ...array de objetos prontos para inserir no banco ]
 * }
 */
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
        resolve(parseFatura(fullText));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ─── PARSING PRINCIPAL ─── */
function parseFatura(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const vencimento  = extractVencimento(lines);
  const cartao      = extractNomeCartao(lines);
  const faturaLabel = buildFaturaLabel(cartao, vencimento);

  const lancamentos = [];
  for (const line of lines) {
    if (isLinhaIgnorada(line)) continue;
    const entry = parseLinha(line, vencimento, cartao, faturaLabel);
    if (entry) lancamentos.push(entry);
  }

  const totalFatura = lancamentos.reduce((s, l) => s + l.valor, 0);

  return { faturaLabel, vencimento, cartao, totalFatura, lancamentos };
}

/* ─── LABEL DA FATURA ─── */
function buildFaturaLabel(cartao, vencimento) {
  const [ano, mes] = vencimento.split('-');
  const mesNome = MESES_EXTENSO[parseInt(mes) - 1];
  return `Fatura ${cartao} ${mesNome}/${ano}`;
}

/* ─── EXTRAIR VENCIMENTO DO CABEÇALHO ─── */
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
  // Fallback: dia 5 do próximo mês
  const d = new Date();
  d.setDate(5);
  if (d <= new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

/* ─── EXTRAIR NOME DO CARTÃO ─── */
function extractNomeCartao(lines) {
  const map = [
    { re: /ourocard|banco\s*do\s*brasil|\bbb\b/i, label: 'OUROCARD BB' },
    { re: /nubank/i, label: 'Nubank' },
    { re: /inter/i, label: 'Inter' },
    { re: /itaú|itau/i, label: 'Itaú' },
    { re: /bradesco/i, label: 'Bradesco' },
    { re: /santander/i, label: 'Santander' },
    { re: /c6\s*bank/i, label: 'C6' },
    { re: /caixa/i, label: 'Caixa' },
    { re: /mercado\s*pago/i, label: 'Mercado Pago' },
    { re: /xp\s*visa/i, label: 'XP Visa' },
    { re: /neon/i, label: 'Neon' },
    { re: /picpay/i, label: 'PicPay' },
  ];
  for (const line of lines.slice(0, 30)) {
    for (const { re, label } of map) {
      if (re.test(line)) return label;
    }
  }
  return 'Cartão';
}

/* ─── LINHAS A IGNORAR ─── */
function isLinhaIgnorada(line) {
  return [
    /total\s+da\s+fatura/i, /saldo\s+anterior/i, /pagamento\s+recebido/i,
    /limite\s+(total|disponível|disponivel)/i, /fatura\s+(fechada|aberta|atual)/i,
    /vencimento/i, /data\s+de\s+pagamento/i, /^\s*$/, /^-+$/,
  ].some(re => re.test(line));
}

/* ─── PARSEAR UMA LINHA ─────────────────────────────────────────
   Formatos suportados:
     "22/05 AMAZON PRIME 2/6 R$ 184,32"
     "22/05/2026 POSTO DUBAI 180,00"
     "22/05 NETFLIX 42,00"
     "22 MAI GALETERIA 55,00"
─────────────────────────────────────────────────────────────── */
function parseLinha(line, vencimentoFatura, cartao, faturaLabel) {
  // 1. Valor monetário no final
  const valorRe = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
  const valorMatch = line.match(valorRe);
  if (!valorMatch) return null;

  const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
  if (!valor || valor <= 0 || valor > 50000) return null;

  let semValor = line.slice(0, valorMatch.index).trim();

  // 2. Parcelamento (N/T) antes do valor
  const parcelaRe = /\b(\d{1,2})\/(\d{1,2})\s*$/;
  let parcela_atual = null, parcelas = null;
  const parcelaMatch = semValor.match(parcelaRe);
  if (parcelaMatch) {
    const pa = parseInt(parcelaMatch[1]), pt = parseInt(parcelaMatch[2]);
    if (pa >= 1 && pa <= pt && pt >= 2 && pt <= 96) {
      parcela_atual = pa;
      parcelas = pt;
      semValor = semValor.slice(0, parcelaMatch.index).trim();
    }
  }

  // 3. Data da transação
  const dataRe  = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+/;
  const dataRe2 = /^(\d{2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))\s+/i;
  let data_compra = null, descricao = semValor;

  const dm = semValor.match(dataRe);
  const dm2 = semValor.match(dataRe2);
  if (dm) {
    data_compra = isoFromBR(dm[1], vencimentoFatura);
    descricao = semValor.slice(dm[0].length).trim();
  } else if (dm2) {
    data_compra = isoFromMesAbrev(dm2[1], vencimentoFatura);
    descricao = semValor.slice(dm2[0].length).trim();
  }

  if (!data_compra) return null;

  descricao = limpeza(descricao);
  if (descricao.length < 3) return null;

  // Observacao sempre no formato da fatura real do banco
  const observacao = parcelas
    ? `${faturaLabel} — parcela ${parcela_atual}/${parcelas}`
    : faturaLabel;

  return {
    tipo: 'despesa',
    cat: categorizar(descricao),
    descricao: descricao.slice(0, 100),
    valor,
    data_compra,          // data real da transação
    data_vencimento: vencimentoFatura,  // vencimento da fatura = mês da fatura
    cartao,
    parcelas:      parcelas      ?? null,
    parcela_atual: parcela_atual ?? null,
    observacao,
  };
}

/* ─── DATAS ─── */
function isoFromBR(dateStr, vencimentoFatura = null) {
  const parts = dateStr.trim().split('/');
  const day = parts[0].padStart(2, '0');
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

const MESES_ABREV = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};

function isoFromMesAbrev(str, vencimentoFatura = null) {
  const parts = str.trim().split(/\s+/);
  const day   = parts[0].padStart(2, '0');
  const month = String(MESES_ABREV[parts[1].toLowerCase()] || 1).padStart(2, '0');
  let year;
  if (vencimentoFatura) {
    const vAno = parseInt(vencimentoFatura.slice(0, 4));
    const vMes = parseInt(vencimentoFatura.slice(5, 7));
    year = String(parseInt(month) > vMes ? vAno - 1 : vAno);
  } else {
    year = String(new Date().getFullYear());
  }
  return `${year}-${month}-${day}`;
}

/* ─── LIMPEZA ─── */
function limpeza(str) {
  return str.replace(/r\$\s*/gi,'').replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g,'')
    .replace(/[^\w\s\u00C0-\u00FF\-\.\/]/g,' ').replace(/\s{2,}/g,' ').trim().toUpperCase();
}

/* ─── CATEGORIZAÇÃO ─── */
const CATS_MAP = [
  { re:/supermercado|mercado|carrefour|atacadao|assai|mateus|emporio|spazio|ilha\s*super|minimarket/i, cat:'Supermercados' },
  { re:/ifood|rappi|uber\s*eat|delivery|pizza|burger|mcdonalds|subway|restaurante|lanchonete|padaria|bistro|galeteria|bonsai|kfc|cabana|selfitari|diverno|dali\s*pizza|casa\s*de\s*paes/i, cat:'Restaurantes' },
  { re:/netflix|spotify|amazon\s*prime|disney|hbo|globo\s*play|paramount|deezer|apple\s*tv|smiles/i, cat:'Assinaturas' },
  { re:/uber|99\s*pop|cabify|taxi|estacionamento/i, cat:'Transporte' },
  { re:/posto|petrobras|shell|ipiranga|gasolina|combustivel|dubai/i, cat:'Transporte' },
  { re:/farmacia|drogaria|droga\s*raia|drogasil|extrafarma|ultrafarma/i, cat:'Saude' },
  { re:/medico|clinica|hospital|laboratorio|exame|unimed|amil/i, cat:'Saude' },
  { re:/amazon|mercado\s*livre|shopee|americanas|magazineluiza|magalu|havan|casas\s*bahia|pex\s*onr|acacia|livra|shopee/i, cat:'Compras' },
  { re:/energia|light|enel|cemig|copel/i, cat:'Energia' },
  { re:/internet|fibra|banda\s*larga/i, cat:'Internet' },
  { re:/vivo|claro|tim|oi\b/i, cat:'Telefone' },
  { re:/hotel|airbnb|booking|pousada|bussola\s*de\s*passagens/i, cat:'Viagem' },
  { re:/latam|gol|azul|passagem|aeroporto/i, cat:'Viagem' },
  { re:/cinema|ingresso|teatro|show|evento/i, cat:'Lazer' },
  { re:/academia|crossfit|smart\s*fit/i, cat:'Saude' },
  { re:/natura|boticario|sephora|esmalteria/i, cat:'Beleza' },
  { re:/financiamento|emprestimo/i, cat:'Financiamento' },
  { re:/itech|servico/i, cat:'Servicos' },
];

function categorizar(desc) {
  const d = desc.toUpperCase();
  for (const { re, cat } of CATS_MAP) if (re.test(d)) return cat;
  return 'Outro';
}

export { isoFromBR, buildFaturaLabel };
