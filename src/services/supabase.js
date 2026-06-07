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
  
  // Garantir que o token está sendo usado corretamente
  const authToken = token || supabaseConfig.anonKey;
  
  const headers = {
    "Content-Type": "application/json",
    "apikey": supabaseConfig.anonKey,
    "Authorization": `Bearer ${authToken}`,
  };
  
  // Para POST e PATCH, pedir para retornar os dados
  if (method === "POST" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }
  
  try {
    const url = supabaseConfig.url + "/rest/v1" + path;
    console.log(`📡 ${method} ${url}`);
    console.log(`📡 Token sendo usado: ${authToken ? authToken.substring(0, 30) + '...' : 'NENHUM TOKEN'}`);
    if (body) console.log(`📡 Body:`, body);
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`📡 Resposta: ${response.status} ${response.statusText}`);
    
    // Para respostas de sucesso sem conteúdo
    if (response.status === 204) {
      console.log(`✅ ${method} realizado com sucesso (sem conteúdo)`);
      return { success: true };
    }
    
    // Para respostas de criação
    if (response.status === 201) {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          const data = JSON.parse(text);
          console.log(`✅ ${method} realizado com sucesso, dados:`, data);
          return data;
        } catch(e) {
          console.log(`✅ ${method} realizado com sucesso, sem dados retornados`);
          return { success: true };
        }
      }
      return { success: true };
    }
    
    // Para erros
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resposta de erro:', response.status, errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.msg || `HTTP ${response.status}`;
      } catch(e) {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Para GET e outras requisições com resposta
    const text = await response.text();
    if (!text || text.trim() === '' || text === 'null') {
      return method === "DELETE" ? { success: true } : [];
    }
    
    try {
      const json = JSON.parse(text);
      console.log(`📡 Dados recebidos:`, Array.isArray(json) ? `${json.length} itens` : json);
      return json;
    } catch(e) {
      console.error('❌ Erro ao parsear JSON:', e, 'Texto:', text);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro crítico na requisição Supabase:', error);
    // Relançar o erro para ser tratado pelo código chamador
    throw error;
  }
}
