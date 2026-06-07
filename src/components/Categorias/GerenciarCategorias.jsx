import { useState, useEffect } from 'react';
import { C, styles } from '../../styles/theme';
import { sb } from '../../services/supabase';
import { CATEGORIA_BLANK, ICONES } from '../../utils/constants';

export function GerenciarCategorias({ token, onCategoriasChange }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...CATEGORIA_BLANK });
  const [toastMsg, setToastMsg] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroClassificacao, setFiltroClassificacao] = useState("todos");

  function toast(m) { 
    setToastMsg(m); 
    setTimeout(() => setToastMsg(""), 3000); 
  }

  useEffect(() => {
    if (!token) return;
    carregarCategorias();
  }, [token]);

  async function carregarCategorias() {
    setLoading(true);
    const data = await sb("/categorias?order=ordem.asc", { token });
    setCategorias(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function salvarCategoria() {
    if (!form.nome.trim()) {
      toast("Preencha o nome da categoria");
      return;
    }

    const obj = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      classificacao: form.classificacao,
      icone: form.icone,
      ativo: true,
      ordem: categorias.filter(c => c.tipo === form.tipo).length + 1
    };

    try {
      if (editando) {
        await sb("/categorias?id=eq." + editando.id, { method: "PATCH", token, body: obj });
        toast("Categoria atualizada!");
      } else {
        await sb("/categorias", { method: "POST", token, body: obj });
        toast("Categoria adicionada!");
      }
      await carregarCategorias();
      if (onCategoriasChange) onCategoriasChange();
      fecharModal();
    } catch (e) {
      console.error('Erro:', e);
      toast("Erro: " + e.message);
    }
  }

  async function desativarCategoria(cat) {
    if (window.confirm(`Desativar a categoria "${cat.nome}"?`)) {
      try {
        await sb("/categorias?id=eq." + cat.id, { method: "PATCH", token, body: { ativo: false } });
        await carregarCategorias();
        if (onCategoriasChange) onCategoriasChange();
        toast("Categoria desativada!");
      } catch (e) {
        toast("Erro: " + e.message);
      }
    }
  }

  async function reativarCategoria(cat) {
    try {
      await sb("/categorias?id=eq." + cat.id, { method: "PATCH", token, body: { ativo: true } });
      await carregarCategorias();
      if (onCategoriasChange) onCategoriasChange();
      toast("Categoria reativada!");
    } catch (e) {
      toast("Erro: " + e.message);
    }
  }

  function abrirModal(cat = null) {
    if (cat) {
      setEditando(cat);
      setForm({
        tipo: cat.tipo,
        nome: cat.nome,
        classificacao: cat.classificacao,
        icone: cat.icone || "ti-tag",
        ativo: cat.ativo
      });
    } else {
      setEditando(null);
      setForm({ ...CATEGORIA_BLANK });
    }
    setShowModal(true);
  }

  function fecharModal() {
    setShowModal(false);
    setEditando(null);
    setForm({ ...CATEGORIA_BLANK });
  }

  const categoriasFiltradas = categorias.filter(cat => {
    if (filtroTipo !== "todos" && cat.tipo !== filtroTipo) return false;
    if (filtroClassificacao !== "todos" && cat.classificacao !== filtroClassificacao) return false;
    return true;
  });

  const categoriasReceita = categoriasFiltradas.filter(c => c.tipo === "receita" && c.ativo);
  const categoriasDespesa = categoriasFiltradas.filter(c => c.tipo === "despesa" && c.ativo);
  const categoriasInativas = categorias.filter(c => !c.ativo);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.navy, color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, zIndex: 999 }}>
          {toastMsg}
        </div>
      )}
      
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Gerenciar Categorias</div>
            <div style={{ fontSize: 11, color: C.grayD }}>Adicione, edite ou desative categorias de receitas e despesas</div>
          </div>
          <button onClick={() => abrirModal()} style={{ ...styles.buttonSuccess, gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Nova Categoria
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...styles.input, width: "auto" }}>
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select value={filtroClassificacao} onChange={(e) => setFiltroClassificacao(e.target.value)} style={{ ...styles.input, width: "auto" }}>
            <option value="todos">Todas classificações</option>
            <option value="fixa">Fixas</option>
            <option value="variavel">Variáveis</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: C.grayD }}>
            <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", fontSize: 24 }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            <div style={{ background: C.slate, borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.green, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-trending-up" />
                Receitas ({categoriasReceita.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {categoriasReceita.map(cat => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: C.white, borderRadius: 8, border: "1px solid " + C.border }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={cat.icone || "ti-tag"} style={{ fontSize: 14, color: C.green }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.nome}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: cat.classificacao === "fixa" ? C.navy + "20" : C.purple + "20", color: cat.classificacao === "fixa" ? C.navy : C.purple }}>
                        {cat.classificacao}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirModal(cat)} style={styles.buttonIcon}><i className="ti ti-edit" style={{ fontSize: 12, color: C.navy }} /></button>
                      <button onClick={() => desativarCategoria(cat)} style={styles.buttonIcon}><i className="ti ti-trash" style={{ fontSize: 12, color: C.red }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.slate, borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.red, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-trending-down" />
                Despesas ({categoriasDespesa.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {categoriasDespesa.map(cat => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: C.white, borderRadius: 8, border: "1px solid " + C.border }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={cat.icone || "ti-tag"} style={{ fontSize: 14, color: C.red }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.nome}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: cat.classificacao === "fixa" ? C.navy + "20" : C.purple + "20", color: cat.classificacao === "fixa" ? C.navy : C.purple }}>
                        {cat.classificacao}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirModal(cat)} style={styles.buttonIcon}><i className="ti ti-edit" style={{ fontSize: 12, color: C.navy }} /></button>
                      <button onClick={() => desativarCategoria(cat)} style={styles.buttonIcon}><i className="ti ti-trash" style={{ fontSize: 12, color: C.red }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {categoriasInativas.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: C.slate, borderRadius: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: C.grayD, marginBottom: 8 }}>Categorias Inativas</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categoriasInativas.map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: C.white, borderRadius: 6, border: "1px solid " + C.border }}>
                  <span style={{ fontSize: 11, color: C.grayD }}>{cat.nome}</span>
                  <button onClick={() => reativarCategoria(cat)} style={{ ...styles.buttonIcon, color: C.green }}><i className="ti ti-reload" style={{ fontSize: 11 }} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy, margin: 0 }}>{editando ? "Editar Categoria" : "Nova Categoria"}</h3>
              <button onClick={fecharModal} style={styles.buttonIcon}><i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} /></button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} style={styles.input}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Nome da Categoria</label>
              <input type="text" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Academia, Streaming, ..." style={styles.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Classificação</label>
              <select value={form.classificacao} onChange={(e) => setForm(f => ({ ...f, classificacao: e.target.value }))} style={styles.input}>
                <option value="fixa">Fixa (mensal previsível)</option>
                <option value="variavel">Variável (valor pode mudar)</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Ícone</label>
              <select value={form.icone} onChange={(e) => setForm(f => ({ ...f, icone: e.target.value }))} style={styles.input}>
                {ICONES.map(icone => (
                  <option key={icone} value={icone}>
                    {icone.replace("ti-", "")}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={fecharModal} style={{ ...styles.buttonPrimary, background: C.grayD }}>Cancelar</button>
              <button onClick={salvarCategoria} style={styles.buttonSuccess}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
