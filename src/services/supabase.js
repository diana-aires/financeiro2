import { supabaseConfig } from '../config/supabase';

export async function safeFetch(url, opts) {
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

export async function sb(path, opts = {}) {
  const { method = "GET", body, token } = opts;
  const authToken = token || supabaseConfig.anonKey;
  
  const headers = {
    "Content-Type": "application/json",
    "apikey": supabaseConfig.anonKey,
    "Authorization": `Bearer ${authToken}`,
  };
  
  if (method === "POST" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }
  
  try {
    const url = supabaseConfig.url + "/rest/v1" + path;
    console.log(`📡 ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`📡 Resposta: ${response.status}`);
    
    if (response.status === 204) {
      return { success: true };
    }
    
    if (response.status === 201) {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          return JSON.parse(text);
        } catch(e) {
          return { success: true };
        }
      }
      return { success: true };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.msg || `HTTP ${response.status}`;
      } catch(e) {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    
    const text = await response.text();
    if (!text || text.trim() === '' || text === 'null') {
      return method === "DELETE" ? { success: true } : [];
    }
    
    try {
      return JSON.parse(text);
    } catch(e) {
      console.error('❌ Erro ao parsear JSON:', e);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro crítico na requisição Supabase:', error);
    throw error;
  }
}

export default sb;
