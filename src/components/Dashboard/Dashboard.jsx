import { useState, useMemo, useEffect } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { Header } from '../Common/Header';
import { Loading } from '../Common/Loading';
import { Toast } from '../Common/Toast';
import { PeriodoSelector } from '../Common/PeriodoSelector';
import { usePeriodo } from '../../hooks/usePeriodo';
import { LancamentosScreen } from '../Lancamentos/LancamentosScreen';
import { FaturasScreen } from '../Cartao/CartaoScreen';
import { MetasScreen } from '../Metas/MetasScreen';
import { GerenciarCategorias } from '../Categorias/GerenciarCategorias';
import { IAScreen } from '../IA/IAScreen';
import sb from '../../services/supabase';
import { CATS_R, CATS_D, METAS_DEF, CARTOES } from '../../utils/constants';

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

  function toast(m) { setToastMsg(m); setTimeout(() => setToastMsg(""), 3000); }

  // Hook central de período — compartilhado entre todas as abas
  const periodo = usePeriodo(lanc);

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
      if (Array.isArray(cartoesData) && cartoesData.length > 0)
        setCartoes(cartoesData.map(c => c.nome));
      if (!metasData || metasData.length === 0)
        METAS_DEF.forEach(m => sb("/metas", { method: "POST", token, body: { ...m, user_id: uid } }));
    }).catch(e => toast("Erro: " + e.message))
      .finally(() => setLoading(false));
  }, [token, uid]);

  const safeLanc = useMemo(() => Array.isArray(lanc) ? lanc : [], [lanc]);
  const safeMetas = useMemo(() => Array.isArray(metas) ? metas : [], [metas]);

  const catsRList = useMemo(() => {
    const db = categorias.filter(c => c.tipo === "receita" && c.ativo).map(c => c.nome);
    return db.length > 0 ? db : CATS_R;
  }, [categorias]);

  const catsDList = useMemo(() => {
    const db = categorias.filter(c => c.tipo === "despesa" && c.ativo).map(c => c.nome);
    return db.length > 0 ? db : CATS_D;
  }, [categorias]);

  // Lançamentos do período selecionado (usado no dashboard e passado para filhos)
  const { lancFiltrados, ...periodoProps } = periodo;

  const recarregarLancamentos = async () => {
    const updated = await sb("/lancamentos?order=data_vencimento.desc", { token });
    if (Array.isArray(updated)) setLanc(updated);
  };
  const recarregarMetas = async () => {
    const updated = await sb("/metas?order=id.asc", { token });
    if (Array.isArray(updated)) setMetas(updated);
  };

  if (loading) return <Loading />;

  // KPIs calculados sobre o período filtrado
  const rec = lancFiltrados.filter(l => l?.tipo === "receita");
  const desp = lancFiltrados.filter(l => l?.tipo === "despesa");
  const tR = rec.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const tD = desp.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const saldo = tR - tD;
  const inv = desp.filter(l => l?.cat === "Investimento").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const fin = desp.filter(l => l?.cat === "Financiamento").reduce((s, l) => s + Number(l?.valor || 0), 0);

  return (
    <div style={{ background: C.slate, minHeight: "100vh", color: "#1E293B" }}>
      <Toast message={toastMsg} />
      <Header session={session} aba={aba} setAba={setAba} onLogout={onLogout} />

      {/* Barra de período global — aparece em todas as abas exceto metas/categorias */}
      {!["metas", "categorias", "ia"].includes(aba) && (
        <div style={{ background: "#fff", borderBottom: "1px solid " + C.border, padding: "8px 1rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: C.grayD, fontWeight: 500 }}>Período:</span>
            <PeriodoSelector {...periodoProps} mesAno={periodo.mesAno} labelAtual={periodo.labelAtual} />
            <span style={{ fontSize: 11, color: C.grayD, marginLeft: "auto" }}>
              {lancFiltrados.length} lançamento{lancFiltrados.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
        {aba === "dashboard" && (
          <DashboardContent
            tR={tR} tD={tD} saldo={saldo} inv={inv} fin={fin}
            rec={rec} desp={desp}
            metas={safeMetas} setAba={setAba}
            labelPeriodo={periodo.labelAtual}
          />
        )}

        {aba === "lancamentos" && (
          <LancamentosScreen
            lancamentos={safeLanc}
            lancFiltrados={lancFiltrados}
            periodoProps={{ ...periodoProps, mesAno: periodo.mesAno, labelAtual: periodo.labelAtual }}
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

        {aba === "faturas" && (
          <FaturasScreen
            lancamentos={safeLanc}
            lancFiltrados={lancFiltrados}
            periodoProps={{ ...periodoProps, mesAno: periodo.mesAno, labelAtual: periodo.labelAtual }}
            token={token}
            session={session}
            toast={toast}
            onLancamentosUpdate={recarregarLancamentos}
          />
        )}

        {aba === "metas" && (
          <MetasScreen
            metas={safeMetas}
            token={token} uid={uid}
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
          <IAScreen lancamentos={safeLanc} tR={tR} tD={tD} saldo={saldo} />
        )}
      </div>
    </div>
  );
}

/* ─── KPI cards + indicadores do período ─── */
function DashboardContent({ tR, tD, saldo, inv, fin, rec, desp, metas, setAba, labelPeriodo }) {
  const rF = rec.filter(l => l?.cat === "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const rV = rec.filter(l => l?.cat !== "Salário CLT").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const dF = desp.filter(l => ["Aluguel","Energia","Internet","Telefone","Assinaturas"].includes(l?.cat))
               .reduce((s, l) => s + Number(l?.valor || 0), 0);

  const txP = tR > 0 ? saldo / tR : 0;
  const dC  = tR > 0 ? rF / tR : 0;
  const cFx = tR > 0 ? dF / tR : 0;
  const coresMap = { navy: C.navy, green: C.green, purple: C.purple, amber: C.amber, teal: C.teal, orange: C.orange, red: C.red };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {/* Título do período */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-calendar-month" style={{ fontSize: 16, color: C.navy }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>Resumo — {labelPeriodo}</span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Receita", value: tR, color: C.green },
          { label: "Despesas", value: tD, color: C.red },
          { label: "Saldo", value: saldo, color: saldo >= 0 ? C.navy : C.red },
          { label: "Investido", value: inv, color: C.purple },
          { label: "Financiamento", value: fin, color: C.amber }
        ].map(k => (
          <div key={k.label} style={{ ...styles.card, borderTop: "3px solid " + k.color, padding: "1rem" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.grayD, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Indicadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Composição da Receita</div>
          {[["Fixa (CLT)", rF, C.navy], ["Variável", rV, C.green]].map(([label, value, color]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.grayD }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{tR > 0 ? ((value / tR) * 100).toFixed(1) : 0}%  {fmt(value)}</span>
              </div>
              <Bar pct={tR > 0 ? (value / tR) * 100 : 0} color={color} />
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Indicadores Financeiros</div>
          {[
            { label: "Taxa de poupança", value: txP, ok: txP >= 0.2, meta: "≥ 20%" },
            { label: "Dependência CLT", value: dC, ok: dC <= 0.7, meta: "≤ 70%" },
            { label: "Custos fixos / receita", value: cFx, ok: cFx <= 0.5, meta: "≤ 50%" }
          ].map(k => (
            <div key={k.label} style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + C.border }}>
              <span style={{ flex: 1, fontSize: 12, color: C.grayD }}>{k.label}</span>
              <span style={{ fontSize: 11, color: C.gray, marginRight: 8 }}>{k.meta}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.ok ? C.green : C.amber }}>
                {(k.value * 100).toFixed(1)}%
              </span>
              <i className={"ti " + (k.ok ? "ti-circle-check" : "ti-alert-circle")}
                style={{ fontSize: 14, color: k.ok ? C.green : C.amber, marginLeft: 6 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Metas */}
      {metas.length > 0 && (
        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Metas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {metas.slice(0, 3).map(m => {
              const p = Math.min(100, (m.atual / m.valor) * 100);
              const cor = coresMap[m.cor] || C.navy;
              return (
                <div key={m.id} style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: cor }}>{m.nome}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p >= 100 ? C.green : cor }}>{Math.round(p)}%</span>
                  </div>
                  <Bar pct={p} color={p >= 100 ? C.green : cor} />
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
      )}
    </div>
  );
}

export default Dashboard;

