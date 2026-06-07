import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Função para extrair dados do PDF da fatura
export async function extractDataFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        const transactions = parseTransactionsFromText(fullText);
        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Função para parsear transações do texto do PDF
function parseTransactionsFromText(text) {
  const transactions = [];
  const lines = text.split('\n');
  const datePattern = /(\d{2}\/\d{2})/;
  const valuePattern = /(\d+[.,]\d{2})/;
  
  let dueDate = extractDueDate(lines);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const valueMatch = line.match(valuePattern);
      if (valueMatch) {
        const transaction = extractTransaction(line, dateMatch, valueMatch, dueDate);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
  }
  
  return transactions;
}

function extractDueDate(lines) {
  const dueDatePattern = /vencimento|due date|fechamento/i;
  for (const line of lines) {
    if (dueDatePattern.test(line)) {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})|(\d{2}\/\d{2})/);
      if (dateMatch) {
        let dueDate = dateMatch[0];
        if (dueDate.length === 5) {
          const currentYear = new Date().getFullYear();
          dueDate = `${dueDate}/${currentYear}`;
        }
        return convertDateToISO(dueDate);
      }
    }
  }
  
  const today = new Date();
  today.setDate(today.getDate() + 10);
  return today.toISOString().split('T')[0];
}

function extractTransaction(line, dateMatch, valueMatch, dueDate) {
  const currentDate = dateMatch[1];
  let valueStr = valueMatch[1].replace(',', '.');
  const value = parseFloat(valueStr);
  const dateIndex = line.indexOf(currentDate);
  const valueIndex = line.lastIndexOf(valueMatch[1]);
  let description = line.substring(dateIndex + currentDate.length, valueIndex).trim();
  description = description.replace(/[^\w\s\u00C0-\u00FF-]/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (description && value > 0) {
    const category = categorizeTransaction(description);
    return {
      data_compra: convertDateToISO(currentDate),
      data_vencimento: dueDate,
      descricao: description.substring(0, 100),
      valor: value,
      cat: category,
      tipo: "despesa",
      cartao: "Importado",
      parcelas: null,
      parcela_atual: null
    };
  }
  return null;
}

// Função para categorizar automaticamente
function categorizeTransaction(description) {
  const keywords = {
    'SUPERMERCADO|MERCADO|PADARIA|ACOUGUE|FEIRA': 'Alimentação',
    'UBER|TAXI|99|TRANSPORTE|GASOLINA|POSTO': 'Transporte',
    'NETFLIX|SPOTIFY|AMAZON PRIME|DISNEY|HBO|STREAMING': 'Assinaturas',
    'FARMACIA|DROGARIA|SAUDE|MEDICO|DENTISTA': 'Saúde',
    'RESTAURANTE|IFOOD|COMIDA|LANCHONETE': 'Alimentação',
    'SHOPPING|LOJA|MAGAZINE|MERCADO LIVRE': 'Compras',
    'LUZ|ENERGIA|AGUA|GAS|TELEFONE|INTERNET': 'Contas',
    'ACADEMIA|GINASTICA|ESPORTE': 'Saúde',
    'VIAGEM|HOTEL|PASSAGEM': 'Viagem',
    'CINEMA|TEATRO|SHOW|LAZER': 'Lazer'
  };
  
  const upperDesc = description.toUpperCase();
  for (const [pattern, category] of Object.entries(keywords)) {
    if (new RegExp(pattern, 'i').test(upperDesc)) {
      return category;
    }
  }
  return 'Outro';
}

// Função para converter data
export function convertDateToISO(dateStr) {
  let day, month, year;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    day = parts[0].padStart(2, '0');
    month = parts[1].padStart(2, '0');
    if (parts.length === 3) {
      year = parts[2];
    } else {
      year = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      if (parseInt(month) < currentMonth) {
        year++;
      }
    }
  } else {
    return dateStr;
  }
  return `${year}-${month}-${day}`;
}
