import { useState, useMemo } from 'react';

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/**
 * Hook central de período mensal/anual.
 *
 * Retorna:
 *  - mesAno        : "2025-06"  (string ISO, mês selecionado)
 *  - setMesAno     : setter direto
 *  - periodos      : [{valor:"2025-06", label:"Jun/2025"}, ...] ordenados desc
 *  - labelAtual    : "Jun/2025"
 *  - lancFiltrados : lançamentos do mês/ano selecionado (por data_vencimento ou data)
 *  - irParaMes     : (valor) => setMesAno(valor)
 *  - mesAnterior / proximo : navegar
 */
export function usePeriodo(lancamentos) {
  // Mês atual como default
  const hoje = new Date();
  const defaultMesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [mesAno, setMesAno] = useState(defaultMesAno);

  // Todos os períodos presentes nos lançamentos, ordenados desc
  const periodos = useMemo(() => {
    const datas = lancamentos.map(l => {
      const d = l.data_vencimento || l.data || l.data_compra || "";
      return d.slice(0, 7); // "YYYY-MM"
    }).filter(Boolean);

    const unicos = [...new Set(datas)].sort().reverse();

    return unicos.map(v => {
      const [ano, mes] = v.split('-');
      return { valor: v, label: `${MESES_PT[parseInt(mes) - 1]}/${ano}` };
    });
  }, [lancamentos]);

  // Label do mês selecionado
  const labelAtual = useMemo(() => {
    const found = periodos.find(p => p.valor === mesAno);
    if (found) return found.label;
    const [ano, mes] = mesAno.split('-');
    return `${MESES_PT[parseInt(mes) - 1]}/${ano}`;
  }, [mesAno, periodos]);

  // Lançamentos filtrados pelo mês/ano selecionado
  const lancFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const d = l.data_vencimento || l.data || l.data_compra || "";
      return d.startsWith(mesAno);
    });
  }, [lancamentos, mesAno]);

  function irParaMes(valor) { setMesAno(valor); }

  function mesAnterior() {
    const [ano, mes] = mesAno.split('-').map(Number);
    const d = new Date(ano, mes - 2, 1);
    setMesAno(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function proximoMes() {
    const [ano, mes] = mesAno.split('-').map(Number);
    const d = new Date(ano, mes, 1);
    setMesAno(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return { mesAno, setMesAno, periodos, labelAtual, lancFiltrados, irParaMes, mesAnterior, proximoMes };
}

export { MESES_PT };
