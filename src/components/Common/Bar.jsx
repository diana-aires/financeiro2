import { C } from '../../styles/theme';

export function Bar({ pct, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 999, height: 6, overflow: "hidden" }}>
      <div style={{ 
        width: Math.min(100, pct) + "%", 
        height: "100%", 
        background: color, 
        borderRadius: 999, 
        transition: "width .6s" 
      }} />
    </div>
  );
}
