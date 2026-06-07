import { C, styles } from '../../styles/theme';
import { fmtPct } from '../../utils/formatters';
import { Bar } from '../Common/Bar';

export function DashboardIndicadores({ tR, rec, desp }) {
  const rF = rec.filter((l) => l?.cat === "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const rV = rec.filter((l) => l?.cat !== "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const dF = desp.filter((l) => l?.cat === "Aluguel" || l?.cat === "Energia" || l?.cat === "Internet" || l?.cat === "Telefone" || l?.cat === "Assinaturas").reduce((s, l) => s + Number(l?.valor || 0), 0);
  
  const txP = tR > 0 ? (tR - desp.reduce((s, l) => s + Number(l?.valor || 0), 0)) / tR : 0;
  const dC = tR > 0 ? rF / tR : 0;
  const cFx = tR > 0 ? dF / tR : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginBottom: 14 }}>
      <div style={styles.card}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Receita</div>
        {[["Fixa (CLT)", rF, C.navy], ["Variável", rV, C.green]].map(([l, v, c]) => (
          <div key={l} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: C.grayD }}>{l}</span>
              <span style={{ fontWeight: 600, color: c }}>{tR > 0 ? ((v / tR) * 100).toFixed(1) : 0}%</span>
            </div>
            <Bar pct={tR > 0 ? (v / tR) * 100 : 0} color={c} />
          </div>
        ))}
      </div>
      <div style={styles.card}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Indicadores</div>
        {[
          { l: "Poupança", v: fmtPct(txP), ok: txP >= .2 },
          { l: "CLT", v: fmtPct(dC), ok: dC <= .7 },
          { l: "Fixas", v: fmtPct(cFx), ok: cFx <= .5 }
        ].map((k) => (
          <div key={k.l} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid " + C.border }}>
            <span style={{ flex: 1, fontSize: 12, color: C.grayD }}>{k.l}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: k.ok ? C.green : C.amber }}>{k.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
