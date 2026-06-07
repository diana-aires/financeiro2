import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';

export function DashboardMetas({ metas, setAba }) {
  if (!metas || metas.length === 0) return null;
  
  const coresMap = { navy: C.navy, green: C.green, purple: C.purple, amber: C.amber, teal: C.teal, orange: C.orange, red: C.red };
  
  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Metas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {metas.slice(0, 3).map((m) => {
          const p = Math.min(100, (m.atual / m.valor) * 100);
          const corMeta = coresMap[m.cor] || C.navy;
          return (
            <div key={m.id} style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: corMeta }}>{m.nome}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: p >= 100 ? C.green : corMeta }}>{Math.round(p)}%</span>
              </div>
              <Bar pct={p} color={p >= 100 ? C.green : corMeta} />
              <div style={{ fontSize: 10, color: C.grayD, marginTop: 4 }}>{fmt(m.atual)} / {fmt(m.valor)}</div>
            </div>
          );
        })}
        {metas.length > 3 && (
          <div style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
            <button onClick={() => setAba("metas")} style={{ fontSize: 11, color: C.navy, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
              + {metas.length - 3} outras metas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
