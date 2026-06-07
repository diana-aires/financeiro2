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
  const headers = {
    "Content-Type": "application/json",
    apikey: supabaseConfig.anonKey,
    Authorization: "Bearer " + (token || supabaseConfig.anonKey),
  };
  
  try {
    const url = supabaseConfig.url + "/rest/v1" + path;
    console.log(`📡 ${method} ${url}`, body ? { body } : '');
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`📡 Resposta: ${response.status}`);
    
    if (response.status === 201 || response.status === 204) {
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log(`✅ ${method} realizado com sucesso`);
        return { success: true };
      }
      try {
        return JSON.parse(text);
      } catch(e) {
        return { success: true };
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch(e) {
        errorJson = { message: errorText };
      }
      throw new Error(errorJson.message || errorJson.error || `HTTP ${response.status}`);
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
    return [];
  }
}
