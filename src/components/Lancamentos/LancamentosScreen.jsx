import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { sb } from '../../services/supabase';
import { fmt, today, formatDate } from '../../utils/formatters';
import { BLANK_LANCAMENTO } from '../../utils/constants';
import { LancamentoForm } from './LancamentoForm';
import { LancamentosList } from './LancamentosList';

export function LancamentosScreen({ lancamentos, categorias, catsRList, catsDList, token, uid, cartoes, setCartoes, toast, onLancamentosUpdate }) {
  const [form, setForm] = useState({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today() });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [showParcela, setShowParcela] = useState(false);

  const meses = [...new Set(lancamentos.map((l) => l?.data_vencimento?.slice(0, 7)).filter(Boolean))].sort().reverse();
  
  let lancamentosFiltrados = lancamentos;
  if (filtroMes) {
    lancamentosFiltrados = lancamentos.filter((l) => l?.data_vencimento?.startsWith(filtroMes));
  }

  const calcularDataVencimento = (dataCompra, parcelaAtual) => {
    if (!dataCompra || !parcelaAtual) return dataCompra;
    const data = new Date(dataCompra);
    data.setMonth(data.getMonth() + (parcelaAtual - 1));
    return data.toISOString().split("T")[0];
  };

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.data_compra) {
      toast("Preencha descrição, valor e data da compra");
      return;
    }
    setSaving(true);
    
    let dataVencimento = form.data_vencimento;
    if (form.parcelas && form.parcela_atual && !form.data_vencimento) {
      dataVencimento = calcularDataVencimento(form.data_compra, parseInt(form.parcela_atual));
    }
    
    const obj = { 
      tipo: form.tipo, 
      cat: form.cat, 
      descricao: form.descricao, 
      valor: parseFloat(form.valor), 
      data_compra: form.data_compra,
      data_vencimento: dataVencimento || form.data_compra,
      parcelas: form.parcelas ? parseInt(form.parcelas) : null, 
      parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null, 
      cartao: form.cartao || null,
      user_id: uid
    };
    
    try {
      if (editId) {
        const { user_id, ...updateObj } = obj;
        await sb("/lancamentos?id=eq." + editId, { method: "PATCH", token, body: updateObj });
        toast("Atualizado!");
        setEditId(null);
      } else {
        await sb("/lancamentos", { method: "POST", token, body: obj });
        toast("Salvo!");
      }
      
      setForm({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today(), cat: form.tipo === "receita" ? catsRList[0] : catsDList[0] });
      setShowParcela(false);
      onLancamentosUpdate();
    } catch (e) { 
      console.error('Erro ao salvar:', e);
      toast("Erro: " + e.message); 
    }
    setSaving(false);
  };

  const deletar = async (id) => {
    try { 
      await sb("/lancamentos?id=eq." + id, { method: "DELETE", token }); 
      onLancamentosUpdate();
      toast("Removido."); 
    } catch (e) { 
      toast("Erro: " + e.message); 
    }
  };

  const duplicar = async (l) => {
    try {
      const obj = { 
        tipo: l.tipo, 
        cat: l.cat, 
        descricao: (l.descricao || "") + " (cópia)", 
        valor: l.valor, 
        data_compra: l.data_compra || today(),
        data_vencimento: l.data_vencimento || today(),
        parcelas: l.parcelas, 
        parcela_atual: l.parcela_atual ? l.parcela_atual + 1 : null, 
        cartao: l.cartao, 
        user_id: uid 
      };
      await sb("/lancamentos", { method: "POST", token, body: obj });
      onLancamentosUpdate();
      toast("Duplicado!");
    } catch (e) { 
      toast("Erro: " + e.message); 
    }
  };

  const editar = (l) => {
    setEditId(l.id);
    setForm({ 
      tipo: l.tipo, 
      cat: l.cat, 
      descricao: l.descricao, 
      valor: String(l.valor), 
      data_compra: l.data_compra || today(),
      data_vencimento: l.data_vencimento || today(),
      parcelas: l.parcelas ? String(l.parcelas) : "", 
      parcela_atual: l.parcela_atual ? String(l.parcela_atual) : "", 
      cartao: l.cartao || "" 
    });
    if (l.parcelas) setShowParcela(true);
  };

  const cancelarEdicao = () => {
    setEditId(null);
    setForm({ ...BLANK_LANCAMENTO, data_compra: today(), data_vencimento: today(), cat: form.tipo === "receita" ? catsRList[0] : catsDList[0] });
    setShowParcela(false);
  };

  const sP = lancamentosFiltrados.reduce((s, l) => (l?.tipo === "receita" ? s + Number(l?.valor || 0) : s - Number(l?.valor || 0)), 0);

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
      />
      
      <LancamentosList 
        lancamentos={lancamentosFiltrados}
        lancamentosTotal={lancamentos}
        filtroMes={filtroMes}
        setFiltroMes={setFiltroMes}
        meses={meses}
        sP={sP}
        onEditar={editar}
        onDuplicar={duplicar}
        onDeletar={deletar}
      />
    </div>
  );
}
