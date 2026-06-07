import { C } from '../../styles/theme';

/**
 * Barra de seleção de mês/ano.
 * Props:
 *  - mesAno, labelAtual, periodos, irParaMes, mesAnterior, proximoMes
 *  - compact (bool) — versão reduzida para uso dentro de cards
 */
export function PeriodoSelector({ mesAno, labelAtual, periodos, irParaMes, mesAnterior, proximoMes, compact = false }) {
  const btnNav = {
    background: "none",
    border: "1px solid " + C.border,
    borderRadius: 8,
    width: compact ? 28 : 34,
    height: compact ? 28 : 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: C.navy,
    flexShrink: 0,
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#fff",
      border: "1px solid " + C.border,
      borderRadius: 12,
      padding: compact ? "6px 10px" : "8px 14px",
      boxShadow: "0 1px 4px rgba(30,58,138,.06)",
    }}>
      <button style={btnNav} onClick={mesAnterior} title="Mês anterior">
        <i className="ti ti-chevron-left" style={{ fontSize: compact ? 13 : 15 }} />
      </button>

      <select
        value={mesAno}
        onChange={e => irParaMes(e.target.value)}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontWeight: 700,
          fontSize: compact ? 13 : 15,
          color: C.navy,
          cursor: "pointer",
          minWidth: compact ? 90 : 110,
          textAlign: "center",
        }}
      >
        {/* Mês atual sempre disponível mesmo sem lançamentos */}
        {periodos.length === 0 && (
          <option value={mesAno}>{labelAtual}</option>
        )}
        {periodos.map(p => (
          <option key={p.valor} value={p.valor}>{p.label}</option>
        ))}
      </select>

      <button style={btnNav} onClick={proximoMes} title="Próximo mês">
        <i className="ti ti-chevron-right" style={{ fontSize: compact ? 13 : 15 }} />
      </button>
    </div>
  );
}
