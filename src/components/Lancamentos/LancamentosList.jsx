import { C, styles } from '../../styles/theme';
import { fmt, formatDate } from '../../utils/formatters';

export function LancamentosList({ lancamentos, lancamentosTotal, filtroMes, setFiltroMes, meses, sP, onEditar, onDuplicar, onDeletar }) {
  const totalEntradas = lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const totalSaidas = lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={{ ...styles.input, width: "auto" }}>
          <option value="">Todos os meses ({lancamentosTotal.length})</option>
          {meses.map((m) => <option key={m} value={m}>{m.replace("-", "/")}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.green }}>Entr: {fmt(totalEntradas)}</span>
        <span style={{ fontSize: 11, color: C.red }}>Saíd: {fmt(totalSaidas)}</span>
      </div>

      <div style={styles.card}>
        {lancamentos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: C.grayD, fontSize: 13 }}>Nenhum lançamento.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid " + C.border }}>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Vencimento</th>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Compra</th>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Descrição</th>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Categoria</th>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Parcela</th>
                  <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Valor</th>
                  <th style={{ textAlign: "center", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
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
                      {l.cartao && <span style={{ marginLeft: 4, fontSize: 9 }}>({l.cartao})</span>}
                    </td>
                    <td style={{ padding: 8, fontWeight: 700, color: l.tipo === "receita" ? C.green : C.red, textAlign: "right", whiteSpace: "nowrap" }}>
                      {l.tipo === "despesa" ? "-" : ""}{fmt(l.valor)}
                    </td>
                    <td style={{ padding: 8, whiteSpace: "nowrap", textAlign: "center" }}>
                      <button onClick={() => onEditar(l)} style={styles.buttonIcon}><i className="ti ti-edit" style={{ fontSize: 13, color: C.navy }} /></button>
                      <button onClick={() => onDuplicar(l)} style={styles.buttonIcon}><i className="ti ti-copy" style={{ fontSize: 13, color: C.purple }} /></button>
                      <button onClick={() => onDeletar(l.id)} style={styles.buttonIcon}><i className="ti ti-trash" style={{ fontSize: 13, color: C.red }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid " + C.border }}>
                  <td colSpan={6} style={{ padding: 8, fontWeight: 600 }}>Saldo do período</td>
                  <td style={{ padding: 8, fontWeight: 700, textAlign: "right", color: sP >= 0 ? C.green : C.red }}>{fmt(sP)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
