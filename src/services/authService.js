import { supabaseConfig } from '../config/supabase';
import { safeFetch } from './supabase';

export async function authRequest(path, body) {
  const r = await safeFetch(supabaseConfig.url + "/auth/v1" + path, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      apikey: supabaseConfig.anonKey 
    },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error_description || d?.msg || d?.error || "Erro");
  return d;
}

export async function logout(token) {
  if (!token) return;
  try {
    await fetch(supabaseConfig.url + "/auth/v1/logout", {
      method: "POST",
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: "Bearer " + token
      }
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
}
