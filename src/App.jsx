import { useState } from 'react';
import { AuthScreen } from './components/Auth/AuthScreen';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Landing } from './components/Landing/Landing';
import { cssAnimations } from './styles/theme';

function App() {
  const [screen, setScreen] = useState("landing");
  const [session, setSession] = useState(null);

  function handleAuth(s) {
    console.log('✅ Autenticado:', s?.user?.email);
    setSession(s);
    setScreen("app");
  }

  function handleLogout() {
    setSession(null);
    setScreen("landing");
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
