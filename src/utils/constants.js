export const CATS_R = ["Salário CLT","Consultoria","Honorários","Comissão","Projeto","Curso/Treinamento","Prestação de Serviços","Outro"];
export const CATS_D = ["Aluguel","Energia","Internet","Assinaturas","Alimentação","Transporte","Viagem","Lazer","Compras","Investimento","Saúde","Beleza","Insumos","Doação","Empréstimo","Financiamento","Outro"];
export const METAS_DEF = [
  { nome:"Reserva de Emergência",valor:30000,atual:0,prazo:"Dez/2025" },
  { nome:"Viagem Internacional",valor:12000,atual:0,prazo:"Ago/2026" },
  { nome:"Investimentos Anuais",valor:24000,atual:0,prazo:"Dez/2025" },
];
export const CARTOES = ["Nubank","Inter","C6","Itaú","Bradesco","Santander","BB","Caixa","Outro"];
export const ICONES = ["ti-wallet","ti-home","ti-bolt","ti-wifi","ti-phone","ti-brand-spotify","ti-shopping-cart","ti-bus","ti-plane","ti-movie","ti-shopping-bag","ti-chart-line","ti-heart","ti-makeup","ti-package","ti-gift","ti-credit-card","ti-building-bank","ti-dots","ti-run","ti-school","ti-shield","ti-brand-netflix"];

export const BLANK_LANCAMENTO = {
  tipo:"receita", cat:CATS_R[0], descricao:"", valor:"",
  data_compra:"", data_vencimento:"", parcelas:"", parcela_atual:"", cartao:""
};
export const CATEGORIA_BLANK = { tipo:"despesa",nome:"",classificacao:"fixa",icone:"ti-tag",ativo:true };

// aba "cartao" renomeada para "faturas"
export const ABAS = [
  { id:"dashboard",   label:"Visão Geral",  icon:"ti-layout-dashboard" },
  { id:"lancamentos", label:"Lançamentos",  icon:"ti-list" },
  { id:"faturas",     label:"Faturas",      icon:"ti-file-invoice" },
  { id:"metas",       label:"Metas",        icon:"ti-target" },
  { id:"categorias",  label:"Categorias",   icon:"ti-tags" },
  { id:"ia",          label:"IA",           icon:"ti-sparkles" },
];
