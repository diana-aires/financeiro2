import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { extractDataFromPDF } from '../../services/pdfService';
import sb from '../../services/supabase';
import { fmt } from '../../utils/formatters';

export function ImportFaturaModal({ isOpen, onClose, onImport, token, uid }) {
  const [file, setFile]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [preview, setPreview]     = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f?.type === 'application/pdf') {
      setFile(f);
      setPreview([]);
      setSelecionados(new Set());
    } else {
      alert('Selecione um arquivo PDF válido.');
      e.target.value = '';
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const transactions = await extractDataFromPDF(file);
      setPreview(transactions);
      setSelecionados(new Set(transactions.map((_, i) => i)));
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      alert('Erro ao processar o PDF. Verifique se é uma fatura de cartão válida.');
    }
    setLoading(false);
  };

  /**
   * Verifica duplicata conforme o padrão real do banco:
   *
   * Parcelado: mesma descrição (parcial) + parcela_atual + parcelas + valor
   * Simples:   mesma descrição (parcial) + data_compra + valor
   */
  const checkDuplicate = async (t) => {
    try {
      const descSlug = encodeURIComponent(t.descricao.slice(0, 20));
      let query;
      if (t.parcelas) {
        query = `/lancamentos?user_id=eq.${uid}`
          + `&descricao=ilike.*${descSlug}*`
          + `&parcela_atual=eq.${t.parcela_atual}`
          + `&parcelas=eq.${t.parcelas}`
          + `&valor=eq.${t.valor}`
          + `&select=id`;
      } else {
        query = `/lancamentos?user_id=eq.${uid}`
          + `&data_compra=eq.${t.data_compra}`
          + `&descricao=ilike.*${descSlug}*`
          + `&valor=eq.${t.valor}`
          + `&select=id`;
      }
      const existing = await sb(query, { token });
      return Array.isArray(existing) && existing.length > 0;
    } catch {
      return false;
    }
  };

  const handleImport = async () => {
    const itens = preview.filter((_, i) => selecionados.has(i));
    if (itens.length === 0) return;
    setProcessing(true);

    let novos = 0, duplicados = 0, erros = 0;

    for (const t of itens) {
      try {
        const isDup = await checkDuplicate(t);
        if (isDup) { duplicados++; continue; }
        await sb("/lancamentos", { method: "POST", token, body: { ...t, user_id: uid } });
        novos++;
      } catch (err) {
        console.error('Erro ao salvar:', err);
        erros++;
      }
    }

    alert(`Importação concluída!\n✅ Novos: ${novos}\n⚠️ Duplicados ignorados: ${duplicados}\n❌ Erros: ${erros}`);
    if (novos > 0) onImport();
    setProcessing(false);
    onClose();
  };

  const toggleItem = (i) => setSelecionados(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const toggleTodos = () => setSelecionados(prev =>
    prev.size === preview.length ? new Set() : new Set(preview.map((_, i) => i))
  );

  if (!isOpen) return null;

  const parcelados = preview.filter(t => t.parcelas);
  const simples    = preview.filter(t => !t.parcelas);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 820, width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid ' + C.border, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, margin: '0 0 4px' }}>
                Importar Fatura em PDF
              </h3>
              <div style={{ fontSize: 11, color: C.grayD }}>
                Parcelamentos identificados automaticamente pelo padrão <strong>N/T</strong> na fatura
              </div>
            </div>
            <button onClick={onClose} style={styles.buttonIcon}>
              <i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} />
            </button>
          </div>

          {/* Legenda de datas */}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: 'ti-calendar', color: C.navy, text: 'Data compra = data da transação na fatura' },
              { icon: 'ti-calendar-due', color: C.purple, text: 'Parcelado: vencimento = data da última parcela' },
              { icon: 'ti-calendar-check', color: C.green, text: 'Simples: vencimento = data da fatura' },
            ].map(k => (
              <div key={k.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.grayD }}>
                <i className={'ti ' + k.icon} style={{ fontSize: 13, color: k.color }} />
                {k.text}
              </div>
            ))}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

          {/* Seleção de arquivo */}
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Arquivo PDF da fatura</label>
            <input type="file" accept=".pdf" onChange={handleFileChange}
              style={{ ...styles.input, padding: '9px' }} />
          </div>

          {file && !loading && preview.length === 0 && (
            <button onClick={handlePreview} style={{ ...styles.buttonPrimary, gap: 6 }}>
              <i className="ti ti-eye" style={{ fontSize: 14 }} />
              Visualizar transações
            </button>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: C.grayD }}>
              <i className="ti ti-loader-2" style={{ fontSize: 36, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Analisando PDF e identificando parcelamentos...</div>
            </div>
          )}

          {preview.length > 0 && !processing && (
            <>
              {/* Resumo */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Encontrados', value: preview.length, color: C.navy },
                  { label: 'Parcelamentos', value: parcelados.length, color: C.purple },
                  { label: 'Compras simples', value: simples.length, color: C.green },
                  { label: 'Selecionados', value: selecionados.size, color: C.amber },
                ].map(k => (
                  <div key={k.label} style={{ flex: 1, minWidth: 100, padding: '10px 12px', background: k.color + '10', border: '1px solid ' + k.color + '28', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: C.grayD, fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Nota parcelamentos */}
              {parcelados.length > 0 && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: C.purple + '0e', border: '1px solid ' + C.purple + '30', borderRadius: 8, fontSize: 12, color: '#5b21b6' }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
                  <strong>{parcelados.length} parcelamento(s) detectado(s).</strong>{' '}
                  A <em>data de compra</em> é o dia em que esta parcela aparece na fatura.
                  A <em>data de vencimento</em> é calculada como a data da <strong>última parcela</strong>{' '}
                  (vencimento da fatura + parcelas restantes em meses).
                </div>
              )}

              {/* Controles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <button onClick={toggleTodos} style={{ ...styles.buttonPrimary, background: C.grayD, fontSize: 11, padding: '5px 12px' }}>
                  {selecionados.size === preview.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                <span style={{ fontSize: 11, color: C.grayD }}>Clique na linha para (des)selecionar</span>
              </div>

              {/* Tabela de prévia */}
              <div style={{ border: '1px solid ' + C.border, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.slate, borderBottom: '2px solid ' + C.border }}>
                      <th style={{ width: 28, padding: '8px' }} />
                      <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Data compra</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Descrição</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: C.grayD, fontWeight: 600 }}>Parcela</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Categoria</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: C.grayD, fontWeight: 600 }}>Vencimento</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: C.grayD, fontWeight: 600 }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((t, i) => {
                      const sel = selecionados.has(i);
                      const isParc = !!t.parcelas;
                      return (
                        <tr
                          key={i}
                          onClick={() => toggleItem(i)}
                          style={{
                            borderBottom: i < preview.length - 1 ? '1px solid ' + C.border : 'none',
                            background: !sel ? '#fff' : isParc ? C.purple + '08' : C.green + '06',
                            cursor: 'pointer',
                            opacity: sel ? 1 : 0.4,
                            transition: 'opacity .1s',
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
                          <td style={{ padding: '8px', color: C.grayD, whiteSpace: 'nowrap' }}>
                            {formatBR(t.data_compra)}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 500, maxWidth: 220 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.descricao}
                            </div>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {isParc ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: C.purple + '18', color: C.purple }}>
                                {t.parcela_atual}/{t.parcelas}
                              </span>
                            ) : (
                              <span style={{ color: C.gray, fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: C.navy + '12', color: C.navy }}>
                              {t.cat}
                            </span>
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 11, color: isParc ? C.purple : C.grayD }}>
                              {formatBR(t.data_vencimento)}
                            </span>
                            {isParc && (
                              <span style={{ fontSize: 10, color: C.gray, marginLeft: 4 }}>
                                (últ. parcela)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: C.red, whiteSpace: 'nowrap' }}>
                            {fmt(t.valor)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {processing && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: C.grayD }}>
              <i className="ti ti-loader-2" style={{ fontSize: 36, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
              <div>Importando {selecionados.size} lançamento(s)...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview.length > 0 && !processing && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid ' + C.border, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={onClose} style={{ ...styles.buttonPrimary, background: C.grayD }}>
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={selecionados.size === 0}
              style={{ ...styles.buttonSuccess, opacity: selecionados.size === 0 ? 0.5 : 1, gap: 6 }}
            >
              <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
              Importar {selecionados.size} lançamento(s)
            </button>
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
