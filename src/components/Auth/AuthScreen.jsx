import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { authRequest } from '../../services/authService';

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [focused, setFocused] = useState("");

  async function handle() {
    setErr(""); 
    setMsg(""); 
    setLoading(true);
    try {
      if (mode === "login") {
        onAuth(await authRequest("/token?grant_type=password", { email, password: pass }));
      } else if (mode === "register") {
        if (pass.length < 6) { 
          setErr("Senha mínima: 6 caracteres."); 
          setLoading(false); 
          return; 
        }
        await authRequest("/signup", { email, password: pass });
        setMsg("Conta criada! Verifique seu e-mail.");
        setMode("login");
      } else {
        await authRequest("/recover", { email });
        setMsg("Link enviado!");
        setMode("login");
      }
    } catch (e) { 
      setErr(e.message); 
    }
    setLoading(false);
  }

  const fs = (name) => ({ 
    ...styles.input, 
    padding: "11px 40px", 
    border: "1.5px solid " + (focused === name ? C.navy : C.border), 
    borderRadius: 10, 
    fontSize: 14, 
    transition: "border-color .15s" 
  });
  
  const ic = (name) => focused === name ? C.navy : C.gray;

  return (
    <div style={{ minHeight: "100vh", background: C.slate, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp .5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.navy, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <i className="ti ti-chart-pie-2" style={{ color: "#fff", fontSize: 26 }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>FinancePro</h1>
          <p style={{ fontSize: 13, color: C.grayD, margin: 0 }}>
            {mode === "login" ? "Bem-vindo de volta" : mode === "register" ? "Crie sua conta" : "Recuperar acesso"}
          </p>
        </div>
        <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 20, padding: "2rem", boxShadow: "0 16px 48px rgba(30,58,138,.1)" }}>
          {mode !== "forgot" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: C.slate, borderRadius: 10, padding: 4, marginBottom: "1.5rem", border: "1px solid " + C.border }}>
              {[["login", "Entrar"], ["register", "Criar conta"]].map(([m, l]) => (
                <button key={m} onClick={() => { setMode(m); setErr(""); setMsg(""); }}
                  style={{ padding: 8, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400, background: mode === m ? C.white : "transparent", color: mode === m ? C.navy : C.grayD }}>
                  {l}
                </button>
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
