import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { ImportFaturaModal } from './ImportFaturaModal';
import sb from '../../services/supabase';

export function CartaoScreen({ lancamentos, token, session, cartoes, setCartoes, toast, onLancamentosUpdate }) {
  const [showImportModal, setShowImportModal] = useState(false);
  
  const parceladosAtivos = lancamentos.filter(l => 
    l.parcelas && 
    l.parcelas > 0 && 
    l.parcela_atual && 
    l.parcela_atual <= l.parcelas
  );
  
  const porCartao = parceladosAtivos.reduce((acc, l) => {
    const cartao = l.cartao || "Sem cartão";
    if (!acc[cartao]) acc[cartao] = [];
    acc[cartao].push(l);
    return acc;
  }, {});
  
  const totalMensal = parceladosAtivos.reduce((s, l) => s + Number(l.valor), 0);
  
  const marcarParcelaPaga = async (l, pa, pt) => {
    try {
      await sb("/lancamentos?id=eq." + l.id, {
        method: "PATCH",
        token,
        body: { parcela_atual: pa + 1 }
      });
      onLancamentosUpdate();
      toast(`✅ Parcela ${pa}/${pt} paga!`);
    } catch (err) {
      toast("❌ Erro ao atualizar parcela");
    }
  };
  
  const removerParcelamento = (id) => {
    if (window.confirm(`Remover este parcelamento?`)) {
      sb("/lancamentos?id=eq." + id, { method: "DELETE", token }).then(() => {
        onLancamentosUpdate();
        toast("Removido.");
      }).catch(() => toast("Erro ao remover"));
    }
  };
  
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ ...styles.card, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Parcelas no cartão</div>
            <div style={{ fontSize: 12, color: C.grayD }}>Acompanhamento de compras parceladas</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => setShowImportModal(true)}
              style={{ ...styles.buttonPrimary, gap: 6, background: C.purple }}
            >
              <i className="ti ti-file-import" style={{ fontSize: 14 }} />
              Importar Fatura PDF
            </button>
            <button 
              onClick={() => {
                let novoCartao = prompt("Digite o nome do novo cartão:", "");
                if (novoCartao && novoCartao.trim()) {
                  novoCartao = novoCartao.trim();
                  if (!cartoes.includes(novoCartao)) {
                    setCartoes([...cartoes, novoCartao]);
                    toast(`✅ Cartão "${novoCartao}" adicionado!`);
                  } else {
                    toast(`⚠️ Cartão "${novoCartao}" já existe!`);
                  }
                }
              }}
              style={{ ...styles.buttonSuccess, gap: 6 }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              Novo Cartão
            </button>
          </div>
        </div>
      </div>

      {parceladosAtivos.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "2rem", color: C.grayD }}>
          <i className="ti ti-credit-card" style={{ fontSize: 48, display: "block", marginBottom: 12, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Nenhuma parcela ativa</div>
          <div style={{ fontSize: 12 }}>Adicione compras parceladas nos lançamentos para ver o acompanhamento aqui.</div>
        </div>
      ) : (
        <>
          <div style={{ ...styles.card, marginBottom: 16, background: "linear-gradient(135deg, " + C.navy + "08, " + C.purple + "08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: C.grayD, marginBottom: 4 }}>Total por mês</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>{fmt(totalMensal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.grayD, marginBottom: 4 }}>Parcelas ativas</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.purple }}>{parceladosAtivos.length}</div>
              </div>
            </div>
          </div>
          
          {Object.entries(porCartao).map(([cartao, items]) => (
            <div key={cartao} style={{ ...styles.card, marginBottom: 16 }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "2px solid " + C.border
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.navy + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-credit-card" style={{ fontSize: 20, color: C.navy }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>{cartao}</div>
                    <div style={{ fontSize: 11, color: C.grayD }}>{items.length} parcela(s)</div>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>
                  {fmt(items.reduce((s, l) => s + Number(l.valor), 0))}
                  <span style={{ fontSize: 11, fontWeight: 400, color: C.grayD, marginLeft: 4 }}>/mês</span>
                </div>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid " + C.border, background: C.slate }}>
                      <th style={{ textAlign: "left", padding: "10px", fontWeight: 600, color: C.grayD }}>Descrição</th>
                      <th style={{ textAlign: "center", padding: "10px", fontWeight: 600, color: C.grayD }}>Parcela</th>
                      <th style={{ textAlign: "left", padding: "10px", fontWeight: 600, color: C.grayD }}>Progresso</th>
                      <th style={{ textAlign: "right", padding: "10px", fontWeight: 600, color: C.grayD }}>Valor</th>
                      <th style={{ textAlign: "right", padding: "10px", fontWeight: 600, color: C.grayD }}>Restante</th>
                      <th style={{ textAlign: "center", padding: "10px", fontWeight: 600, color: C.grayD }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((l, idx) => {
                      const pa = l.parcela_atual || 1;
                      const pt = l.parcelas || 1;
                      const pct = (pa / pt) * 100;
                      const rest = (pt - pa) * Number(l.valor);
                      const concluida = pa >= pt;
                      
                      return (
                        <tr key={l.id} style={{ 
                          borderBottom: idx === items.length - 1 ? "none" : "1px solid " + C.border,
                          opacity: concluida ? 0.6 : 1,
                          background: concluida ? C.green + "08" : "transparent"
                        }}>
                          <td style={{ padding: "12px 10px", fontWeight: 500 }}>
                            {l.descricao}
                            {concluida && (
                              <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", borderRadius: 99, background: C.green + "20", color: C.green }}>
                                Concluída
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 600, color: C.navy }}>{pa}/{pt}</td>
                          <td style={{ padding: "12px 10px", minWidth: 150 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1 }}><Bar pct={pct} color={concluida ? C.green : C.purple} /></div>
                              <span style={{ fontSize: 11, fontWeight: 500, minWidth: 45, color: concluida ? C.green : C.purple }}>{Math.round(pct)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 600, color: C.red }}>{fmt(l.valor)}</td>
                          <td style={{ padding: "12px 10px", textAlign: "right", color: concluida ? C.green : C.grayD }}>
                            {concluida ? "✓ Pago" : `${fmt(rest)} (${pt - pa}x)`}
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                            {!concluida && (
                              <button onClick={() => marcarParcelaPaga(l, pa, pt)} style={styles.buttonIcon} title="Marcar como paga">
                                <i className="ti ti-check" style={{ fontSize: 16, color: C.green }} />
                              </button>
                            )}
                            <button onClick={() => removerParcelamento(l.id)} style={styles.buttonIcon} title="Remover">
                              <i className="ti ti-trash" style={{ fontSize: 16, color: C.red }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
      
      {showImportModal && (
        <ImportFaturaModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={() => {
            onLancamentosUpdate();
            toast("📥 Lançamentos importados com sucesso!");
          }}
          token={token}
          uid={session?.user?.id}
        />
      )}
    </div>
  );
}

export default CartaoScreen;
