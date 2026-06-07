import { C } from '../../styles/theme';

export function Toast({ message, onClose }) {
  if (!message) return null;
  
  return (
    <div style={{ 
      position: "fixed", 
      bottom: 24, 
      right: 24, 
      background: C.navy, 
      color: "#fff", 
      borderRadius: 10, 
      padding: "10px 18px", 
      fontSize: 13, 
      fontWeight: 500, 
      zIndex: 999,
      animation: "fadeUp .3s ease"
    }}>
      {message}
    </div>
  );
}
