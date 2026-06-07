import { useState, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt, formatDate } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { ImportFaturaModal } from './ImportFaturaModal';
import sb from '../../services/supabase';
import { MESES_PT } from '../../hooks/usePeriodo';

/**
 * CartaoScreen
 *
 * Lógica de meses:
 *  - Agrupa TODOS os parcelamentos por mês de vencimento (data_vencimento)
 *  - Exibe pills com o nome do mês; o mês do período global vem selecionado por padrão
 *  - Clicar num mês expande/recolhe o painel de parcelas daquele mês
 *  - Dentro de cada mês, agrupa por cartão
 */
export function CartaoScreen({ lancamentos, periodoProps, token, session, cartoes, setCartoes, toast, onLancamentosUpdate }) {
  const [showImportModal, setShowImportModal] = useState(false);
  // Mês expandido — default: mês do período global
  const [mesAberto, setMesAberto] = useState(periodoProps?.mesAno || null);

  // Todos os lançamentos parcelados (independente de mês)
  const todosParcelados = useMemo(() =>
    lancamentos.filter(l => l.parcelas && l.parcelas > 0),
  [lancamentos]);

  // Meses que têm pelo menos 1 parcela, ordenados desc por data_vencimento
  const mesesComParcela = useMemo(() => {
    const mesSet = new Set(
      todosParcelados
        .map(l => (l.data_vencimento || l.data_compra || "").slice(0, 7))
        .filter(Boolean)
    );
    return [...mesSet].sort().reverse().map(v => {
      const [ano, mes] = v.split('-');
      return { valor: v, label: `${MESES_PT[parseInt(mes) - 1]}/${ano}` };
    });
  }, [todosParcelados]);

  // Parcelas do mês selecionado
  const parcelasMesAberto = useMemo(() => {
    if (!mesAberto) return [];
    return todosParcelados.filter(l =>
      (l.data_vencimento || l.data_compra || "").startsWith(mesAberto)
    );
  }, [todosParcelados, mesAberto]);

  // Agrupa parcelas do mês por cartão
  const porCartao = useMemo(() => {
    return parcelasMesAberto.reduce((acc, l) => {
      const c = l.cartao || "Sem cartão";
      if (!acc[c]) acc[c] = [];
      acc[c].push(l);
      return acc;
    }, {});
  }, [parcelasMesAberto]);

  const totalMesAberto = parcelasMesAberto.reduce((s, l) => s + Number(l.valor), 0);

  const marcarPaga = async (l) => {
    const pa = l.parcela_atual || 1;
    const pt = l.parcelas;
    if (pa >= pt) { toast("Parcela já concluída!"); return; }
    try {
      await sb("/lancamentos?id=eq." + l.id, { method: "PATCH", token, body: { parcela_atual: pa + 1 } });
      onLancamentosUpdate();
      toast(`✅ Parcela ${pa}/${pt} marcada como paga!`);
    } catch { toast("❌ Erro ao atualizar"); }
  };

  const remover = (id) => {
    if (!window.confirm("Remover este parcelamento?")) return;
    sb("/lancamentos?id=eq." + id, { method: "DELETE", token })
      .then(() => { onLancamentosUpdate(); toast("Removido."); })
      .catch(() => toast("Erro ao remover"));
  };

  function toggleMes(valor) {
    setMesAberto(prev => prev === valor ? null : valor);
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {/* Header */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Controle de Parcelamentos</div>
            <div style={{ fontSize: 12, color: C.grayD }}>
              {todosParcelados.length} parcela(s) ativas em {mesesComParcela.length} mês(es)
            </div>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            style={{ ...styles.buttonPrimary, background: C.purple, gap: 6 }}
          >
            <i className="ti ti-file-import" style={{ fontSize: 14 }} />
            Importar Fatura PDF
          </button>
        </div>
      </div>

      {todosParcelados.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "3rem", color: C.grayD }}>
          <i className="ti ti-credit-card" style={{ fontSize: 48, display: "block", marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Nenhuma parcela cadastrada</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Adicione compras parceladas em Lançamentos</div>
        </div>
      ) : (
        <>
          {/* Pills de meses */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.grayD, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Meses com parcelas
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {mesesComParcela.map(m => {
                const ativo = mesAberto === m.valor;
                const qtd = todosParcelados.filter(l =>
                  (l.data_vencimento || l.data_compra || "").startsWith(m.valor)
                ).length;
                return (
                  <button
                    key={m.valor}
                    onClick={() => toggleMes(m.valor)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      borderRadius: 20,
                      border: "1.5px solid " + (ativo ? C.navy : C.border),
                      background: ativo ? C.navy : "#fff",
                      color: ativo ? "#fff" : C.navy,
                      fontSize: 12,
                      fontWeight: ativo ? 700 : 500,
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <i className="ti ti-calendar" style={{ fontSize: 12 }} />
                    {m.label}
                    <span style={{
                      background: ativo ? "rgba(255,255,255,.25)" : C.navy + "18",
                      borderRadius: 99,
                      padding: "1px 7px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}>{qtd}</span>
                    <i className={"ti " + (ativo ? "ti-chevron-up" : "ti-chevron-down")} style={{ fontSize: 11, marginLeft: 2 }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel do mês selecionado */}
          {mesAberto && (
            <div style={{ animation: "fadeUp .3s ease" }}>
              {/* Resumo do mês */}
              <div style={{ ...styles.card, marginBottom: 12, background: `linear-gradient(135deg, ${C.navy}08, ${C.purple}08)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-calendar-month" style={{ fontSize: 18, color: C.navy }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>
                        {mesesComParcela.find(m => m.valor === mesAberto)?.label}
                      </div>
                      <div style={{ fontSize: 11, color: C.grayD }}>{parcelasMesAberto.length} parcela(s) neste mês</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.grayD }}>Total do mês</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>{fmt(totalMesAberto)}</div>
                  </div>
                </div>
              </div>

              {/* Grupos por cartão */}
              {Object.entries(porCartao).map(([cartao, items]) => (
                <CartaoGrupo
                  key={cartao}
                  cartao={cartao}
                  items={items}
                  onMarcarPaga={marcarPaga}
                  onRemover={remover}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showImportModal && (
        <ImportFaturaModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={() => { onLancamentosUpdate(); toast("📥 Lançamentos importados!"); }}
          token={token}
          uid={session?.user?.id}
        />
      )}
    </div>
  );
}

/* ─── Grupo de parcelas por cartão ─── */
function CartaoGrupo({ cartao, items, onMarcarPaga, onRemover }) {
  const totalCartao = items.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <div style={{ ...styles.card, marginBottom: 14 }}>
      {/* Header cartão */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "2px solid " + C.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.navy + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-credit-card" style={{ fontSize: 18, color: C.navy }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{cartao}</div>
            <div style={{ fontSize: 11, color: C.grayD }}>{items.length} parcela(s)</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.grayD, textAlign: "right" }}>Total/mês</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.navy }}>{fmt(totalCartao)}</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid " + C.border, background: C.slate }}>
              {["Descrição","Vencimento","Parcela","Progresso","Valor/mês","Restante","Ações"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Valor/mês" || h === "Restante" ? "right" : h === "Ações" ? "center" : "left", fontWeight: 600, color: C.grayD }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((l, idx) => {
              const pa = l.parcela_atual || 1;
              const pt = l.parcelas || 1;
              const pct = (pa / pt) * 100;
              const rest = Math.max(0, (pt - pa)) * Number(l.valor);
              const concluida = pa >= pt;

              return (
                <tr key={l.id} style={{
                  borderBottom: idx < items.length - 1 ? "1px solid " + C.border : "none",
                  opacity: concluida ? 0.65 : 1,
                  background: concluida ? C.green + "08" : "transparent"
                }}>
                  <td style={{ padding: "10px", fontWeight: 500 }}>
                    {l.descricao}
                    {concluida && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 99, background: C.green + "20", color: C.green }}>Concluída</span>}
                  </td>
                  <td style={{ padding: "10px", color: C.grayD, whiteSpace: "nowrap" }}>{formatDate(l.data_vencimento)}</td>
                  <td style={{ padding: "10px", fontWeight: 600, color: C.navy, whiteSpace: "nowrap" }}>{pa}/{pt}</td>
                  <td style={{ padding: "10px", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1 }}><Bar pct={pct} color={concluida ? C.green : C.purple} /></div>
                      <span style={{ fontSize: 11, fontWeight: 600, minWidth: 38, color: concluida ? C.green : C.purple }}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px", fontWeight: 600, color: C.red, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(l.valor)}</td>
                  <td style={{ padding: "10px", textAlign: "right", color: concluida ? C.green : C.grayD, whiteSpace: "nowrap" }}>
                    {concluida ? "✓ Pago" : `${fmt(rest)} (${pt - pa}x)`}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {!concluida && (
                      <button onClick={() => onMarcarPaga(l)} style={styles.buttonIcon} title="Marcar parcela como paga">
                        <i className="ti ti-check" style={{ fontSize: 15, color: C.green }} />
                      </button>
                    )}
                    <button onClick={() => onRemover(l.id)} style={styles.buttonIcon} title="Remover">
                      <i className="ti ti-trash" style={{ fontSize: 15, color: C.red }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CartaoScreen;
