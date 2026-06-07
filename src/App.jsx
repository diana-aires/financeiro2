import { useState, useEffect } from 'react';
import { AuthScreen } from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import { Landing } from './components/Landing/Landing';
import { cssAnimations } from './styles/theme';
import { supabaseConfig } from './config/supabase';

function App() {
  const [screen, setScreen] = useState("landing");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão do localStorage ao iniciar
  useEffect(() => {
    const savedSession = localStorage.getItem('financepro_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        // Verificar se o token ainda é válido
        const tokenExpiry = parsedSession?.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        if (tokenExpiry && tokenExpiry > now) {
          setSession(parsedSession);
          setScreen("app");
        } else {
          // Token expirado, remover do storage
          localStorage.removeItem('financepro_session');
        }
      } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
        localStorage.removeItem('financepro_session');
      }
    }
    setLoading(false);
  }, []);

  function handleAuth(s) {
    console.log('✅ Autenticado:', s?.user?.email);
    
    // Adicionar tempo de expiração (1 hora a partir de agora)
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60);
    const sessionWithExpiry = {
      ...s,
      expires_at: expiresAt
    };
    
    // Salvar no localStorage
    localStorage.setItem('financepro_session', JSON.stringify(sessionWithExpiry));
    
    setSession(sessionWithExpiry);
    setScreen("app");
  }

  function handleLogout() {
    // Remover do localStorage
    localStorage.removeItem('financepro_session');
    
    // Fazer logout no Supabase
    if (session?.access_token) {
      fetch(supabaseConfig.url + "/auth/v1/logout", {
        method: "POST",
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: "Bearer " + session.access_token
        }
      }).catch(() => {});
    }
    
    setSession(null);
    setScreen("landing");
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#F8FAFC"
      }}>
        <div style={{ textAlign: "center" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <style>{cssAnimations}</style>
      {screen === "landing" && <Landing onEnter={() => setScreen("auth")} />}
      {screen === "auth" && <AuthScreen onAuth={handleAuth} />}
      {screen === "app" && session && <Dashboard session={session} onLogout={handleLogout} />}
    </div>
  );
}

export default App;
