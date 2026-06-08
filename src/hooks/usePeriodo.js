import { useState, useMemo } from 'react';

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/**
 * Hook central de período mensal/anual.
 *
 * FILTRO: usa data_compra (não data_vencimento), pois:
 *  - Lançamentos simples: data_compra = quando a compra aconteceu
 *  - Parcelados: data_compra = quando esta parcela é cobrada neste mês
 *  - data_vencimento nos parcelados = data da última parcela (diferente a cada registro)
 *
 * Retorna:
 *  - mesAno        : "2025-06"  (string ISO, mês selecionado)
 *  - setMesAno     : setter direto
 *  - periodos      : [{valor:"2025-06", label:"Jun/2025"}, ...] ordenados desc
 *  - labelAtual    : "Jun/2025"
 *  - lancFiltrados : lançamentos onde data_compra começa com mesAno
 *  - irParaMes, mesAnterior, proximoMes
 */
export function usePeriodo(lancamentos) {
  const hoje = new Date();
  const defaultMesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [mesAno, setMesAno] = useState(defaultMesAno);

  // Períodos distintos presentes em data_compra, ordenados desc
  const periodos = useMemo(() => {
    const datas = lancamentos
      .map(l => (l.data_compra || l.data_vencimento || "").slice(0, 7))
      .filter(Boolean);

    const unicos = [...new Set(datas)].sort().reverse();

    return unicos.map(v => {
      const [ano, mes] = v.split('-');
      return { valor: v, label: `${MESES_PT[parseInt(mes) - 1]}/${ano}` };
    });
  }, [lancamentos]);

  const labelAtual = useMemo(() => {
    const found = periodos.find(p => p.valor === mesAno);
    if (found) return found.label;
    const [ano, mes] = mesAno.split('-');
    return `${MESES_PT[parseInt(mes) - 1]}/${ano}`;
  }, [mesAno, periodos]);

  // FILTRO: data_compra (campo que representa quando o gasto ocorre neste mês)
  const lancFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const d = l.data_compra || l.data_vencimento || "";
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

