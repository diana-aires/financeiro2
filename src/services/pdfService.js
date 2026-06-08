import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/* ─────────────────────────────────────────────
   EXTRAÇÃO DE TEXTO DO PDF
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   PARSING PRINCIPAL
   
   Lógica de parcelamentos:
   - Linha da fatura: "03/03 AMAZON 2/6 R$ 150,00"
     → data_compra    = 03/03/2026  (data literal da linha)
     → data_vencimento= vencimento da fatura  (extraído do cabeçalho)
     → parcela_atual  = 2
     → parcelas       = 6
     → cartao         = nome do cartão (extraído do cabeçalho)
   
   - NÃO gera parcelas futuras aqui — o controle de avanço
     de parcela_atual fica na tela de Cartão (marcar como paga).
───────────────────────────────────────────── */
function parseTransactions(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const vencimentoFatura = extractVencimento(lines);
  const nomeCartao       = extractNomeCartao(lines);

  const transactions = [];

  for (const line of lines) {
    if (isLinhaIgnorada(line)) continue;

    const entry = parseLinha(line, vencimentoFatura, nomeCartao);
    if (entry) transactions.push(entry);
  }

  return transactions;
}

/* ─────────────────────────────────────────────
   EXTRAIR VENCIMENTO DA FATURA (cabeçalho)
───────────────────────────────────────────── */
function extractVencimento(lines) {
  const patterns = [
    /vencimento[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /vencimento[:\s]+(\d{2}\/\d{2}\/\d{2})/i,
    /due\s*date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /data\s*de\s*pagamento[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
    /pagar\s*até[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  ];

  for (const line of lines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) return isoFromBR(m[1]);
    }
  }

  // Fallback: próximo dia 10 do mês atual
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
  if (d < hoje) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

/* ─────────────────────────────────────────────
   EXTRAIR NOME DO CARTÃO (cabeçalho)
───────────────────────────────────────────── */
function extractNomeCartao(lines) {
  const patterns = [
    /nubank/i, /inter/i, /itaú|itau/i, /bradesco/i,
    /santander/i, /c6\s*bank/i, /caixa/i, /bb\b|banco\s*do\s*brasil/i,
    /xp\s*visa/i, /neon/i, /next/i, /picpay/i,
  ];
  const labels = [
    'Nubank','Inter','Itaú','Bradesco',
    'Santander','C6','Caixa','BB',
    'XP Visa','Neon','Next','PicPay',
  ];

  for (const line of lines.slice(0, 20)) { // cabeçalho: primeiras 20 linhas
    for (let i = 0; i < patterns.length; i++) {
      if (patterns[i].test(line)) return labels[i];
    }
  }
  return 'Importado';
}

/* ─────────────────────────────────────────────
   LINHAS A IGNORAR
───────────────────────────────────────────── */
function isLinhaIgnorada(line) {
  const ignorar = [
    /total\s+da\s+fatura/i,
    /saldo\s+anterior/i,
    /pagamento\s+recebido/i,
    /limite\s+(total|disponível)/i,
    /fatura\s+fechada/i,
    /vencimento/i,
    /^\s*$/,
  ];
  return ignorar.some(re => re.test(line));
}

/* ─────────────────────────────────────────────
   PARSEAR UMA LINHA
   
   Formatos suportados:
   1) "03/03 AMAZON PRIME 2/6 150,00"
   2) "03/03/2026 AMAZON PRIME 2/6 R$ 150,00"
   3) "03/03 NETFLIX 150,00"            (sem parcelamento)
   4) "03 MAR AMAZON 2/6 150,00"
───────────────────────────────────────────── */
function parseLinha(line, vencimentoFatura, cartao) {
  // ── Detectar valor monetário (obrigatório) ──
  // Aceita: "1.500,00" / "150,00" / "R$ 150,00"
  const valorRe = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
  const valorMatch = line.match(valorRe);
  if (!valorMatch) return null;

  const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
  if (!valor || valor <= 0) return null;

  const semValor = line.slice(0, valorMatch.index).trim();

  // ── Detectar parcelamento: "2/6" ou "02/06" ──
  // ATENÇÃO: não confundir com datas "03/03" — parcelamento vem após a descrição
  const parcelaRe = /\b(\d{1,2})\/(\d{1,2})\s*$/;
  let parcela_atual = null;
  let parcelas = null;
  let semParcela = semValor;

  const parcelaMatch = semValor.match(parcelaRe);
  if (parcelaMatch) {
    const pa = parseInt(parcelaMatch[1]);
    const pt = parseInt(parcelaMatch[2]);
    // Válido se pa <= pt e pt > 1 e pt <= 96 (máximo 8 anos)
    if (pa <= pt && pt > 1 && pt <= 96) {
      parcela_atual = pa;
      parcelas = pt;
      semParcela = semValor.slice(0, parcelaMatch.index).trim();
    }
  }

  // ── Detectar data da compra ──
  // Formatos: "03/03/2026", "03/03/26", "03/03", "03 MAR"
  const dataRe = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+/;
  const dataRe2 = /^(\d{2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))\s+/i;

  let data_compra = null;
  let descricao = semParcela;

  const dataMatch = semParcela.match(dataRe);
  const dataMatch2 = semParcela.match(dataRe2);

  if (dataMatch) {
    data_compra = isoFromBR(dataMatch[1], vencimentoFatura);
    descricao = semParcela.slice(dataMatch[0].length).trim();
  } else if (dataMatch2) {
    data_compra = isoFromMesAbrev(dataMatch2[1], vencimentoFatura);
    descricao = semParcela.slice(dataMatch2[0].length).trim();
  }

  // Sem data válida → ignora linha
  if (!data_compra) return null;

  // Descrição mínima
  descricao = limpezaDescricao(descricao);
  if (descricao.length < 3) return null;

  return {
    data_compra,
    data_vencimento: vencimentoFatura,
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

/* ─────────────────────────────────────────────
   CONVERSÃO DE DATAS
───────────────────────────────────────────── */

/**
 * "03/03/2026" → "2026-03-03"
 * "03/03/26"   → "2026-03-03"
 * "03/03"      → ano inferido pelo contexto do vencimento da fatura
 */
function isoFromBR(dateStr, vencimentoFatura = null) {
  const parts = dateStr.trim().split('/');
  const day   = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');

  let year;
  if (parts[2]) {
    year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  } else if (vencimentoFatura) {
    // Infere o ano: se o mês da compra > mês do vencimento, é ano anterior
    const vAno = parseInt(vencimentoFatura.slice(0, 4));
    const vMes = parseInt(vencimentoFatura.slice(5, 7));
    const cMes = parseInt(month);
    year = String(cMes > vMes ? vAno - 1 : vAno);
  } else {
    year = String(new Date().getFullYear());
  }

  return `${year}-${month}-${day}`;
}

/**
 * "03 MAR" → "2026-03-03"
 */
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

/* ─────────────────────────────────────────────
   LIMPEZA DE DESCRIÇÃO
───────────────────────────────────────────── */
function limpezaDescricao(str) {
  return str
    .replace(/r\$\s*/gi, '')           // Remove "R$"
    .replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, '') // Remove valores residuais
    .replace(/[^\w\s\u00C0-\u00FF\-\.\/]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toUpperCase();
}

/* ─────────────────────────────────────────────
   CATEGORIZAÇÃO AUTOMÁTICA
───────────────────────────────────────────── */
const CATEGORIAS_MAP = [
  { re: /supermercado|mercado|carrefour|extra|pao\s*de\s*acucar|atacadao|assai/i, cat: 'Alimentação' },
  { re: /ifood|rappi|uber\s*eat|delivery|pizza|burger|mcdonalds|subway|restaurante|lanchonete|padaria/i, cat: 'Alimentação' },
  { re: /netflix|spotify|amazon\s*prime|disney|hbo|globo\s*play|paramount|deezer|apple\s*tv/i, cat: 'Assinaturas' },
  { re: /uber|99\s*pop|cabify|taxi|99taxi/i, cat: 'Transporte' },
  { re: /posto|petrobras|shell|ipiranga|gasolina|combustivel/i, cat: 'Transporte' },
  { re: /farmacia|drogaria|droga\s*raia|pacheco|ultrafarma|remedios/i, cat: 'Saúde' },
  { re: /medico|clinica|hospital|laboratorio|exame|plano\s*de\s*saude|unimed|amil/i, cat: 'Saúde' },
  { re: /amazon|mercado\s*livre|shopee|aliexpress|americanas|magazineluiza|magazine\s*luiza|submarino/i, cat: 'Compras' },
  { re: /shopping|loja|zara|renner|riachuelo|hm|centauro/i, cat: 'Compras' },
  { re: /energia|light|enel|cemig|copel|eletropaulo|coelba/i, cat: 'Energia' },
  { re: /internet|vivo|claro|tim|oi\s*fibra|net\s*combo|banda\s*larga/i, cat: 'Internet' },
  { re: /hotel|airbnb|booking|pousada|hostel/i, cat: 'Viagem' },
  { re: /latam|gol|azul|tam|passagem|aeroporto/i, cat: 'Viagem' },
  { re: /cinema|ingresso|teatro|show|evento|bilheteria/i, cat: 'Lazer' },
  { re: /academia|crossfit|smart\s*fit|bodytech|gym/i, cat: 'Saúde' },
  { re: /sallve|natura|avon|boticario|sephora|beauty|cabelo|salao/i, cat: 'Beleza' },
  { re: /escola|faculdade|curso|udemy|alura|estacio|anhanguera/i, cat: 'Insumos' },
  { re: /financiamento|emprestimo|parcela\s*veiculo|carro|fipe/i, cat: 'Financiamento' },
  { re: /investimento|tesouro|cdb|fundo|acao|btg|xp\s*invest/i, cat: 'Investimento' },
];

function categorizar(descricao) {
  const d = descricao.toUpperCase();
  for (const { re, cat } of CATEGORIAS_MAP) {
    if (re.test(d)) return cat;
  }
  return 'Outro';
}

/* ─────────────────────────────────────────────
   EXPORT para uso futuro
───────────────────────────────────────────── */
export { isoFromBR, categorizar };
