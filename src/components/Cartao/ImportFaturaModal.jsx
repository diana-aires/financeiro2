import { useState, useMemo } from 'react';
import { C, styles } from '../../styles/theme';
import { extractDataFromPDF, buildFaturaLabel } from '../../services/pdfService';
import sb from '../../services/supabase';
import { fmt } from '../../utils/formatters';

/**
 * ImportFaturaModal
 *
 * Props:
 *  - isOpen, onClose, onImport
 *  - token, uid
 *  - mesAnoAtivo: "2026-06"  — período selecionado
 *    O vencimento da fatura é sobrescrito para este mês,
 *    garantindo que a fatura apareça no filtro correto.
 */
export function ImportFaturaModal({ isOpen, onClose, onImport, token, uid, mesAnoAtivo }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [fatura, setFatura]     = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [processing, setProcessing] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f?.type === 'application/pdf') {
      setFile(f); setFatura(null); setSelecionados(new Set());
    } else {
      alert('Selecione um arquivo PDF válido.');
      e.target.value = '';
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      let resultado = await extractDataFromPDF(file);

      // Ajustar mês da fatura ao período selecionado pelo usuário
      if (mesAnoAtivo && !resultado.vencimento.startsWith(mesAnoAtivo)) {
        const [ano, mes] = mesAnoAtivo.split('-');
        const diaVenc = resultado.vencimento.slice(8, 10);
        const novoVenc = `${ano}-${mes}-${diaVenc}`;
        const novaLabel = buildFaturaLabel(resultado.cartao, novoVenc);
        resultado = {
          ...resultado,
          vencimento: novoVenc,
          faturaLabel: novaLabel,
          lancamentos: resultado.lancamentos.map(l => ({
            ...l,
            data_vencimento: novoVenc,
            observacao: l.parcelas
              ? `${novaLabel} — parcela ${l.parcela_atual}/${l.parcelas}`
              : novaLabel,
          })),
        };
      }

      setFatura(resultado);
      setSelecionados(new Set(resultado.lancamentos.map((_, i) => i)));
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      alert('Erro ao processar o PDF. Verifique se é uma fatura de cartão válida.');
    }
    setLoading(false);
  };

  const checkDuplicate = async (l) => {
    try {
      const slug = encodeURIComponent(l.descricao.slice(0, 20));
      const q = l.parcelas
        ? `/lancamentos?user_id=eq.${uid}&descricao=ilike.*${slug}*&parcela_atual=eq.${l.parcela_atual}&parcelas=eq.${l.parcelas}&valor=eq.${l.valor}&select=id`
        : `/lancamentos?user_id=eq.${uid}&data_compra=eq.${l.data_compra}&descricao=ilike.*${slug}*&valor=eq.${l.valor}&select=id`;
      const ex = await sb(q, { token });
      return Array.isArray(ex) && ex.length > 0;
    } catch { return false; }
  };

  const handleImport = async () => {
    if (!fatura) return;
    const itens = fatura.lancamentos.filter((_, i) => selecionados.has(i));
    if (!itens.length) return;
    setProcessing(true);
    let novos = 0, duplicados = 0, erros = 0;
    for (const l of itens) {
      try {
        if (await checkDuplicate(l)) { duplicados++; continue; }
        await sb("/lancamentos", { method: "POST", token, body: { ...l, user_id: uid } });
        novos++;
      } catch { erros++; }
    }
    alert(`Importação concluída!\n✅ Novos: ${novos}\n⚠️ Duplicados ignorados: ${duplicados}\n❌ Erros: ${erros}`);
    if (novos > 0) onImport();
    setProcessing(false);
    onClose();
  };

  const toggleItem = (i) => setSelecionados(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  const toggleTodos = () => setSelecionados(prev =>
    prev.size === fatura?.lancamentos.length
      ? new Set()
      : new Set(fatura.lancamentos.map((_, i) => i))
  );

  const jsonPreview = useMemo(() => {
    if (!fatura) return '';
    return JSON.stringify({
      fatura: fatura.faturaLabel,
      vencimento: fatura.vencimento,
      cartao: fatura.cartao,
      total: parseFloat(fatura.totalFatura.toFixed(2)),
      quantidade: fatura.lancamentos.length,
      lancamentos: fatura.lancamentos.map(l => ({
        data_compra: l.data_compra,
        data_vencimento: l.data_vencimento,
        descricao: l.descricao,
        categoria: l.cat,
        valor: l.valor,
        cartao: l.cartao,
        ...(l.parcelas ? { parcela_atual: l.parcela_atual, parcelas: l.parcelas } : {}),
        observacao: l.observacao,
      })),
    }, null, 2);
  }, [fatura]);

  const parcelados = fatura?.lancamentos.filter(l => l.parcelas) || [];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 860, width: '96%', maxHeight: '93vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid ' + C.border, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, margin: '0 0 3px' }}>
                Importar Fatura PDF
              </h3>
              <div style={{ fontSize: 11, color: C.grayD }}>
                Será registrada no período <strong>{mesAnoAtivo}</strong> •
                Parcelamentos (N/T) identificados automaticamente
              </div>
            </div>
            <button onClick={onClose} style={styles.buttonIcon}>
              <i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

          {/* Seleção de arquivo */}
          {!fatura && !loading && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Arquivo PDF da fatura</label>
                <input type="file" accept=".pdf" onChange={handleFileChange}
                  style={{ ...styles.input, padding: '9px' }} />
              </div>
              {file && (
                <button onClick={handlePreview} style={{ ...styles.buttonPrimary, gap: 6 }}>
                  <i className="ti ti-eye" style={{ fontSize: 14 }} /> Visualizar fatura
                </button>
              )}
            </>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: C.grayD }}>
              <i className="ti ti-loader-2" style={{ fontSize: 36, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Lendo PDF e identificando parcelamentos...</div>
            </div>
          )}

          {fatura && !processing && (
            <>
              {/* Cabeçalho da fatura */}
              <div style={{ ...styles.card, marginBottom: 14, background: `linear-gradient(135deg,${C.navy}08,${C.purple}06)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.navy, marginBottom: 6 }}>
                      {fatura.faturaLabel}
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {[
                        { icon: 'ti-credit-card', label: fatura.cartao },
                        { icon: 'ti-calendar-due', label: `Vence ${formatBR(fatura.vencimento)}` },
                        { icon: 'ti-list-numbers', label: `${fatura.lancamentos.length} itens` },
                        { icon: 'ti-layers-subtract', label: `${parcelados.length} parcelamentos` },
                      ].map(k => (
                        <span key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.grayD }}>
                          <i className={'ti ' + k.icon} style={{ fontSize: 13, color: C.navy }} />
                          {k.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.grayD }}>Total</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>{fmt(fatura.totalFatura)}</div>
                  </div>
                </div>
              </div>

              {/* Tabs visualização */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', background: C.slate, borderRadius: 8, border: '1px solid ' + C.border, overflow: 'hidden' }}>
                  {[
                    { id: 'table', label: 'Tabela',  icon: 'ti-table' },
                    { id: 'json',  label: 'JSON',    icon: 'ti-code' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setViewMode(tab.id)}
                      style={{
                        padding: '6px 14px', border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: viewMode === tab.id ? 600 : 400,
                        background: viewMode === tab.id ? C.navy : 'transparent',
                        color: viewMode === tab.id ? '#fff' : C.grayD,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <i className={'ti ' + tab.icon} style={{ fontSize: 12 }} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {viewMode === 'table' && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={toggleTodos}
                      style={{ ...styles.buttonPrimary, background: C.grayD, fontSize: 11, padding: '5px 12px' }}>
                      {selecionados.size === fatura.lancamentos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <span style={{ fontSize: 11, color: C.grayD }}>{selecionados.size} selecionados</span>
                  </div>
                )}
              </div>

              {/* JSON */}
              {viewMode === 'json' && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => navigator.clipboard?.writeText(jsonPreview)}
                    style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, ...styles.buttonPrimary, background: '#475569', fontSize: 10, padding: '4px 10px', gap: 4 }}
                  >
                    <i className="ti ti-copy" style={{ fontSize: 11 }} /> Copiar
                  </button>
                  <pre style={{
                    background: '#0f172a', color: '#94a3b8', borderRadius: 10,
                    padding: '14px 16px', fontSize: 11, lineHeight: 1.7,
                    overflowX: 'auto', overflowY: 'auto', maxHeight: 500,
                    fontFamily: 'monospace', margin: 0,
                  }}>
                    {/* Syntax highlight mínimo via spans */}
                    {jsonPreview.split('\n').map((line, i) => {
                      const isKey = /"[\w_]+":/;
                      const isStr = /:\s*"[^"]*"/;
                      const isNum = /:\s*[\d.]+/;
                      return (
                        <span key={i} style={{ display: 'block' }}>
                          {line
                            .replace(/"([\w_]+)":/g, (_, k) => `\x01${k}\x02:`)
                            .split('\x01').map((part, j) => {
                              if (j === 0) return <span key={j}>{part}</span>;
                              const [key, rest] = part.split('\x02');
                              return <span key={j}><span style={{ color: '#7dd3fc' }}>{`"${key}"`}</span>{rest}</span>;
                            })
                          }
                        </span>
                      );
                    })}
                  </pre>
                </div>
              )}

              {/* Tabela */}
              {viewMode === 'table' && (
                <div style={{ border: '1px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: C.slate, borderBottom: '2px solid ' + C.border }}>
                        <th style={{ width: 28, padding: '8px' }} />
                        <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Data compra</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Descrição</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: C.grayD, fontWeight: 600 }}>Parcela</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Categoria</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: C.grayD, fontWeight: 600 }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fatura.lancamentos.map((l, i) => {
                        const sel = selecionados.has(i);
                        const isParc = !!l.parcelas;
                        return (
                          <tr key={i} onClick={() => toggleItem(i)}
                            style={{
                              borderBottom: i < fatura.lancamentos.length - 1 ? '1px solid ' + C.border : 'none',
                              background: !sel ? '#fff' : isParc ? C.purple + '09' : '#f0fdf4',
                              cursor: 'pointer', opacity: sel ? 1 : 0.38, transition: 'opacity .1s',
                            }}
                          >
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <div style={{
                                width: 15, height: 15, borderRadius: 4, display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center',
                                border: '2px solid ' + (sel ? C.navy : C.border),
                                background: sel ? C.navy : '#fff',
                              }}>
                                {sel && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }} />}
                              </div>
                            </td>
                            <td style={{ padding: '8px', color: C.grayD, whiteSpace: 'nowrap' }}>{formatBR(l.data_compra)}</td>
                            <td style={{ padding: '8px', fontWeight: 500, maxWidth: 250 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao}</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {isParc
                                ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: C.purple + '18', color: C.purple }}>{l.parcela_atual}/{l.parcelas}</span>
                                : <span style={{ color: C.gray }}>—</span>
                              }
                            </td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: C.navy + '12', color: C.navy }}>{l.cat}</span>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: C.red, whiteSpace: 'nowrap' }}>
                              {fmt(l.valor)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid ' + C.border, background: C.slate }}>
                        <td colSpan={5} style={{ padding: '8px', fontWeight: 600, fontSize: 12 }}>
                          Total ({fatura.lancamentos.length} itens · {selecionados.size} selecionados)
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: C.red }}>
                          {fmt(fatura.totalFatura)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {parcelados.length > 0 && (
                <div style={{ marginTop: 10, padding: '9px 13px', background: C.purple + '0e', border: '1px solid ' + C.purple + '28', borderRadius: 8, fontSize: 11, color: '#5b21b6' }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
                  <strong>{parcelados.length} parcelamento(s)</strong> detectados — importados como lançamentos normais,
                  com controle de parcelas disponível na aba Faturas.
                </div>
              )}
            </>
          )}

          {processing && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: C.grayD }}>
              <i className="ti ti-loader-2" style={{ fontSize: 36, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
              <div>Importando {selecionados.size} lançamentos...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {fatura && !processing && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => { setFatura(null); setFile(null); setSelecionados(new Set()); }}
              style={{ ...styles.buttonPrimary, background: C.grayD, fontSize: 11, gap: 5 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 12 }} /> Trocar arquivo
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...styles.buttonPrimary, background: C.grayD }}>Cancelar</button>
              <button onClick={handleImport} disabled={selecionados.size === 0}
                style={{ ...styles.buttonSuccess, opacity: selecionados.size === 0 ? 0.5 : 1, gap: 6 }}>
                <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
                Importar {selecionados.size} lançamento(s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
