import { useState, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import LancamentoForm from './LancamentoForm';
import { LancamentosList } from './LancamentosList';
import sb from '../../services/supabase';
import { BLANK_LANCAMENTO } from '../../utils/constants';
import { today } from '../../utils/formatters';

// CORRIGIDO: arquivo tinha `import { LancamentosScreen } from '../Lancamentos/LancamentosScreen'`
// → self-import circular — REMOVIDO
// CORRIGIDO: export era `Dashboard` neste arquivo → renomeado para `LancamentosScreen`

export function LancamentosScreen({
  lancamentos, categorias, catsRList, catsDList,
  token, uid, cartoes, setCartoes, toast, onLancamentosUpdate
}) {
  const [form, setForm] = useState({
    ...BLANK_LANCAMENTO,
    data_compra: today(),
    data_vencimento: today()
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showParcela, setShowParcela] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");

  const meses = useMemo(() => {
    const datas = lancamentos
      .map(l => (l.data_vencimento || l.data_compra || "").slice(0, 7))
      .filter(Boolean);
    return [...new Set(datas)].sort().reverse();
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    if (!filtroMes) return lancamentos;
    return lancamentos.filter(l =>
      (l.data_vencimento || l.data_compra || "").startsWith(filtroMes)
    );
  }, [lancamentos, filtroMes]);

  const sP = lancamentosFiltrados.reduce((s, l) =>
    l.tipo === "receita" ? s + Number(l.valor) : s - Number(l.valor), 0
  );

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
      toast("Preencha descrição, valor e datas");
      return;
    }
    setSaving(true);
    const obj = {
      tipo: form.tipo,
      cat: form.cat,
      descricao: form.descricao,
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
    } catch (e) {
      toast("Erro: " + e.message);
    }
    setForm({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today() });
    setEditId(null);
    setShowParcela(false);
    setSaving(false);
  }

  async function duplicar(l) {
    if (!l) return;
    try {
      const obj = {
        tipo: l.tipo, cat: l.cat,
        descricao: (l.descricao || "") + " (cópia)",
        valor: l.valor,
        data_compra: l.data_compra,
        data_vencimento: l.data_vencimento,
        parcelas: l.parcelas,
        parcela_atual: l.parcela_atual ? l.parcela_atual + 1 : null,
        cartao: l.cartao,
        user_id: uid
      };
      await sb("/lancamentos", { method: "POST", token, body: obj });
      await onLancamentosUpdate();
      toast("Duplicado!");
    } catch (e) {
      toast("Erro: " + e.message);
    }
  }

  async function deletar(id) {
    if (!id) return;
    try {
      await sb("/lancamentos?id=eq." + id, { method: "DELETE", token });
      await onLancamentosUpdate();
      toast("Removido.");
    } catch (e) {
      toast("Erro: " + e.message);
    }
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <LancamentoForm
        form={form}
        setForm={setForm}
        editId={editId}
        saving={saving}
        showParcela={showParcela}
        setShowParcela={setShowParcela}
        catsRList={catsRList}
        catsDList={catsDList}
        cartoes={cartoes}
        setCartoes={setCartoes}
        salvar={salvar}
        cancelarEdicao={cancelarEdicao}
        toast={toast}
        token={token}
        uid={uid}
      />
      <LancamentosList
        lancamentos={lancamentosFiltrados}
        lancamentosTotal={lancamentos}
        filtroMes={filtroMes}
        setFiltroMes={setFiltroMes}
        meses={meses}
        sP={sP}
        onEditar={startEdit}
        onDuplicar={duplicar}
        onDeletar={deletar}
      />
    </div>
  );
}

