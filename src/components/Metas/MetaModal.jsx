import { C, styles } from '../../styles/theme';

export function MetaModal({ isOpen, onClose, editando, form, setForm, onSave }) {
  if (!isOpen) return null;

  const cores = [
    { nome: "navy", cor: C.navy },
    { nome: "green", cor: C.green },
    { nome: "purple", cor: C.purple },
    { nome: "amber", cor: C.amber },
    { nome: "teal", cor: C.teal },
    { nome: "orange", cor: C.orange },
    { nome: "red", cor: C.red }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: "1.5rem", maxWidth: 450 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy, margin: 0 }}>
            {editando ? "Editar Meta" : "Nova Meta"}
          </h3>
          <button onClick={onClose} style={styles.buttonIcon}>
            <i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} />
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Nome da Meta *</label>
          <input type="text" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} 
            placeholder="Ex: Viagem dos sonhos, Casa própria..." style={styles.input} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Valor da Meta (R$) *</label>
          <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} 
            placeholder="0,00" style={styles.input} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Valor Atual (R$)</label>
          <input type="number" min="0" step="0.01" value={form.atual} onChange={(e) => setForm(f => ({ ...f, atual: parseFloat(e.target.value) || 0 }))} 
            placeholder="0,00" style={styles.input} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Prazo</label>
          <input type="text" value={form.prazo} onChange={(e) => setForm(f => ({ ...f, prazo: e.target.value }))} 
            placeholder="Ex: Dez/2025, 31/12/2025..." style={styles.input} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={styles.label}>Cor da Meta</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cores.map((corOption) => (
              <button
                key={corOption.nome}
                onClick={() => setForm(f => ({ ...f, cor: corOption.nome }))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: corOption.cor,
                  border: form.cor === corOption.nome ? "3px solid #1E293B" : "1px solid " + C.border,
                  cursor: "pointer",
                  transform: form.cor === corOption.nome ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s"
                }}
                title={corOption.nome}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...styles.buttonPrimary, background: C.grayD }}>Cancelar</button>
          <button onClick={onSave} disabled={!form.nome.trim() || form.valor <= 0} style={styles.buttonSuccess}>
            <i className={"ti " + (editando ? "ti-check" : "ti-device-floppy")} />
            {editando ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
