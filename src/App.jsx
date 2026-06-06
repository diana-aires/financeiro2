import { useState, useEffect, useCallback, useMemo } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const C = {
  navy: "#1E3A8A", navyL: "#2d4fa3", green: "#10B981", greenD: "#059669",
  greenL: "#34d399", slate: "#F8FAFC", gray: "#94A3B8", grayD: "#64748B",
  border: "#E2E8F0", white: "#FFFFFF", red: "#EF4444", amber: "#F59E0B",
  purple: "#7C3AED", orange: "#F97316", teal: "#14B8A6",
};

/* ── Supabase helpers COM TRATAMENTO RADICAL ── */
async function safeFetch(url, opts) {
  try {
    const r = await fetch(url, opts);
    const ct = r.headers.get("content-type") || "";
    
    if (!ct.includes("application/json")) {
      const raw = await r.text();
      console.warn("⚠️ Resposta não-JSON:", url, r.status, raw.slice(0, 200));
      return {
        ok: false,
        status: r.status,
        headers: r.headers,
        json: async () => ([]),
        text: async () => "[]"
      };
    }
    return r;
  } catch (error) {
    console.error('❌ Erro no fetch:', error);
    return {
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ([]),
      text: async () => "[]"
    };
  }
}

async function authRequest(path, body) {
  const r = await safeFetch(SUPABASE_URL + "/auth/v1" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error_description || d?.msg || d?.error || "Erro");
  return d;
}

async function sb(path, opts = {}) {
  const { method = "GET", body, token } = opts;
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + (token || SUPABASE_ANON_KEY),
  };
  if (method === "POST" || method === "PATCH") headers.Prefer = "return=representation";
  
  try {
    const r = await safeFetch(SUPABASE_URL + "/rest/v1" + path, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await r.text();
    
    if (!txt || txt.trim() === '' || txt === 'null' || txt === 'undefined') {
      console.warn('📭 Resposta vazia ou nula da API:', path);
      return [];
    }
    
    let result;
    try {
      result = JSON.parse(txt);
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e);
      return [];
    }
    
    if (result === null || result === undefined) return [];
    if (Array.isArray(result)) return result;
    if (typeof result === 'object') return [result];
    
    return [];
    
  } catch (error) {
    console.error('❌ Erro crítico na requisição Supabase:', error);
    return [];
  }
}

/* ── Constants ── */
const CATS_R = ["Salário CLT", "Consultoria", "Honorários", "Comissão", "Projeto", "Curso/Treinamento", "Prestação de Serviços", "Outro"];
const CATS_D = ["Aluguel", "Energia", "Internet", "Telefone", "Assinaturas", "Alimentação", "Transporte", "Viagem", "Lazer", "Compras", "Investimento", "Saúde", "Beleza", "Insumos", "Doação", "Empréstimo", "Financiamento", "Outro"];
const TIPO_R = { "Salário CLT": "fixa", Consultoria: "variavel", Honorários: "variavel", Comissão: "variavel", Projeto: "variavel", "Curso/Treinamento": "variavel", "Prestação de Serviços": "variavel", Outro: "variavel" };
const TIPO_D = { Aluguel: "fixa", Energia: "fixa", Internet: "fixa", Telefone: "fixa", Assinaturas: "fixa", Alimentação: "variavel", Transporte: "variavel", Viagem: "variavel", Lazer: "variavel", Compras: "variavel", Investimento: "variavel", Saúde: "variavel", Beleza: "variavel", Insumos: "variavel", Doação: "variavel", Empréstimo: "fixa", Financiamento: "fixa", Outro: "variavel" };
const METAS_DEF = [
  { nome: "Reserva de Emergência", valor: 30000, atual: 0, prazo: "Dez/2025" },
  { nome: "Viagem Internacional", valor: 12000, atual: 0, prazo: "Ago/2026" },
  { nome: "Investimentos Anuais", valor: 24000, atual: 0, prazo: "Dez/2025" },
];
const CARTOES = ["Nubank", "Inter", "C6", "Itaú", "Bradesco", "Santander", "BB", "Caixa", "Outro"];
const ICONES = ["ti-wallet", "ti-home", "ti-bolt", "ti-wifi", "ti-phone", "ti-brand-spotify", "ti-shopping-cart", "ti-bus", "ti-plane", "ti-movie", "ti-shopping-bag", "ti-chart-line", "ti-heart", "ti-makeup", "ti-package", "ti-gift", "ti-credit-card", "ti-building-bank", "ti-dots", "ti-run", "ti-school", "ti-shield", "ti-brand-netflix"];

