import { C, styles } from '../../styles/theme';
import { ABAS } from '../../utils/constants';

export function Header({ session, aba, setAba, onLogout }) {
  return (
    <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "0 1rem", position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 52, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 14 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>FinancePro</span>
        </div>
        <div style={{ display: "flex", gap: 1, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
          {ABAS.map((a) => (
            <button 
              key={a.id} 
              onClick={() => setAba(a.id)} 
              style={{ 
                fontSize: 11, 
                padding: "5px 10px", 
                borderRadius: 7, 
                border: "none", 
                cursor: "pointer", 
                fontWeight: aba === a.id ? 600 : 400, 
                background: aba === a.id ? C.navy + "12" : "transparent", 
                color: aba === a.id ? C.navy : C.grayD, 
                display: "flex", 
                alignItems: "center", 
                gap: 4 
              }}
            >
              <i className={"ti " + a.icon} style={{ fontSize: 12 }} />
              {a.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.grayD }}>{session?.user?.email}</span>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: C.grayD }}>Sair</button>
      </div>
    </div>
  );
}
