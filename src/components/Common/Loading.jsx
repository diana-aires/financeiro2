import { C } from '../../styles/theme';

export function Loading({ message = "Carregando seus dados..." }) {
  return (
    <div style={{ background: C.slate, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.grayD }}>
        <i className="ti ti-loader-2" style={{ fontSize: 48, animation: "spin 1s linear infinite", display: "block", marginBottom: 16 }} />
        <span>{message}</span>
      </div>
    </div>
  );
}
