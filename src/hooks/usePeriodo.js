import { useState, useMemo } from 'react';

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_EXTENSO = ["janeiro","fevereiro","março","abril","maio","junho",
                       "julho","agosto","setembro","outubro","novembro","dezembro"];

/**
 * Hook central de período mensal/anual.
 *
 * CAMPO DE FILTRO: data_vencimento
 *  - Define o mês da fatura/lançamento
 *  - 'Fatura BB junho/2026' → todos têm data_vencimento em junho/2026
 *  - Lançamentos manuais → data_vencimento = data do lançamento
 *  - Parcelados → data_vencimento = data desta parcela
 */
export function usePeriodo(lancamentos) {
  const hoje = new Date();
  const defaultMesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesAno, setMesAno] = useState(defaultMesAno);

  const periodos = useMemo(() => {
    const datas = lancamentos
      .map(l => (l.data_vencimento || l.data_compra || "").slice(0, 7))
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

  // Filtro por data_vencimento — define o mês da fatura
  const lancFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const d = l.data_vencimento || l.data_compra || "";
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

export { MESES_PT, MESES_EXTENSO };
