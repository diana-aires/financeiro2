import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';

export function DashboardCards({ tR, tD, saldo, inv, fin }) {
  const cards = [
    { l: "Receita", v: fmt(tR), c: C.green },
    { l: "Despesas", v: fmt(tD), c: C.red },
    { l: "Saldo", v: fmt(saldo), c: saldo >= 0 ? C.navy : C.red },
    { l: "Investido", v: fmt(inv), c: C.purple },
    { l: "Financiamento", v: fmt(fin), c: C.amber }
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
      {cards.map((k) => (
        <div key={k.l} style={{ ...styles.card, borderTop: "3px solid " + k.c, padding: "1rem" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.grayD, textTransform: "uppercase", marginBottom: 6 }}>{k.l}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
        </div>
      ))}
    </div>
  );
}
