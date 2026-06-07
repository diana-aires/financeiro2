import { C } from '../../styles/theme';

export function Landing({ onEnter }) {
  return (
    <div style={{ color: "#1E293B" }}>
      <nav style={{ background: "rgba(255,255,255,.92)", borderBottom: "1px solid " + C.border, padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 17 }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 16, color: C.navy }}>FinancePro</span>
          </div>
          <button onClick={onEnter} className="btn-green" style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Entrar</button>
        </div>
      </nav>
      <section style={{ background: "linear-gradient(135deg," + C.navy + ",#1e40af,#1d4ed8)", padding: "5rem 1.5rem 4rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#fff", lineHeight: 1.15, margin: "0 auto 1.25rem", maxWidth: 600 }}>Controle total da sua vida financeira</h1>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,.75)", lineHeight: 1.7, margin: "0 auto 2rem", maxWidth: 500 }}>Parcelas, financiamento, múltiplas rendas e IA consultora. Grátis.</p>
        <button onClick={onEnter} className="btn-green" style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Criar minha conta</button>
      </section>
    </div>
  );
}
