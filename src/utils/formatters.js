export const fmt = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
});

export const fmtPct = (v) => (Number(v) * 100).toFixed(1) + "%";

export const today = () => new Date().toISOString().split("T")[0];

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return dateStr.split("-").reverse().join("/");
};
