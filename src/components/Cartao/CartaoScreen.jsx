import { useState, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import { fmt, formatDate } from '../../utils/formatters';
import { Bar } from '../Common/Bar';
import { ImportFaturaModal } from './ImportFaturaModal';
import sb from '../../services/supabase';
import { MESES_PT } from '../../hooks/usePeriodo';

export function FaturasScreen({ lancamentos, lancFiltrados, periodoProps, token, session, toast, onLancamentosUpdate }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [mesParcelasAberto, setMesParcelasAberto] = useState(null);

  const { mesAno, labelAtual } = periodoProps;

  // Faturas do período (por observacao)
  const lancFatura = useMemo(() =>
    lancFiltrados.filter(l => l.observacao && l.observacao.startsWith('Fatura')),
  [lancFiltrados]);

  const faturasPeriodo = useMemo(() => {
    const grupos = {};
    for (const l of lancFatura) {
      const key = l.observacao;
      if (!grupos[key]) grupos[key] = { label: key, cartao: l.cartao, vencimento: l.data_vencimento, itens: [] };
      grupos[key].itens.push(l);
    }
    return Object.values(grupos);
  }, [lancFatura]);

  // Parcelamentos ativos (todos os meses)
  const todosParcelados = useMemo(() =>
    lancamentos.filter(l => l.parcelas && l.parcelas > 0),
  [lancamentos]);

  const mesesComParcela = useMemo(() => {
    const set = new Set(
      todosParcelados.map(l => (l.data_vencimento || l.data_compra || '').slice(0, 7)).filter(Boolean)
    );
    return [...set].sort().reverse().map(v => {
      const [ano, mes] = v.split('-');
      return { valor: v, label: `${MESES_PT[parseInt(mes) - 1]}/${ano}` };
    });
  }, [todosParcelados]);

  const parcelasMesAberto = useMemo(() =>
    !mesParcelasAberto ? [] :
      todosParcelados.filter(l => (l.data_vencimento || '').startsWith(mesParcelasAberto)),
  [todosParcelados, mesParcelasAberto]);

  const porCartaoMes = useMemo(() =>
    parcelasMesAberto.reduce((acc, l) => {
      const c = l.cartao || 'Sem cartão';
      if (!acc[c]) acc[c] = [];
      acc[c].push(l);
      return acc;
    }, {}),
  [parcelasMesAberto]);

  const marcarPaga = async (l) => {
    const pa = l.parcela_atual || 1, pt = l.parcelas;
    if (pa >= pt) { toast('Parcela já concluída!'); return; }
    try {
      await sb("/lancamentos?id=eq." + l.id, { method: "PATCH", token, body: { parcela_atual: pa + 1 } });
      onLancamentosUpdate();
      toast(`✅ Parcela ${pa}/${pt} paga!`);
    } catch { toast("❌ Erro ao atualizar"); }
  };

  const remover = (id) => {
    if (!window.confirm('Remover este lançamento?')) return;
    sb("/lancamentos?id=eq." + id, { method: "DELETE", token })
      .then(() => { onLancamentosUpdate(); toast("Removido."); })
      .catch(() => toast("Erro ao remover"));
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>

      {/* Header */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: C.navy }}>Faturas — {labelAtual}</div>
            <div style={{ fontSize: 12, color: C.grayD }}>
              {faturasPeriodo.length > 0
                ? `${faturasPeriodo.length} fatura(s) · ${lancFatura.length} lançamentos`
                : 'Nenhuma fatura importada neste período'}
            </div>
          </div>
          <button onClick={() => setShowImportModal(true)}
            style={{ ...styles.buttonPrimary, background: C.purple, gap: 6 }}>
            <i className="ti ti-file-import" style={{ fontSize: 14 }} />
            Importar Fatura PDF
          </button>
        </div>
      </div>

      {/* ── Faturas do período ── */}
      {faturasPeriodo.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '2.5rem', color: C.grayD, marginBottom: 24 }}>
          <i className="ti ti-file-invoice" style={{ fontSize: 42, display: 'block', marginBottom: 10, opacity: 0.35 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Nenhuma fatura em {labelAtual}</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Importe um PDF ou mude o período</div>
        </div>
      ) : (
        faturasPeriodo.map(f => (
          <FaturaGrupo key={f.label} fatura={f} onRemover={remover} />
        ))
      )}

      {/* ── Controle de parcelamentos ── */}
      {todosParcelados.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-layers-subtract" style={{ fontSize: 15 }} />
            Controle de Parcelamentos
            <span style={{ fontSize: 11, fontWeight: 400, color: C.grayD }}>({todosParcelados.length} ativas)</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {mesesComParcela.map(m => {
              const ativo = mesParcelasAberto === m.valor;
              const qtd = todosParcelados.filter(l => (l.data_vencimento || '').startsWith(m.valor)).length;
              return (
                <button key={m.valor}
                  onClick={() => setMesParcelasAberto(p => p === m.valor ? null : m.valor)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 13px', borderRadius: 20,
                    border: '1.5px solid ' + (ativo ? C.navy : C.border),
                    background: ativo ? C.navy : '#fff',
                    color: ativo ? '#fff' : C.navy,
                    fontSize: 12, fontWeight: ativo ? 700 : 500,
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                  <i className="ti ti-calendar" style={{ fontSize: 12 }} />
                  {m.label}
                  <span style={{ background: ativo ? 'rgba(255,255,255,.25)' : C.navy + '18', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{qtd}</span>
                  <i className={'ti ' + (ativo ? 'ti-chevron-up' : 'ti-chevron-down')} style={{ fontSize: 10 }} />
                </button>
              );
            })}
          </div>

          {mesParcelasAberto && (
            <div style={{ animation: 'fadeUp .3s ease' }}>
              <div style={{ ...styles.card, marginBottom: 12, background: `linear-gradient(135deg,${C.navy}06,${C.purple}06)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>
                      {mesesComParcela.find(m => m.valor === mesParcelasAberto)?.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.grayD }}>{parcelasMesAberto.length} parcela(s)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.grayD }}>Total/mês</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.red }}>
                      {fmt(parcelasMesAberto.reduce((s, l) => s + Number(l.valor), 0))}
                    </div>
                  </div>
                </div>
              </div>

              {Object.entries(porCartaoMes).map(([cartao, items]) => (
                <ParcelaGrupo key={cartao} cartao={cartao} items={items}
                  onMarcarPaga={marcarPaga} onRemover={remover} />
              ))}
            </div>
          )}
        </div>
      )}

      {showImportModal && (
        <ImportFaturaModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={() => { onLancamentosUpdate(); toast("📥 Fatura importada!"); }}
          token={token}
          uid={session?.user?.id}
          mesAnoAtivo={mesAno}
        />
      )}
    </div>
  );
}

function FaturaGrupo({ fatura, onRemover }) {
  const [expandida, setExpandida] = useState(true);
  const total = fatura.itens.reduce((s, l) => s + Number(l.valor), 0);
  return (
    <div style={{ ...styles.card, marginBottom: 14 }}>
      <div onClick={() => setExpandida(p => !p)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expandida ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.navy + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-file-invoice" style={{ fontSize: 17, color: C.navy }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{fatura.label}</div>
            <div style={{ fontSize: 11, color: C.grayD }}>
              {fatura.cartao} · {fatura.itens.length} lançamentos · Vence {formatDate(fatura.vencimento)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.grayD }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>{fmt(total)}</div>
          </div>
          <i className={'ti ' + (expandida ? 'ti-chevron-up' : 'ti-chevron-down')} style={{ fontSize: 14, color: C.grayD }} />
        </div>
      </div>

      {expandida && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid ' + C.border, background: C.slate }}>
                {['Data compra','Descrição','Categoria','Valor',''].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: h === 'Valor' ? 'right' : 'left', fontWeight: 600, color: C.grayD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fatura.itens.map(l => (
                <tr key={l.id} className="row-hover" style={{ borderBottom: '1px solid ' + C.border }}>
                  <td style={{ padding: 8, color: C.grayD, whiteSpace: 'nowrap' }}>{formatDate(l.data_compra)}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>
                    {l.descricao}
                    {l.parcelas && (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: C.purple + '18', color: C.purple }}>
                        {l.parcela_atual}/{l.parcelas}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: C.navy + '10', color: C.navy }}>{l.cat}</span>
                  </td>
                  <td style={{ padding: 8, fontWeight: 700, color: C.red, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.valor)}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <button onClick={() => onRemover(l.id)} style={styles.buttonIcon} title="Remover">
                      <i className="ti ti-trash" style={{ fontSize: 12, color: C.red }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid ' + C.border, background: C.slate }}>
                <td colSpan={3} style={{ padding: 8, fontWeight: 600, fontSize: 12 }}>Total</td>
                <td style={{ padding: 8, fontWeight: 700, textAlign: 'right', color: C.red }}>{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function ParcelaGrupo({ cartao, items, onMarcarPaga, onRemover }) {
  const total = items.reduce((s, l) => s + Number(l.valor), 0);
  return (
    <div style={{ ...styles.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid ' + C.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.navy + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-credit-card" style={{ fontSize: 16, color: C.navy }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{cartao}</div>
            <div style={{ fontSize: 11, color: C.grayD }}>{items.length} parcela(s)</div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>{fmt(total)}<span style={{ fontSize: 11, color: C.grayD }}>/mês</span></div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid ' + C.border, background: C.slate }}>
              {['Descrição','Parcela','Progresso','Valor/mês','Restante','Ações'].map(h => (
                <th key={h} style={{ padding: '8px', textAlign: ['Valor/mês','Restante'].includes(h) ? 'right' : h === 'Ações' ? 'center' : 'left', fontWeight: 600, color: C.grayD }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((l, idx) => {
              const pa = l.parcela_atual || 1, pt = l.parcelas || 1;
              const pct = (pa / pt) * 100;
              const rest = Math.max(0, pt - pa) * Number(l.valor);
              const concluida = pa >= pt;
              return (
                <tr key={l.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid ' + C.border : 'none', opacity: concluida ? 0.6 : 1, background: concluida ? C.green + '08' : 'transparent' }}>
                  <td style={{ padding: '10px', fontWeight: 500 }}>
                    {l.descricao}
                    {concluida && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: C.green + '20', color: C.green }}>Concluída</span>}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: C.navy }}>{pa}/{pt}</td>
                  <td style={{ padding: '10px', minWidth: 130 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}><Bar pct={pct} color={concluida ? C.green : C.purple} /></div>
                      <span style={{ fontSize: 11, fontWeight: 600, minWidth: 36, color: concluida ? C.green : C.purple }}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: C.red, textAlign: 'right' }}>{fmt(l.valor)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: concluida ? C.green : C.grayD }}>
                    {concluida ? '✓ Pago' : `${fmt(rest)} (${pt - pa}x)`}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {!concluida && (
                      <button onClick={() => onMarcarPaga(l)} style={styles.buttonIcon} title="Marcar como paga">
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

export default FaturasScreen;
