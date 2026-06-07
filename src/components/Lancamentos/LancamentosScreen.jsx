import { useState, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import LancamentoForm from './LancamentoForm';
import { LancamentosList } from './LancamentosList';
import sb from '../../services/supabase';
import { BLANK_LANCAMENTO } from '../../utils/constants';
import { today, fmt } from '../../utils/formatters';

/**
 * LancamentosScreen
 *
 * Recebe:
 *  - lancamentos    : todos os lançamentos do usuário (sem filtro)
 *  - lancFiltrados  : lançamentos já filtrados pelo período (via usePeriodo no Dashboard)
 *  - periodoProps   : { mesAno, labelAtual, periodos, irParaMes, mesAnterior, proximoMes }
 */
export function LancamentosScreen({
  lancamentos, lancFiltrados, periodoProps,
  categorias, catsRList, catsDList,
  token, uid, cartoes, setCartoes, toast, onLancamentosUpdate
}) {
  const [form, setForm] = useState({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today() });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showParcela, setShowParcela] = useState(false);

  // Totais do período filtrado
  const totalEntradas = lancFiltrados.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const totalSaidas   = lancFiltrados.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const saldoPeriodo  = totalEntradas - totalSaidas;

  function startEdit(l) {
    if (!l) return;
    setEditId(l.id);
    setForm({
      tipo: l.tipo || "receita",
      cat: l.cat || catsRList[0],
      descricao: l.descricao || "",
      valor: String(l.valor || ""),
      data_compra: l.data_compra || today(),
      data_vencimento: l.data_vencimento || today(),
      parcelas: l.parcelas ? String(l.parcelas) : "",
      parcela_atual: l.parcela_atual ? String(l.parcela_atual) : "",
      cartao: l.cartao || ""
    });
    if (l.parcelas) setShowParcela(true);
  }

  function cancelarEdicao() {
    setEditId(null);
    setForm({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today() });
    setShowParcela(false);
  }

  async function salvar() {
    if (!form.descricao || !form.valor || !form.data_compra || !form.data_vencimento) {
      toast("Preencha descrição, valor e datas"); return;
    }
    setSaving(true);
    const obj = {
      tipo: form.tipo, cat: form.cat, descricao: form.descricao,
      valor: parseFloat(form.valor),
      data_compra: form.data_compra,
      data_vencimento: form.data_vencimento,
      parcelas: form.parcelas ? parseInt(form.parcelas) : null,
      parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null,
      cartao: form.cartao || null
    };
    try {
      if (editId) {
        await sb("/lancamentos?id=eq." + editId, { method: "PATCH", token, body: obj });
        toast("Atualizado!");
      } else {
        await sb("/lancamentos", { method: "POST", token, body: { ...obj, user_id: uid } });
        toast("Salvo!");
      }
      await onLancamentosUpdate();
    } catch (e) { toast("Erro: " + e.message); }
    setForm({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today() });
    setEditId(null); setShowParcela(false); setSaving(false);
  }

  async function duplicar(l) {
    if (!l) return;
    try {
      await sb("/lancamentos", { method: "POST", token, body: {
        tipo: l.tipo, cat: l.cat, descricao: (l.descricao || "") + " (cópia)",
        valor: l.valor, data_compra: l.data_compra, data_vencimento: l.data_vencimento,
        parcelas: l.parcelas, parcela_atual: l.parcela_atual ? l.parcela_atual + 1 : null,
        cartao: l.cartao, user_id: uid
      }});
      await onLancamentosUpdate();
      toast("Duplicado!");
    } catch (e) { toast("Erro: " + e.message); }
  }

  async function deletar(id) {
    if (!id) return;
    try {
      await sb("/lancamentos?id=eq." + id, { method: "DELETE", token });
      await onLancamentosUpdate();
      toast("Removido.");
    } catch (e) { toast("Erro: " + e.message); }
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {/* Resumo rápido do período */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "Entradas", value: totalEntradas, color: C.green },
          { label: "Saídas",   value: totalSaidas,   color: C.red },
          { label: "Saldo",    value: saldoPeriodo,  color: saldoPeriodo >= 0 ? C.navy : C.red },
        ].map(k => (
          <div key={k.label} style={{ ...styles.card, flex: 1, minWidth: 120, padding: "10px 14px", borderLeft: "3px solid " + k.color }}>
            <div style={{ fontSize: 10, color: C.grayD, fontWeight: 600, textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, marginTop: 2 }}>{fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      <LancamentoForm
        form={form} setForm={setForm} editId={editId} saving={saving}
        showParcela={showParcela} setShowParcela={setShowParcela}
        catsRList={catsRList} catsDList={catsDList}
        cartoes={cartoes} setCartoes={setCartoes}
        salvar={salvar} cancelarEdicao={cancelarEdicao}
        toast={toast} token={token} uid={uid}
      />

      {/* Lista filtrada pelo período selecionado globalmente */}
      <LancamentosList
        lancamentos={lancFiltrados}
        lancamentosTotal={lancamentos}
        sP={saldoPeriodo}
        onEditar={startEdit}
        onDuplicar={duplicar}
        onDeletar={deletar}
      />
    </div>
  );
}

