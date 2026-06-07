import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';

export function IAScreen({ lancamentos, tR, tD, saldo }) {
  const [aiResp, setAiResp] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [aiQ, setAiQ] = useState("");

  async function askAI() {
    if (!aiQ.trim()) return;
    setAiLoad(true); 
    setAiResp("");
    const sys = `Consultor financeiro. Receita ${fmt(tR)}, despesas ${fmt(tD)}, saldo ${fmt(saldo)}. Responda em português, máx 3 parágrafos.`;
    try { 
      const r = await fetch("https://api.anthropic.com/v1/messages", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          model: "claude-3-sonnet-20241022", 
          max_tokens: 1000, 
          system: sys, 
          messages: [{ role: "user", content: aiQ }] 
        }) 
      }); 
      const d = await r.json(); 
      setAiResp(d.content?.[0]?.text || "Sem resposta."); 
    } catch (e) { 
      console.error('Erro na IA:', e);
      setAiResp("Erro: " + e.message); 
    }
    setAiLoad(false);
  }

  const sugestoes = ["Saúde financeira", "Acelerar reserva", "Investir mais?", "Dependência CLT", "Impacto parcelas", "Financiamento?"];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={styles.card}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Consultora IA</div>
        <div style={{ fontSize: 11, color: C.grayD }}>{lancamentos.length} lançamentos</div>
      </div>
      
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {sugestoes.map((s) => (
          <button key={s} onClick={() => setAiQ(s)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 18, border: "1px solid " + C.border, cursor: "pointer", background: C.white, color: C.navy, fontWeight: 500 }}>
            {s}
          </button>
        ))}
      </div>
      
      <div style={{ ...styles.card, display: "flex", gap: 8 }}>
        <input type="text" placeholder="Pergunte..." value={aiQ} onChange={(e) => setAiQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !aiLoad && askAI()} style={{ ...styles.input, flex: 1, borderRadius: 10, padding: "10px 14px" }} />
        <button onClick={askAI} disabled={aiLoad || !aiQ.trim()} style={{ ...styles.buttonPrimary, borderRadius: 10, padding: "10px 18px" }}>
          {aiLoad ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-send" />}
          {aiLoad ? "..." : "Enviar"}
        </button>
      </div>
      
      {aiResp && !aiLoad && (
        <div style={{ ...styles.card, borderLeft: "4px solid " + C.navy }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Análise</div>
          <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#334155" }}>{aiResp}</div>
        </div>
      )}
    </div>
  );
}