const fmt = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => (Number(v) * 100).toFixed(1) + "%";
const today = () => new Date().toISOString().split("T")[0];
const crd = { background: C.white, border: "1px solid " + C.border, borderRadius: 16, padding: "1.25rem", boxShadow: "0 2px 12px rgba(30,58,138,.07)" };
const inp = { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid " + C.border, padding: "8px 10px", fontSize: 13, outline: "none" };
const lab = { fontSize: 11, fontWeight: 600, color: C.grayD, marginBottom: 5, display: "block" };
const btnP = { background: C.navy, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnS = { background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnD = { background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnI = { background: "none", border: "none", cursor: "pointer", padding: 3 };


function Bar({ pct, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 999, height: 6, overflow: "hidden" }}>
      <div style={{ width: Math.min(100, pct) + "%", height: "100%", background: color, borderRadius: 999, transition: "width .6s" }} />
    </div>
  );
}

const BLANK = { tipo: "receita", cat: CATS_R[0], descricao: "", valor: "", data: today(), parcelas: "", parcela_atual: "", cartao: "" };
const CATEGORIA_BLANK = { tipo: "despesa", nome: "", classificacao: "fixa", icone: "ti-tag", ativo: true };

const CSS = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.float-card{animation:float 4s ease-in-out infinite}
.row-hover:hover{background:${C.slate}}
.btn-green{transition:all .2s}
.btn-green:hover{background:${C.greenD}!important;transform:translateY(-1px)}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-content{background:white;border-radius:20px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto}
`;

/* ════ AUTH ════ */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [focused, setFocused] = useState("");

  async function handle() {
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (mode === "login") {
        onAuth(await authRequest("/token?grant_type=password", { email, password: pass }));
      } else if (mode === "register") {
        if (pass.length < 6) { setErr("Senha mínima: 6 caracteres."); setLoading(false); return; }
        await authRequest("/signup", { email, password: pass });
        setMsg("Conta criada! Verifique seu e-mail.");
        setMode("login");
      } else {
        await authRequest("/recover", { email });
        setMsg("Link enviado!");
        setMode("login");
      }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  const fs = (name) => ({ ...inp, padding: "11px 40px", border: "1.5px solid " + (focused === name ? C.navy : C.border), borderRadius: 10, fontSize: 14, transition: "border-color .15s" });
  const ic = (name) => focused === name ? C.navy : C.gray;

  return (
    <div style={{ minHeight: "100vh", background: C.slate, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp .5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.navy, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 26 }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>FinancePro</h1>
          <p style={{ fontSize: 13, color: C.grayD, margin: 0 }}>{mode === "login" ? "Bem-vindo de volta" : mode === "register" ? "Crie sua conta" : "Recuperar acesso"}</p>
        </div>
        <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 20, padding: "2rem", boxShadow: "0 16px 48px rgba(30,58,138,.1)" }}>
          {mode !== "forgot" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: C.slate, borderRadius: 10, padding: 4, marginBottom: "1.5rem", border: "1px solid " + C.border }}>
              {[["login", "Entrar"], ["register", "Criar conta"]].map(([m, l]) => (
                <button key={m} onClick={() => { setMode(m); setErr(""); setMsg(""); }}
                  style={{ padding: 8, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400, background: mode === m ? C.white : "transparent", color: mode === m ? C.navy : C.grayD }}>{l}</button>
              ))}
            </div>
          )}
          {err && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 14 }}>{err}</div>}
          {msg && <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.greenD, marginBottom: 14 }}>{msg}</div>}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>E-mail</label>
            <div style={{ position: "relative" }}>
              <i className="ti ti-mail" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: ic("email"), pointerEvents: "none" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="seu@email.com" style={fs("email")} onKeyDown={(e) => e.key === "Enter" && handle()} />
            </div>
          </div>
          {mode !== "forgot" && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Senha</label>
              <div style={{ position: "relative" }}>
                <i className="ti ti-lock" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: ic("pass"), pointerEvents: "none" }} />
                <input type={showPass ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} onFocus={() => setFocused("pass")} onBlur={() => setFocused("")} placeholder="••••••••" style={fs("pass")} onKeyDown={(e) => e.key === "Enter" && handle()} />
                <button onClick={() => setShowPass((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray, padding: 0 }}>
                  <i className={"ti " + (showPass ? "ti-eye-off" : "ti-eye")} style={{ fontSize: 17 }} />
                </button>
              </div>
            </div>
          )}
          <button onClick={handle} disabled={loading}
            style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg," + C.navy + "," + C.navyL + ")", color: "#fff", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
            {loading && <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />}
            {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar link"}
          </button>
          {mode === "login" && <button onClick={() => { setMode("forgot"); setErr(""); }} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.grayD }}>Esqueci minha senha</button>}
          {mode === "forgot" && <button onClick={() => { setMode("login"); setErr(""); }} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.grayD }}>← Voltar</button>}
        </div>
      </div>
    </div>
  );
}

/* ════ GERENCIAMENTO DE CATEGORIAS ════ */
function GerenciarCategorias({ token, catsR, catsD, onCategoriasChange }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...CATEGORIA_BLANK });
  const [toastMsg, setToastMsg] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroClassificacao, setFiltroClassificacao] = useState("todos");

  function toast(m) { setToastMsg(m); setTimeout(() => setToastMsg(""), 3000); }

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
    if (window.confirm(`Desativar a categoria "${cat.nome}"? Lançamentos existentes não serão afetados.`)) {
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
      {toastMsg && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.navy, color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, zIndex: 999 }}>{toastMsg}</div>}
      
      <div style={{ ...crd, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Gerenciar Categorias</div>
            <div style={{ fontSize: 11, color: C.grayD }}>Adicione, edite ou desative categorias de receitas e despesas</div>
          </div>
          <button onClick={() => abrirModal()} style={{ ...btnS, gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            Nova Categoria
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...inp, width: "auto" }}>
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select value={filtroClassificacao} onChange={(e) => setFiltroClassificacao(e.target.value)} style={{ ...inp, width: "auto" }}>
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
            {/* Receitas */}
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
                      <button onClick={() => abrirModal(cat)} style={btnI}><i className="ti ti-edit" style={{ fontSize: 12, color: C.navy }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas */}
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
                      <button onClick={() => abrirModal(cat)} style={btnI}><i className="ti ti-edit" style={{ fontSize: 12, color: C.navy }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Categorias inativas */}
        {categoriasInativas.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: C.slate, borderRadius: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: C.grayD, marginBottom: 8 }}>Categorias Inativas</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categoriasInativas.map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: C.white, borderRadius: 6, border: "1px solid " + C.border }}>
                  <span style={{ fontSize: 11, color: C.grayD }}>{cat.nome}</span>
                  <button onClick={() => reativarCategoria(cat)} style={{ ...btnI, color: C.green }}><i className="ti ti-reload" style={{ fontSize: 11 }} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy, margin: 0 }}>{editando ? "Editar Categoria" : "Nova Categoria"}</h3>
              <button onClick={fecharModal} style={{ ...btnI }}><i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} /></button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lab}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lab}>Nome da Categoria</label>
              <input type="text" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Academia, Streaming, ..." style={inp} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lab}>Classificação</label>
              <select value={form.classificacao} onChange={(e) => setForm(f => ({ ...f, classificacao: e.target.value }))} style={inp}>
                <option value="fixa">Fixa (mensal previsível)</option>
                <option value="variavel">Variável (valor pode mudar)</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lab}>Ícone</label>
              <select value={form.icone} onChange={(e) => setForm(f => ({ ...f, icone: e.target.value }))} style={inp}>
                {ICONES.map(icone => (
                  <option key={icone} value={icone}>
                    {icone.replace("ti-", "")}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={fecharModal} style={{ ...btnP, background: C.grayD }}>Cancelar</button>
              <button onClick={salvarCategoria} style={btnS}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════ DASHBOARD COM PROTEÇÃO RADICAL ════ */
function Dashboard({ session, onLogout }) {
  const [aba, setAba] = useState("dashboard");
  const [lanc, setLanc] = useState([]);
  const [metas, setMetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [aiResp, setAiResp] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [cartoes, setCartoes] = useState(CARTOES);
  const [aiQ, setAiQ] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showParcela, setShowParcela] = useState(false);
  const token = session?.access_token;
  const uid = session?.user?.id;

  function toast(m) { setToastMsg(m); setTimeout(() => setToastMsg(""), 3000); }

  // Carregar categorias do banco
  useEffect(() => {
    if (!token) return;
    sb("/categorias?order=ordem.asc", { token })
      .then(data => {
        if (Array.isArray(data)) {
          setCategorias(data);
        }
      })
      .catch(err => console.error('Erro ao carregar categorias:', err));
  }, [token]);

  const safeLanc = useMemo(() => {
    if (!lanc) return [];
    if (!Array.isArray(lanc)) {
      console.error('❌ safeLanc detectou que lanc não é array:', lanc);
      return [];
    }
    return lanc;
  }, [lanc]);

  const safeMetas = useMemo(() => {
    if (!metas) return [];
    if (!Array.isArray(metas)) {
      console.error('❌ safeMetas detectou que metas não é array:', metas);
      return [];
    }
    return metas;
  }, [metas]);

  // Obter listas de categorias do banco ou fallback
  const catsRFromDB = categorias.filter(c => c.tipo === "receita" && c.ativo).map(c => c.nome);
  const catsDFromDB = categorias.filter(c => c.tipo === "despesa" && c.ativo).map(c => c.nome);
  const catsRList = catsRFromDB.length > 0 ? catsRFromDB : CATS_R;
  const catsDList = catsDFromDB.length > 0 ? catsDFromDB : CATS_D;

  // Construir TIPO_R e TIPO_D dinâmicos
  const tipoRFromDB = {};
  const tipoDFromDB = {};
  categorias.forEach(c => {
    if (c.tipo === "receita") tipoRFromDB[c.nome] = c.classificacao;
    if (c.tipo === "despesa") tipoDFromDB[c.nome] = c.classificacao;
  });
  const TIPO_R_DINAMICO = Object.keys(tipoRFromDB).length > 0 ? tipoRFromDB : TIPO_R;
  const TIPO_D_DINAMICO = Object.keys(tipoDFromDB).length > 0 ? tipoDFromDB : TIPO_D;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    
    Promise.all([
      sb("/lancamentos?order=data.desc", { token }),
      sb("/metas?order=id.asc", { token }),
    ]).then(([ls, ms]) => {
      console.log('📊 Dados recebidos do Supabase:');
      console.log('- Lancamentos tipo:', typeof ls, 'é array?', Array.isArray(ls));
      console.log('- Metas tipo:', typeof ms, 'é array?', Array.isArray(ms));
      
      let lancamentosArray = [];
      let metasArray = [];
      
      if (Array.isArray(ls)) {
        lancamentosArray = ls;
      } else if (ls && typeof ls === 'object') {
        lancamentosArray = [ls];
      }
      
      if (Array.isArray(ms)) {
        metasArray = ms;
      } else if (ms && typeof ms === 'object') {
        metasArray = [ms];
      }
      
      console.log('✅ Após correção - Lancamentos:', lancamentosArray.length, 'Metas:', metasArray.length);
      
      setLanc(lancamentosArray);
      
      if (metasArray.length === 0) {
        console.log('📝 Criando metas padrão...');
        sb("/metas", { method: "POST", token, body: METAS_DEF.map((m) => ({ ...m, user_id: uid })) })
          .then((d) => {
            let newMetas = [];
            if (Array.isArray(d)) {
              newMetas = d;
            } else if (d && typeof d === 'object') {
              newMetas = [d];
            }
            setMetas(newMetas);
          })
          .catch(err => console.error('❌ Erro criar metas:', err));
      } else {
        setMetas(metasArray);
      }
    }).catch((e) => {
      console.error('❌ Erro no carregamento:', e);
      toast("Erro: " + e.message);
      setLanc([]);
      setMetas([]);
    }).finally(() => setLoading(false));
  }, [token, uid]);

  const rec = safeLanc.filter((l) => l?.tipo === "receita");
  const desp = safeLanc.filter((l) => l?.tipo === "despesa");
  const tR = rec.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const tD = desp.reduce((s, l) => s + Number(l?.valor || 0), 0);
  const saldo = tR - tD;
  const rF = rec.filter((l) => TIPO_R_DINAMICO[l?.cat] === "fixa").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const rV = rec.filter((l) => TIPO_R_DINAMICO[l?.cat] === "variavel").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const dF = desp.filter((l) => TIPO_D_DINAMICO[l?.cat] === "fixa").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const inv = desp.filter((l) => l?.cat === "Investimento").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const fin = desp.filter((l) => l?.cat === "Financiamento").reduce((s, l) => s + Number(l?.valor || 0), 0);
  const txP = tR > 0 ? saldo / tR : 0;
  const txI = tR > 0 ? inv / tR : 0;
  const dC = tR > 0 ? rF / tR : 0;
  const cFx = tR > 0 ? dF / tR : 0;
  
  const meses = [...new Set(safeLanc.map((l) => l?.data?.slice(0, 7)).filter(Boolean))].sort().reverse();
  
  let lF = safeLanc;
  if (filtro) {
    lF = safeLanc.filter((l) => l?.data?.startsWith(filtro));
  }
  
  const sP = lF.reduce((s, l) => (l?.tipo === "receita" ? s + Number(l?.valor || 0) : s - Number(l?.valor || 0)), 0);
  
  const parcelados = safeLanc.filter((l) => l?.parcelas && l.parcelas > 0);
  const porCartao = {};
  parcelados.forEach((l) => { 
    const c = l?.cartao || "Sem cartão"; 
    if (!porCartao[c]) porCartao[c] = []; 
    porCartao[c].push(l); 
  });

  function startEdit(l) {
    if (!l) return;
    setEditId(l.id);
    setForm({ 
      tipo: l.tipo || "receita", 
      cat: l.cat || catsRList[0], 
      descricao: l.descricao || "", 
      valor: String(l.valor || ""), 
      data: l.data || today(), 
      parcelas: l.parcelas ? String(l.parcelas) : "", 
      parcela_atual: l.parcela_atual ? String(l.parcela_atual) : "", 
      cartao: l.cartao || "" 
    });
    if (l.parcelas) setShowParcela(true);
    setAba("lancamentos");
  }
  
  function cancelEdit() { 
    setEditId(null); 
    setForm({ ...BLANK, cat: form.tipo === "receita" ? catsRList[0] : catsDList[0] }); 
    setShowParcela(false); 
  }

  async function salvar() {
    if (!form.descricao || !form.valor || !form.data) {
      toast("Preencha descrição, valor e data");
      return;
    }
    setSaving(true);
    const obj = { 
      tipo: form.tipo, 
      cat: form.cat, 
      descricao: form.descricao, 
      valor: parseFloat(form.valor), 
      data: form.data, 
      parcelas: form.parcelas ? parseInt(form.parcelas) : null, 
      parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null, 
      cartao: form.cartao || null 
    };
    try {
      if (editId) {
        await sb("/lancamentos?id=eq." + editId, { method: "PATCH", token, body: obj });
        setLanc((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return prevArray.map((l) => (l.id === editId ? { ...l, ...obj } : l));
        });
        toast("Atualizado!");
      } else {
        const d = await sb("/lancamentos", { method: "POST", token, body: { ...obj, user_id: uid } });
        const newItem = Array.isArray(d) && d.length > 0 ? d[0] : d;
        setLanc((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return [newItem, ...prevArray];
        });
        toast("Salvo!");
      }
    } catch (e) { 
      console.error('Erro ao salvar:', e);
      toast("Erro: " + e.message); 
    }
    setForm({ ...BLANK, cat: form.tipo === "receita" ? catsRList[0] : catsDList[0] }); 
    setEditId(null); 
    setShowParcela(false); 
    setSaving(false);
  }

  async function duplicar(l) {
    if (!l) return;
    try {
      const obj = { 
        tipo: l.tipo, 
        cat: l.cat, 
        descricao: (l.descricao || "") + " (cópia)", 
        valor: l.valor, 
        data: l.data, 
        parcelas: l.parcelas, 
        parcela_atual: l.parcela_atual ? l.parcela_atual + 1 : null, 
        cartao: l.cartao, 
        user_id: uid 
      };
      const d = await sb("/lancamentos", { method: "POST", token, body: obj });
      const newItem = Array.isArray(d) && d.length > 0 ? d[0] : d;
      setLanc((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [newItem, ...prevArray];
      });
      toast("Duplicado!");
    } catch (e) { 
      console.error('Erro ao duplicar:', e);
      toast("Erro: " + e.message); 
    }
  }

  async function del(id) {
    if (!id) return;
    try { 
      await sb("/lancamentos?id=eq." + id, { method: "DELETE", token }); 
      setLanc((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.filter((l) => l.id !== id);
      }); 
      toast("Removido."); 
    } catch (e) { 
      console.error('Erro ao deletar:', e);
      toast("Erro: " + e.message); 
    }
  }

  async function updMeta(id, inc) {
    const m = safeMetas.find((x) => x.id === id);
    if (!m) return;
    const novo = Math.round(Math.min(m.valor, m.atual + inc) * 100) / 100;
    try { 
      await sb("/metas?id=eq." + id, { method: "PATCH", token, body: { atual: novo } }); 
      setMetas((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.map((x) => (x.id === id ? { ...x, atual: novo } : x));
      }); 
      toast("Atualizado!"); 
    } catch (e) { 
      console.error('Erro ao atualizar meta:', e);
      toast("Erro: " + e.message); 
    }
  }

  async function askAI() {
    if (!aiQ.trim()) return;
    setAiLoad(true); 
    setAiResp("");
    const sys = `Consultor financeiro. Receita ${fmt(tR)}, CLT ${fmt(rF)}, variável ${fmt(rV)}, despesas ${fmt(tD)}, saldo ${fmt(saldo)}, poupança ${fmtPct(txP)}, invest ${fmtPct(txI)}, fixas ${fmtPct(cFx)}, CLT ${fmtPct(dC)}, financiamento ${fmt(fin)}, parcelas ${parcelados.length}. Responda em português, máx 3 parágrafos.`;
    try { 
      const r = await fetch("https://api.anthropic.com/v1/messages", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          model: "claude-sonnet-4-20250514", 
          max_tokens: 1000, 
          system: sys, 
          messages: [{ role: "user", content: aiQ }] 
        }) 
      }); 
      const d = await r.json(); 
      setAiResp(d.content?.[0]?.text || "Sem resposta."); 
    } catch (e) { 
      console.error('Erro na IA:', e);
      setAiResp("Erro: " + e.message); 
    }
    setAiLoad(false);
  }

  const abas = [
    { id: "dashboard", label: "Visão Geral", icon: "ti-layout-dashboard" },
    { id: "lancamentos", label: "Lançamentos", icon: "ti-list" },
    { id: "cartao", label: "Cartão", icon: "ti-credit-card" },
    { id: "metas", label: "Metas", icon: "ti-target" },
    { id: "categorias", label: "Categorias", icon: "ti-tags" },
    { id: "ia", label: "IA", icon: "ti-sparkles" },
  ];

  if (loading) {
    return (
      <div style={{ background: C.slate, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.grayD }}>
          <i className="ti ti-loader-2" style={{ fontSize: 48, animation: "spin 1s linear infinite", display: "block", marginBottom: 16 }} />
          <span>Carregando seus dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.slate, minHeight: "100vh", color: "#1E293B" }}>
      {toastMsg && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.navy, color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, zIndex: 999, animation: "fadeUp .3s ease" }}>{toastMsg}</div>}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "0 1rem", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 52, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 14 }} /></div>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>FinancePro</span>
          </div>
          <div style={{ display: "flex", gap: 1, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
            {abas.map((a) => (
              <button key={a.id} onClick={() => setAba(a.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontWeight: aba === a.id ? 600 : 400, background: aba === a.id ? C.navy + "12" : "transparent", color: aba === a.id ? C.navy : C.grayD, display: "flex", alignItems: "center", gap: 4 }}>
                <i className={"ti " + a.icon} style={{ fontSize: 12 }} />
                {a.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: C.grayD }}>{session?.user?.email}</span>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: C.grayD }}>Sair</button>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
        {aba === "dashboard" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
              {[{ l: "Receita", v: fmt(tR), c: C.green }, { l: "Despesas", v: fmt(tD), c: C.red }, { l: "Saldo", v: fmt(saldo), c: saldo >= 0 ? C.navy : C.red }, { l: "Investido", v: fmt(inv), c: C.purple }, { l: "Financiamento", v: fmt(fin), c: C.amber }].map((k) => (
                <div key={k.l} style={{ ...crd, borderTop: "3px solid " + k.c, padding: "1rem" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.grayD, textTransform: "uppercase", marginBottom: 6 }}>{k.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginBottom: 14 }}>
              <div style={crd}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Receita</div>
                {[["Fixa", rF, C.navy], ["Variável", rV, C.green]].map(([l, v, c]) => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.grayD }}>{l}</span>
                      <span style={{ fontWeight: 600, color: c }}>{tR > 0 ? ((v / tR) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <Bar pct={tR > 0 ? (v / tR) * 100 : 0} color={c} />
                  </div>
                ))}
              </div>
              <div style={crd}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Indicadores</div>
                {[{ l: "Poupança", v: fmtPct(txP), ok: txP >= .2 }, { l: "Investimento", v: fmtPct(txI), ok: txI >= .1 }, { l: "Fixas", v: fmtPct(cFx), ok: cFx <= .5 }, { l: "CLT", v: fmtPct(dC), ok: dC <= .7 }].map((k) => (
                  <div key={k.l} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid " + C.border }}>
                    <span style={{ flex: 1, fontSize: 12, color: C.grayD }}>{k.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: k.ok ? C.green : C.amber }}>{k.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={crd}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 12 }}>Metas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                {safeMetas.map((m) => {
                  const p = Math.min(100, (m.atual / m.valor) * 100);
                  return (
                    <div key={m.id} style={{ background: C.slate, borderRadius: 10, padding: 10, border: "1px solid " + C.border }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.navy }}>{m.nome}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: p >= 100 ? C.green : C.navy }}>{Math.round(p)}%</span>
                      </div>
                      <Bar pct={p} color={p >= 100 ? C.green : C.navy} />
                      <div style={{ fontSize: 10, color: C.grayD, marginTop: 4 }}>{fmt(m.atual)} / {fmt(m.valor)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {aba === "lancamentos" && (
  <div style={{ animation: "fadeUp .4s ease" }}>
    <div style={{ ...crd, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>{editId ? "Editando" : "Novo lançamento"}</span>
        {editId && <button onClick={cancelEdit} style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer" }}>Cancelar</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={lab}>Tipo</label>
          <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, cat: e.target.value === "receita" ? catsRList[0] : catsDList[0] }))} style={inp}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label style={lab}>Categoria</label>
          <select value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))} style={inp}>
            {(form.tipo === "receita" ? catsRList : catsDList).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lab}>Data</label>
          <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={lab}>Valor</label>
          <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} style={inp} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lab}>Descrição</label>
          <input type="text" placeholder="Ex: Consultoria" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} style={inp} onKeyDown={(e) => e.key === "Enter" && salvar()} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setShowParcela(!showParcela)} style={{ fontSize: 12, color: C.navy, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
          {showParcela ? "▾" : "▸"} Parcelamento
        </button>
        {showParcela && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginTop: 8, padding: 10, background: C.slate, borderRadius: 10, border: "1px solid " + C.border }}>
            <div>
              <label style={lab}>Parcelas</label>
              <input type="number" min="1" value={form.parcelas} onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lab}>Atual</label>
              <input type="number" min="1" value={form.parcela_atual} onChange={(e) => setForm((f) => ({ ...f, parcela_atual: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lab}>Cartão</label>
              <select value={form.cartao} onChange={(e) => setForm((f) => ({ ...f, cartao: e.target.value }))} style={inp}>
                <option value="">Selecione</option>
                {CARTOES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
      <button onClick={salvar} disabled={saving} style={{ ...btnP, padding: "9px 20px", borderRadius: 10 }}>
        {saving ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className={"ti " + (editId ? "ti-check" : "ti-device-floppy")} />}
        {editId ? "Atualizar" : "Salvar"}
      </button>
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inp, width: "auto" }}>
        <option value="">Todos ({safeLanc.length})</option>
        {meses.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <span style={{ marginLeft: "auto", fontSize: 11, color: C.green }}>Entr: {fmt(lF.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0))}</span>
      <span style={{ fontSize: 11, color: C.red }}>Saíd: {fmt(lF.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0))}</span>
    </div>
    <div style={crd}>
      {lF.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: C.grayD, fontSize: 13 }}>Nenhum lançamento.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid " + C.border }}>
                {["Data", "Descrição", "Categoria", "Parcela", "Valor", "Ações"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: C.grayD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lF.map((l) => (
                <tr key={l.id} className="row-hover" style={{ borderBottom: "1px solid " + C.border }}>
                  <td style={{ padding: 8, color: C.grayD }}>{l.data?.split("-").reverse().join("/")}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>{l.descricao}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: l.tipo === "receita" ? "#ECFDF5" : "#FEF2F2", color: l.tipo === "receita" ? C.greenD : C.red }}>
                      {l.cat}
                    </span>
                  </td>
                  <td style={{ padding: 8, fontSize: 10, color: C.grayD }}>{l.parcelas ? (l.parcela_atual || 1) + "/" + l.parcelas : "—"}</td>
                  <td style={{ padding: 8, fontWeight: 700, color: l.tipo === "receita" ? C.green : C.red, textAlign: "right" }}>
                    {l.tipo === "despesa" ? "-" : ""}{fmt(l.valor)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => startEdit(l)} style={btnI}><i className="ti ti-edit" style={{ fontSize: 13, color: C.navy }} /></button>
                    <button onClick={() => duplicar(l)} style={btnI}><i className="ti ti-copy" style={{ fontSize: 13, color: C.purple }} /></button>
                    <button onClick={() => del(l.id)} style={btnI}><i className="ti ti-trash" style={{ fontSize: 13, color: C.red }} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid " + C.border }}>
                <td colSpan={4} style={{ padding: 8, fontWeight: 600 }}>Saldo</td>
                <td style={{ padding: 8, fontWeight: 700, textAlign: "right", color: sP >= 0 ? C.green : C.red }}>{fmt(sP)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  </div>
)}

       {aba === "cartao" && (
  <div style={{ animation: "fadeUp .4s ease" }}>
    <div style={{ ...crd, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Parcelas no cartão</div>
          <div style={{ fontSize: 12, color: C.grayD }}>
            {parcelados.length} parcela(s) · Mensal: {fmt(parcelados.reduce((s, l) => s + Number(l.valor), 0))}
          </div>
        </div>
        <button 
          onClick={() => {
            let novoCartao = prompt("Digite o nome do novo cartão:", "");
            if (novoCartao && novoCartao.trim()) {
              novoCartao = novoCartao.trim();
              if (!cartoes.includes(novoCartao)) {
                setCartoes([...cartoes, novoCartao]);
                toast(`✅ Cartão "${novoCartao}" adicionado com sucesso!`);
              } else {
                toast(`⚠️ Cartão "${novoCartao}" já existe!`);
              }
            }
          }}
          style={{ ...btnS, gap: 6 }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Novo Cartão
        </button>
      </div>
    </div>

    {parcelados.length === 0 ? (
      <div style={{ ...crd, textAlign: "center", padding: "2rem", color: C.grayD, fontSize: 13 }}>
        <i className="ti ti-credit-card" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.5 }} />
        Nenhuma parcela encontrada.
        <div style={{ fontSize: 11, marginTop: 8, color: C.gray }}>
          Adicione compras parceladas nos lançamentos.
        </div>
      </div>
    ) : (
      Object.entries(porCartao).map(([cartao, items]) => (
        <div key={cartao} style={{ ...crd, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 16, color: C.navy }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>{cartao}</div>
                <div style={{ fontSize: 11, color: C.grayD }}>{items.length} item(ns)</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
              {fmt(items.reduce((s, l) => s + Number(l.valor), 0))}/mês
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid " + C.border }}>
                  {["Descrição", "Parcela", "Progresso", "Valor", "Restante"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px", fontWeight: 600, color: C.grayD }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const pa = l.parcela_atual || 1;
                  const pt = l.parcelas;
                  const pct = (pa / pt) * 100;
                  const rest = (pt - pa) * Number(l.valor);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid " + C.border }}>
                      <td style={{ padding: 8, fontWeight: 500 }}>{l.descricao}</td>
                      <td style={{ padding: 8, color: C.grayD }}>{pa}/{pt}</td>
                      <td style={{ padding: 8, minWidth: 100 }}>
                        <Bar pct={pct} color={pct >= 100 ? C.green : C.purple} />
                        <span style={{ fontSize: 10, marginLeft: 8 }}>{Math.round(pct)}%</span>
                      </td>
                      <td style={{ padding: 8, color: C.red, whiteSpace: "nowrap" }}>{fmt(l.valor)}</td>
                      <td style={{ padding: 8, color: C.grayD, whiteSpace: "nowrap" }}>{fmt(rest)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))
    )}
  </div>
)}

        {aba === "metas" && (
          <div style={{ animation: "fadeUp .4s ease", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
            {safeMetas.map((m) => {
              const p = Math.min(100, (m.atual / m.valor) * 100);
              return (
                <div key={m.id} style={{ ...crd, borderTop: "3px solid " + (p >= 100 ? C.green : C.navy) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>{m.nome}</div>
                      <div style={{ fontSize: 11, color: C.grayD }}>{m.prazo}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: p >= 100 ? C.green : C.navy }}>{Math.round(p)}%</div>
                  </div>
                  <Bar pct={p} color={p >= 100 ? C.green : C.navy} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.grayD, margin: "8px 0 12px" }}>
                    <span>{fmt(m.atual)}</span>
                    <span>Meta: {fmt(m.valor)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min="0" id={"mi-" + m.id} placeholder="Valor" style={{ ...inp, flex: 1 }} />
                    <button onClick={() => {
                      const el = document.getElementById("mi-" + m.id);
                      const v = parseFloat(el.value);
                      if (!isNaN(v) && v > 0) {
                        updMeta(m.id, v);
                        el.value = "";
                      }
                    }} style={btnP}>Aportar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {aba === "categorias" && (
          <GerenciarCategorias 
            token={token} 
            catsR={catsRList} 
            catsD={catsDList} 
            onCategoriasChange={() => {
              // Recarregar categorias quando mudar
              sb("/categorias?order=ordem.asc", { token })
                .then(data => {
                  if (Array.isArray(data)) setCategorias(data);
                });
            }}
          />
        )}

        {aba === "ia" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ ...crd, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Consultora IA</div>
              <div style={{ fontSize: 11, color: C.grayD }}>{safeLanc.length} lançamentos · {parcelados.length} parcelas</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {["Saúde financeira", "Acelerar reserva", "Investir mais?", "Dependência CLT", "Impacto parcelas", "Financiamento?"].map((s) => (
                <button key={s} onClick={() => setAiQ(s)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 18, border: "1px solid " + C.border, cursor: "pointer", background: C.white, color: C.navy, fontWeight: 500 }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ ...crd, marginBottom: 12, display: "flex", gap: 8 }}>
              <input type="text" placeholder="Pergunte..." value={aiQ} onChange={(e) => setAiQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !aiLoad && askAI()} style={{ ...inp, flex: 1, borderRadius: 10, padding: "10px 14px" }} />
              <button onClick={askAI} disabled={aiLoad || !aiQ.trim()} style={{ ...btnP, borderRadius: 10, padding: "10px 18px" }}>
                {aiLoad ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-send" />}
                {aiLoad ? "..." : "Enviar"}
              </button>
            </div>
            {aiResp && !aiLoad && (
              <div style={{ ...crd, borderLeft: "4px solid " + C.navy }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Análise</div>
                <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#334155" }}>{aiResp}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════ LANDING ════ */
function Landing({ onEnter }) {
  return (
    <div style={{ color: "#1E293B" }}>
      <nav style={{ background: "rgba(255,255,255,.92)", borderBottom: "1px solid " + C.border, padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 17 }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 16, color: C.navy }}>FinancePro</span>
          </div>
          <button onClick={onEnter} className="btn-green" style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Entrar</button>
        </div>
      </nav>
      <section style={{ background: "linear-gradient(135deg," + C.navy + ",#1e40af,#1d4ed8)", padding: "5rem 1.5rem 4rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "#fff", lineHeight: 1.15, margin: "0 auto 1.25rem", maxWidth: 600 }}>Controle total da sua vida financeira</h1>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,.75)", lineHeight: 1.7, margin: "0 auto 2rem", maxWidth: 500 }}>Parcelas, financiamento, múltiplas rendas e IA consultora. Grátis.</p>
        <button onClick={onEnter} className="btn-green" style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Criar minha conta</button>
      </section>
    </div>
  );
}

/* ════ ROOT ════ */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [session, setSession] = useState(null);

  function handleAuth(s) {
    console.log('✅ Autenticado:', s?.user?.email);
    setSession(s);
    setScreen("app");
  }

  function handleLogout() {
    if (session?.access_token) {
      fetch(SUPABASE_URL + "/auth/v1/logout", {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + session.access_token
        }
      }).catch(() => {});
    }
    setSession(null);
    setScreen("landing");
  }

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <style>{`${CSS}`}</style>
      {screen === "landing" && <Landing onEnter={() => setScreen("auth")} />}
      {screen === "auth" && <AuthScreen onAuth={handleAuth} />}
      {screen === "app" && session && <Dashboard session={session} onLogout={handleLogout} />}
    </div>
  );
}
