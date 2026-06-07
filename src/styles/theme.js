export const C = {
  navy: "#1E3A8A", 
  navyL: "#2d4fa3", 
  green: "#10B981", 
  greenD: "#059669",
  greenL: "#34d399", 
  slate: "#F8FAFC", 
  gray: "#94A3B8", 
  grayD: "#64748B",
  border: "#E2E8F0", 
  white: "#FFFFFF", 
  red: "#EF4444", 
  amber: "#F59E0B",
  purple: "#7C3AED", 
  orange: "#F97316", 
  teal: "#14B8A6",
};

export const styles = {
  card: {
    background: C.white, 
    border: `1px solid ${C.border}`, 
    borderRadius: 16, 
    padding: "1.25rem", 
    boxShadow: "0 2px 12px rgba(30,58,138,.07)"
  },
  input: {
    width: "100%", 
    boxSizing: "border-box", 
    borderRadius: 8, 
    border: `1px solid ${C.border}`, 
    padding: "8px 10px", 
    fontSize: 13, 
    outline: "none"
  },
  label: {
    fontSize: 11, 
    fontWeight: 600, 
    color: C.grayD, 
    marginBottom: 5, 
    display: "block"
  },
  buttonPrimary: {
    background: C.navy, 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    padding: "7px 14px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer", 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 5
  },
  buttonSuccess: {
    background: C.green, 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    padding: "7px 14px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer", 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 5
  },
  buttonDanger: {
    background: C.red, 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    padding: "7px 14px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer", 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 5
  },
  buttonIcon: {
    background: "none", 
    border: "none", 
    cursor: "pointer", 
    padding: 3
  }
};

export const cssAnimations = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.float-card{animation:float 4s ease-in-out infinite}
.row-hover:hover{background:${C.slate}}
.btn-green{transition:all .2s}
.btn-green:hover{background:${C.greenD}!important;transform:translateY(-1px)}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-content{background:white;border-radius:20px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto}
`;
