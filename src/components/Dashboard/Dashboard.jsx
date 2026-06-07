import { useState, useEffect, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import { Header } from '../Common/Header';
import { Loading } from '../Common/Loading';
import { Toast } from '../Common/Toast';
import { sb } from '../../services/supabase';
import { fmt, today } from '../../utils/formatters';
import { CATS_R, CATS_D, TIPO_R, TIPO_D, METAS_DEF, CARTOES, BLANK_LANCAMENTO, ABAS } from '../../utils/constants';
import { LancamentosScreen } from '../Lancamentos/LancamentosScreen';
import { CartaoScreen } from '../Cartao/CartaoScreen';
import { MetasScreen } from '../Metas/MetasScreen';
import { GerenciarCategorias } from '../Categorias/GerenciarCategorias';
import { IAScreen } from '../IA/IAScreen';
import { DashboardCards } from './DashboardCards';
import { DashboardIndicadores } from './DashboardIndicadores';
import { DashboardMetas } from './DashboardMetas';

export function Dashboard({ session, onLogout }) {
  const [aba, setAba] = useState("dashboard");
  const [lanc, setLanc] = useState([]);
  const [metas, setMetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [cartoes, setCartoes] = useState(CARTOES);
  
  const token = session?.access_token;
  const uid = session?.user?.id;

  function toast(m) { 
    setToastMsg(m); 
    setTimeout(() => setToastMsg(""), 3000); 
  }

  // Carregar dados
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    
    Promise.all([
      sb("/categorias?order=ordem.asc", { token }),
      sb("/lancamentos?order=data_vencimento.desc", { token }),
      sb("/metas?order=id.asc", { token }),
    ]).then(([cats, lancs, metasData]) => {
      if (Array.isArray(cats)) setCategorias(cats);
      if (Array.isArray(lancs)) setLanc(lancs);
      if (Array.isArray(metasData)) setMetas(metasData);
      
      if (!metasData || metasData.length === 0) {
        METAS_DEF.forEach((m) => {
          sb("/metas", { method: "POST", token, body: { ...m, user_id: uid } });
        });
      }
    }).catch((e) => {
      console.error('❌ Erro:', e);
      toast("Erro: " + e.message);
    }).finally(() => setLoading(false));
  }, [token, uid]);

  const safeLanc = useMemo(() => Array.isArray(lanc) ? lanc : [], [lanc]);
  const safeMetas = useMemo(() => Array.isArray(metas) ? metas : [], [metas]);

  // Configurações de categorias
  const catsRFromDB = categorias.filter(c => c.tipo === "receita" && c.ativo).map(c => c.nome);
  const catsDFromDB = categorias.filter(c => c.tipo === "despesa" && c.ativo).map(c => c.nome);
  const catsRList = catsRFromDB.length > 0 ? catsRFromDB : CATS_R;
  const catsDList = catsDFromDB.length > 0 ? catsDFromDB : CATS_D;

  // Cálculos do dashboard
  const rec = safeLanc.filter((l) => l?.tipo === "receita");
  const desp = safeLanc.filter((l) => l?.tipo === "despesa");
  const tR = rec.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const tD = desp.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const saldo = tR - tD;
  const inv = desp.filter((l) => l?.cat === "Investimento").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const fin = desp.filter((l) => l?.cat === "Financiamento").reduce((s, l) => s + Number(l?.valor || 0), 0);

  const recarregarLancamentos = async () => {
    const updated = await sb("/lancamentos?order=data_vencimento.desc", { token });
    if (Array.isArray(updated)) setLanc(updated);
  };

  if (loading) return <Loading />;

  return (
    <div style={{ background: C.slate, minHeight: "100vh", color: "#1E293B" }}>
      <Toast message={toastMsg} />
      <Header session={session} aba={aba} setAba={setAba} onLogout={onLogout} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
        
        {aba === "dashboard" && (
          <>
            <DashboardCards tR={tR} tD={tD} saldo={saldo} inv={inv} fin={fin} />
            <DashboardIndicadores tR={tR} rec={rec} desp={desp} />
            <DashboardMetas metas={safeMetas} setAba={setAba} />
          </>
        )}

    {aba === "lancamentos" && (
  <LancamentosScreen 
    lancamentos={safeLanc}
    categorias={categorias}
    catsRList={catsRList}
    catsDList={catsDList}
    token={token}      // <-- JÁ DEVE TER
    uid={uid}          // <-- JÁ DEVE TER
    cartoes={cartoes}
    setCartoes={setCartoes}
    toast={toast}
    onLancamentosUpdate={recarregarLancamentos}
  />
)}

        {aba === "cartao" && (
          <CartaoScreen 
            lancamentos={safeLanc}
            token={token}
            session={session}
            cartoes={cartoes}
            setCartoes={setCartoes}
            toast={toast}
            onLancamentosUpdate={recarregarLancamentos}
          />
        )}

        {aba === "metas" && (
          <MetasScreen 
            metas={safeMetas}
            token={token}
            uid={uid}
            toast={toast}
            onMetasUpdate={() => {
              sb("/metas?order=id.asc", { token })
                .then(data => Array.isArray(data) && setMetas(data));
            }}
          />
        )}

        {aba === "categorias" && (
          <GerenciarCategorias 
            token={token} 
            onCategoriasChange={() => {
              sb("/categorias?order=ordem.asc", { token })
                .then(data => Array.isArray(data) && setCategorias(data));
            }}
          />
        )}

        {aba === "ia" && (
          <IAScreen 
            lancamentos={safeLanc}
            tR={tR}
            tD={tD}
            saldo={saldo}
          />
        )}
      </div>
    </div>
  );
}
