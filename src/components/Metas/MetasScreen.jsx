import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import sb from '../../services/supabase'; // CORRIGIDO: era `import { sb }` → default export
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { MetaModal } from './MetaModal';

export function MetasScreen({ metas, token, uid, toast, onMetasUpdate }) {
  const [metaModalAberto, setMetaModalAberto] = useState(false);
  const [metaEditando, setMetaEditando] = useState(null);
  const [metaForm, setMetaForm] = useState({ nome: "", valor: 0, atual: 0, prazo: "", cor: "navy" });

  const coresMap = { navy: C.navy, green: C.green, purple: C.purple, amber: C.amber, teal: C.teal, orange: C.orange, red: C.red };

  const salvarMeta = async () => {
    if (!metaForm.nome.trim() || metaForm.valor <= 0) {
      toast("Preencha o nome e o valor da meta");
      return;
    }
    const obj = {
      nome: metaForm.nome.trim(),
      valor: metaForm.valor,
      atual: metaForm.atual || 0,
      prazo: metaForm.prazo || null,
      cor: metaForm.cor || "navy",
      ativa: true,
      user_id: uid
    };
    try {
      if (metaEditando) {
        await sb("/metas?id=eq." + metaEditando.id, { method: "PATCH", token, body: obj });
        toast("Meta atualizada!");
      } else {
        await sb("/metas", { method: "POST", token, body: obj });
        toast("Meta criada!");
      }
      onMetasUpdate();
      setMetaModalAberto(false);
      setMetaEditando(null);
      setMetaForm({ nome: "", valor: 0, atual: 0, prazo: "", cor: "navy" });
    } catch (e) {
      toast("Erro: " + e.message);
    }
  };

  const deletarMeta = async (id) => {
    try {
      await sb("/metas?id=eq." + id, { method: "DELETE", token });
      onMetasUpdate();
      toast("Meta removida!");
    } catch (e) {
      toast("Erro: " + e.message);
    }
  };

  const updMeta = async (id, inc) => {
    const m = metas.find((x) => x.id === id);
    if (!m) return;
    const novo = Math.round(Math.min(m.valor, m.atual + inc) * 100) / 100;
    try {
      await sb("/metas?id=eq." + id, { method: "PATCH", token, body: { atual: novo } });
      onMetasUpdate();
      toast("Atualizado!");
    } catch (e) {
      toast("Erro: " + e.message);
    }
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Minhas Metas Financeiras</div>
            <div style={{ fontSize: 12, color: C.grayD }}>Acompanhe seu progresso rumo aos seus objetivos</div>
          </div>
          <button onClick={() => { setMetaEditando(null); setMetaForm({ nome: "", valor: 0, atual: 0, prazo: "", cor: "navy" }); setMetaModalAberto(true); }} style={{ ...styles.buttonSuccess, gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Nova Meta
          </button>
        </div>
      </div>

      {metas.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "3rem", color: C.grayD }}>
          <i className="ti ti-target" style={{ fontSize: 48, display: "block", marginBottom: 16, opacity: 0.5 }} />
          Nenhuma meta cadastrada.
          <div style={{ fontSize: 12, marginTop: 8, color: C.gray }}>Clique em "Nova Meta" para começar!</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {metas.map((m) => {
            const p = Math.min(100, (m.atual / m.valor) * 100);
            const restante = m.valor - m.atual;
            const corMeta = coresMap[m.cor] || C.navy;

            return (
              <div key={m.id} style={{ ...styles.card, borderTop: `4px solid ${corMeta}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                  <button onClick={() => { setMetaEditando(m); setMetaForm({ nome: m.nome, valor: m.valor, atual: m.atual, prazo: m.prazo || "", cor: m.cor || "navy" }); setMetaModalAberto(true); }} style={styles.buttonIcon} title="Editar meta">
                    <i className="ti ti-edit" style={{ fontSize: 14, color: C.navy }} />
                  </button>
                  <button onClick={() => { if (window.confirm(`Excluir "${m.nome}"?`)) deletarMeta(m.id); }} style={styles.buttonIcon} title="Excluir meta">
                    <i className="ti ti-trash" style={{ fontSize: 14, color: C.red }} />
                  </button>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: corMeta }}>{m.nome}</div>
                      {m.prazo && <div style={{ fontSize: 11, color: C.grayD, marginTop: 2 }}><i className="ti ti-calendar" style={{ fontSize: 11 }} /> Prazo: {m.prazo}</div>}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: corMeta }}>{Math.round(p)}%</div>
                  </div>

                  <Bar pct={p} color={corMeta} />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.grayD }}>Acumulado</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: corMeta }}>{fmt(m.atual)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: C.grayD }}>Meta</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.grayD }}>{fmt(m.valor)}</div>
                    </div>
                  </div>

                  {restante > 0 && (
                    <div style={{ background: C.slate, borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.grayD }}>Faltam:</span>
                      <span style={{ fontWeight: 700, color: corMeta }}>{fmt(restante)}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" min="0" step="0.01" id={"mi-" + m.id} placeholder="Valor do aporte" style={styles.input} />
                    <button onClick={() => { const el = document.getElementById("mi-" + m.id); const v = parseFloat(el.value); if (!isNaN(v) && v > 0) { updMeta(m.id, v); el.value = ""; } else toast("Digite um valor válido"); }} style={{ ...styles.buttonPrimary, gap: 4 }}>
                      <i className="ti ti-plus" style={{ fontSize: 12 }} />
                      Aportar
                    </button>
                  </div>

                  {p >= 100 && (
                    <div style={{ marginTop: 12, padding: "6px 12px", background: C.green + "15", borderRadius: 8, textAlign: "center", fontSize: 11, color: C.green, fontWeight: 500 }}>
                      <i className="ti ti-check" style={{ fontSize: 14 }} /> Meta alcançada! 🎉
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MetaModal
        isOpen={metaModalAberto}
        onClose={() => setMetaModalAberto(false)}
        editando={metaEditando}
        form={metaForm}
        setForm={setMetaForm}
        onSave={salvarMeta}
      />
    </div>
  );
}

