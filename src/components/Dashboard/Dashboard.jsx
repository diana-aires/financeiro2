import { useState, useMemo, useEffect } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { ImportFaturaModal } from '../Cartao/ImportFaturaModal'; // CORRIGIDO: era './ImportFaturaModal' (não existe) → '../Cartao/ImportFaturaModal'
import sb from '../../services/supabase'; // CORRIGIDO: era `import { sb }` → default export
import { Header } from '../Common/Header';
import { Loading } from '../Common/Loading';
import { Toast } from '../Common/Toast';
import { LancamentosScreen } from '../Lancamentos/LancamentosScreen';
import { CartaoScreen } from '../Cartao/CartaoScreen';
import { MetasScreen } from '../Metas/MetasScreen';
import { GerenciarCategorias } from '../Categorias/GerenciarCategorias';
import { IAScreen } from '../IA/IAScreen';
import { CATS_R, CATS_D, METAS_DEF, CARTOES } from '../../utils/constants';

// CORRIGIDO: função era `CartaoScreen` neste arquivo — renomeada para `Dashboard`
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

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      sb("/categorias?order=ordem.asc", { token }),
      sb("/lancamentos?order=data_vencimento.desc", { token }),
      sb("/metas?order=id.asc", { token }),
      sb("/cartoes?select=nome&user_id=eq." + uid + "&ativo=eq.true", { token })
    ]).then(([cats, lancs, metasData, cartoesData]) => {
      if (Array.isArray(cats)) setCategorias(cats);
      if (Array.isArray(lancs)) setLanc(lancs);
      if (Array.isArray(metasData)) setMetas(metasData);
      if (Array.isArray(cartoesData) && cartoesData.length > 0) {
        setCartoes(cartoesData.map(c => c.nome));
      }
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

  const catsRFromDB = categorias.filter(c => c.tipo === "receita" && c.ativo).map(c => c.nome);
  const catsDFromDB = categorias.filter(c => c.tipo === "despesa" && c.ativo).map(c => c.nome);
  const catsRList = catsRFromDB.length > 0 ? catsRFromDB : CATS_R;
  const catsDList = catsDFromDB.length > 0 ? catsDFromDB : CATS_D;

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

  const recarregarMetas = async () => {
    const updated = await sb("/metas?order=id.asc", { token });
    if (Array.isArray(updated)) setMetas(updated);
  };

  if (loading) return <Loading />;

  return (
    <div style={{ background: C.slate, minHeight: "100vh", color: "#1E293B" }}>
      <Toast message={toastMsg} />
      <Header session={session} aba={aba} setAba={setAba} onLogout={onLogout} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>

        {aba === "dashboard" && (
          <DashboardContent
            tR={tR} tD={tD} saldo={saldo} inv={inv} fin={fin}
            rec={rec} desp={desp} metas={safeMetas} setAba={setAba}
          />
        )}

        {aba === "lancamentos" && (
          <LancamentosScreen
            lancamentos={safeLanc}
            categorias={categorias}
            catsRList={catsRList}
            catsDList={catsDList}
            token={token}
            uid={uid}
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
            onMetasUpdate={recarregarMetas}
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

function DashboardContent({ tR, tD, saldo, inv, fin, rec, desp, metas, setAba }) {
  const rF = rec.filter((l) => l?.cat === "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const rV = rec.filter((l) => l?.cat !== "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const dF = desp.filter((l) => ["Aluguel", "Energia", "Internet", "Telefone", "Assinaturas"].includes(l?.cat)).reduce((s, l) => s + Number(l?.valor || 0), 0);

  const txP = tR > 0 ? saldo / tR : 0;
  const dC = tR > 0 ? rF / tR : 0;
  const cFx = tR > 0 ? dF / tR : 0;

  const coresMap = { navy: C.navy, green: C.green, purple: C.purple, amber: C.amber, teal: C.teal, orange: C.orange, red: C.red };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Receita", value: tR, color: C.green },
          { label: "Despesas", value: tD, color: C.red },
          { label: "Saldo", value: saldo, color: saldo >= 0 ? C.navy : C.red },
          { label: "Investido", value: inv, color: C.purple },
          { label: "Financiamento", value: fin, color: C.amber }
        ].map((k) => (
          <div key={k.label} style={{ ...styles.card, borderTop: "3px solid " + k.color, padding: "1rem" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.grayD, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{fmt(k.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Receita</div>
          {[["Fixa (CLT)", rF, C.navy], ["Variável", rV, C.green]].map(([label, value, color]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.grayD }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{tR > 0 ? ((value / tR) * 100).toFixed(1) : 0}%</span>
              </div>
              <Bar pct={tR > 0 ? (value / tR) * 100 : 0} color={color} />
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Indicadores</div>
          {[
            { label: "Poupança", value: txP, ok: txP >= 0.2 },
            { label: "CLT", value: dC, ok: dC <= 0.7 },
            { label: "Fixas", value: cFx, ok: cFx <= 0.5 }
          ].map((k) => (
            <div key={k.label} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid " + C.border }}>
              <span style={{ flex: 1, fontSize: 12, color: C.grayD }}>{k.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: k.ok ? C.green : C.amber }}>{(k.value * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Metas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {metas.slice(0, 3).map((m) => {
            const p = Math.min(100, (m.atual / m.valor) * 100);
            const corMeta = coresMap[m.cor] || C.navy;
            return (
              <div key={m.id} style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: corMeta }}>{m.nome}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p >= 100 ? C.green : corMeta }}>{Math.round(p)}%</span>
                </div>
                <Bar pct={p} color={p >= 100 ? C.green : corMeta} />
                <div style={{ fontSize: 10, color: C.grayD, marginTop: 4 }}>{fmt(m.atual)} / {fmt(m.valor)}</div>
              </div>
            );
          })}
          {metas.length > 3 && (
            <div style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
              <button onClick={() => setAba("metas")} style={{ fontSize: 11, color: C.navy, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                + {metas.length - 3} outras metas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
