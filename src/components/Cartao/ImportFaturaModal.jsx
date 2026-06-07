import { useState } from 'react';
import { C, styles } from '../../styles/theme';
import { extractDataFromPDF } from '../../services/pdfService';
import { sb } from '../../services/supabase';
import { fmt } from '../../utils/formatters';

export function ImportFaturaModal({ isOpen, onClose, onImport, token, uid }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPreview([]);
    } else {
      alert('Por favor, selecione um arquivo PDF válido.');
      e.target.value = '';
    }
  };
  
  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const transactions = await extractDataFromPDF(file);
      setPreview(transactions);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      alert('Erro ao processar o PDF. Verifique se o arquivo é uma fatura válida.');
    }
    setLoading(false);
  };
  
  const checkDuplicate = async (transaction) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];
    
    const existing = await sb(`/lancamentos?data_compra=gte.${fiveDaysAgoStr}&descricao=ilike.*${encodeURIComponent(transaction.descricao.substring(0, 30))}*&valor=eq.${transaction.valor}&select=id`, { token });
    
    return Array.isArray(existing) && existing.length > 0;
  };
  
  const handleImport = async () => {
    if (preview.length === 0) return;
    setProcessing(true);
    
    let novos = 0;
    let duplicados = 0;
    let erros = 0;
    
    for (const transaction of preview) {
      try {
        const isDuplicate = await checkDuplicate(transaction);
        
        if (!isDuplicate) {
          const obj = {
            ...transaction,
            user_id: uid
          };
          
          const result = await sb("/lancamentos", { method: "POST", token, body: obj });
          if (result && (result.id || result.success !== false)) {
            novos++;
          } else {
            erros++;
          }
        } else {
          duplicados++;
        }
      } catch (error) {
        console.error('Erro ao salvar transação:', error);
        erros++;
      }
    }
    
    alert(`Importação concluída!\n✅ Novos: ${novos}\n⚠️ Duplicados: ${duplicados}\n❌ Erros: ${erros}`);
    
    if (novos > 0) {
      onImport();
    }
    
    setProcessing(false);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, width: '90%' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.navy, margin: 0 }}>Importar Fatura em PDF</h3>
            <button onClick={onClose} style={styles.buttonIcon}>
              <i className="ti ti-x" style={{ fontSize: 20, color: C.grayD }} />
            </button>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Selecione o arquivo PDF da fatura</label>
            <input type="file" accept=".pdf" onChange={handleFileChange} style={{ ...styles.input, padding: '10px' }} />
            <div style={{ fontSize: 11, color: C.grayD, marginTop: 5 }}>
              Suporta faturas de cartão de crédito em formato PDF
            </div>
          </div>
          
          {file && !loading && preview.length === 0 && (
            <button onClick={handlePreview} style={styles.buttonPrimary}>
              <i className="ti ti-eye" /> Visualizar transações
            </button>
          )}
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 32 }} />
              <div style={{ marginTop: 10, fontSize: 13, color: C.grayD }}>Processando PDF...</div>
            </div>
          )}
          
          {preview.length > 0 && !processing && (
            <>
              <div style={{ marginBottom: 15 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Prévia das transações encontradas:</div>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: C.white }}>
                      <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        <th style={{ padding: 8, textAlign: 'left' }}>Data</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Descrição</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Valor</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((trans, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: 8 }}>{trans.data_compra.split('-').reverse().join('/')}</td>
                          <td style={{ padding: 8 }}>{trans.descricao}</td>
                          <td style={{ padding: 8, textAlign: 'right', color: C.red }}>{fmt(trans.valor)}</td>
                          <td style={{ padding: 8 }}>{trans.cat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ ...styles.buttonPrimary, background: C.grayD }}>Cancelar</button>
                <button onClick={handleImport} style={styles.buttonSuccess}>
                  <i className="ti ti-device-floppy" /> Importar {preview.length} transações
                </button>
              </div>
            </>
          )}
          
          {processing && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 32 }} />
              <div style={{ marginTop: 10, fontSize: 13, color: C.grayD }}>Importando transações...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
