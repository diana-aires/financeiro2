import { C, styles } from '../../styles/theme';
import { fmt, formatDate } from '../../utils/formatters';

/**
 * LancamentosList — versão simplificada sem filtro próprio de mês.
 * O filtro é feito no Dashboard via usePeriodo e passado como lancamentos já filtrados.
 */
export function LancamentosList({ lancamentos, lancamentosTotal, sP, onEditar, onDuplicar, onDeletar }) {
  return (
    <div style={styles.card}>
      {lancamentos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: C.grayD }}>
          <i className="ti ti-inbox" style={{ fontSize: 40, display: "block", marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Nenhum lançamento neste período</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Use o seletor de período acima para navegar entre meses</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid " + C.border, background: C.slate }}>
                {["Vencimento","Compra","Descrição","Categoria","Parcela","Valor","Ações"].map(h => (
                  <th key={h} style={{ textAlign: h === "Valor" ? "right" : h === "Ações" ? "center" : "left", padding: "8px", fontWeight: 600, color: C.grayD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lancamentos.map(l => (
                <tr key={l.id} className="row-hover" style={{ borderBottom: "1px solid " + C.border }}>
                  <td style={{ padding: 8, color: C.grayD, whiteSpace: "nowrap" }}>{formatDate(l.data_vencimento)}</td>
                  <td style={{ padding: 8, color: C.grayD, whiteSpace: "nowrap" }}>{formatDate(l.data_compra)}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>{l.descricao}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: l.tipo === "receita" ? "#ECFDF5" : "#FEF2F2", color: l.tipo === "receita" ? C.greenD : C.red }}>
                      {l.cat}
                    </span>
                  </td>
                  <td style={{ padding: 8, fontSize: 10, color: C.grayD, whiteSpace: "nowrap" }}>
                    {l.parcelas ? `${l.parcela_atual || 1}/${l.parcelas}` : "—"}
                    {l.cartao && <span style={{ marginLeft: 4, fontSize: 9, color: C.purple }}>({l.cartao})</span>}
                  </td>
                  <td style={{ padding: 8, fontWeight: 700, color: l.tipo === "receita" ? C.green : C.red, textAlign: "right", whiteSpace: "nowrap" }}>
                    {l.tipo === "despesa" ? "-" : "+"}{fmt(l.valor)}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap", textAlign: "center" }}>
                    <button onClick={() => onEditar(l)} style={styles.buttonIcon} title="Editar"><i className="ti ti-edit" style={{ fontSize: 13, color: C.navy }} /></button>
                    <button onClick={() => onDuplicar(l)} style={styles.buttonIcon} title="Duplicar"><i className="ti ti-copy" style={{ fontSize: 13, color: C.purple }} /></button>
                    <button onClick={() => onDeletar(l.id)} style={styles.buttonIcon} title="Excluir"><i className="ti ti-trash" style={{ fontSize: 13, color: C.red }} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid " + C.border, background: C.slate }}>
                <td colSpan={5} style={{ padding: 8, fontWeight: 600, fontSize: 12 }}>
                  Saldo do período ({lancamentos.length} lançamentos)
                </td>
                <td style={{ padding: 8, fontWeight: 700, textAlign: "right", fontSize: 14, color: sP >= 0 ? C.green : C.red }}>
                  {sP >= 0 ? "+" : ""}{fmt(sP)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
