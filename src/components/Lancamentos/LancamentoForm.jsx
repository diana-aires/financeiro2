import { C, styles } from '../../styles/theme';
import { CARTOES } from '../../utils/constants';

export function LancamentoForm({ 
  form, setForm, editId, saving, showParcela, setShowParcela,
  catsRList, catsDList, cartoes, setCartoes, salvar, cancelarEdicao, toast 
}) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>{editId ? "Editando" : "Novo lançamento"}</span>
        {editId && <button onClick={cancelarEdicao} style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer" }}>Cancelar</button>}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={styles.label}>Tipo</label>
          <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, cat: e.target.value === "receita" ? catsRList[0] : catsDList[0] }))} style={styles.input}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Categoria</label>
          <select value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))} style={styles.input}>
            {(form.tipo === "receita" ? catsRList : catsDList).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.label}>Data da Compra</label>
          <input type="date" value={form.data_compra} onChange={(e) => setForm((f) => ({ ...f, data_compra: e.target.value }))} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Data Vencimento</label>
          <input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Valor</label>
          <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} style={styles.input} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={styles.label}>Descrição</label>
          <input type="text" placeholder="Ex: Consultoria" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} style={styles.input} onKeyDown={(e) => e.key === "Enter" && salvar()} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setShowParcela(!showParcela)} style={{ fontSize: 12, color: C.navy, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
          {showParcela ? "▾" : "▸"} Parcelamento
        </button>
        {showParcela && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginTop: 8, padding: 10, background: C.slate, borderRadius: 10, border: "1px solid " + C.border }}>
            <div>
              <label style={styles.label}>Parcelas</label>
              <input type="number" min="1" value={form.parcelas} onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value }))} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Atual</label>
              <input type="number" min="1" value={form.parcela_atual} onChange={(e) => setForm((f) => ({ ...f, parcela_atual: e.target.value }))} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Cartão</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select value={form.cartao} onChange={(e) => setForm((f) => ({ ...f, cartao: e.target.value }))} style={{ ...styles.input, flex: 1 }}>
                  <option value="">Selecione</option>
                  {cartoes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => {
                  let novoCartao = prompt("Digite o nome do novo cartão:", "");
                  if (novoCartao && novoCartao.trim()) {
                    novoCartao = novoCartao.trim();
                    if (!cartoes.includes(novoCartao)) {
                      setCartoes([...cartoes, novoCartao]);
                      setForm((f) => ({ ...f, cartao: novoCartao }));
                      toast(`✅ Cartão "${novoCartao}" adicionado!`);
                    } else {
                      toast(`⚠️ Cartão "${novoCartao}" já existe!`);
                    }
                  }
                }} style={{ ...styles.buttonPrimary, padding: "6px 10px", borderRadius: 8 }} title="Adicionar novo cartão">
                  <i className="ti ti-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={salvar} disabled={saving} style={{ ...styles.buttonPrimary, padding: "9px 20px", borderRadius: 10 }}>
        {saving ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className={"ti " + (editId ? "ti-check" : "ti-device-floppy")} />}
        {editId ? "Atualizar" : "Salvar"}
      </button>
    </div>
  );
}
