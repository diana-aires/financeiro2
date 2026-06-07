import { useState } from 'react';
import { sb } from '../../services/supabase';
import { supabaseConfig } from '../../config/supabase';
import { C, styles } from '../../styles/theme';
import { CARTOES } from '../../utils/constants';

export function LancamentoForm({ 
  form, setForm, editId, saving, showParcela, setShowParcela,
  catsRList, catsDList, cartoes, setCartoes, salvar, cancelarEdicao, toast, token, uid 
}) {
  const [showModal, setShowModal] = useState(false);
  const [novoCartaoNome, setNovoCartaoNome] = useState('');
  const [savingCartao, setSavingCartao] = useState(false);

  const handleAdicionarCartao = async () => {
    if (!novoCartaoNome || !novoCartaoNome.trim()) {
      toast(`⚠️ Digite um nome válido!`);
      return;
    }

    const cartaoNome = novoCartaoNome.trim();
    
    // Verificar duplicata localmente
    if (cartoes.includes(cartaoNome)) {
      toast(`⚠️ Cartão "${cartaoNome}" já existe!`);
      return;
    }

    setSavingCartao(true);

    try {
      // Salvar no banco de dados usando a função sb()
      const obj = {
        nome: cartaoNome,
        user_id: uid,
        ativo: true,
        created_at: new Date().toISOString()
      };

      const result = await sb("/cartoes", { 
        method: "POST", 
        token, 
        body: obj 
      });

      if (result && (result.id || result.success !== false)) {
        // Atualizar estado local com o novo cartão
        setCartoes([...cartoes, cartaoNome]);
        setForm((f) => ({ ...f, cartao: cartaoNome }));
        toast(`✅ Cartão "${cartaoNome}" adicionado com sucesso!`);
        
        // Fechar modal e limpar campo
        setShowModal(false);
        setNovoCartaoNome('');
      } else {
        toast(`❌ Erro ao salvar cartão: Falha na resposta do servidor`);
      }
      
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast(`❌ Erro inesperado ao salvar cartão: ${error.message}`);
    } finally {
      setSavingCartao(false);
    }
  };

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
                <button onClick={() => setShowModal(true)} style={{ ...styles.buttonPrimary, padding: "6px 10px", borderRadius: 8 }} title="Adicionar novo cartão">
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

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }} onClick={() => !savingCartao && setShowModal(false)}>
          <div style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 24,
            width: "90%",
            maxWidth: 400,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.navy }}>Novo Cartão</h3>
              <button onClick={() => !savingCartao && setShowModal(false)} style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: C.gray,
                opacity: savingCartao ? 0.5 : 1
              }} disabled={savingCartao}>✕</button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Nome do Cartão</label>
              <input 
                type="text" 
                value={novoCartaoNome}
                onChange={(e) => setNovoCartaoNome(e.target.value)}
                placeholder="Ex: Nubank, Itaú, etc."
                style={styles.input}
                onKeyDown={(e) => e.key === "Enter" && handleAdicionarCartao()}
                autoFocus
                disabled={savingCartao}
              />
            </div>
            
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowModal(false)}
                disabled={savingCartao}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid " + C.border,
                  backgroundColor: "white",
                  cursor: savingCartao ? "not-allowed" : "pointer",
                  color: C.gray,
                  opacity: savingCartao ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdicionarCartao}
                disabled={savingCartao || !novoCartaoNome.trim()}
                style={{
                  ...styles.buttonPrimary,
                  padding: "8px 16px",
                  borderRadius: 6,
                  opacity: (savingCartao || !novoCartaoNome.trim()) ? 0.7 : 1,
                  cursor: (savingCartao || !novoCartaoNome.trim()) ? "not-allowed" : "pointer"
                }}
              >
                {savingCartao ? (
                  <>
                    <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />
                    Salvando...
                  </>
                ) : (
                  "Adicionar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adicione este style para a animação de loading */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
