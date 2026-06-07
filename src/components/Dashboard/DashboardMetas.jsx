import { C, styles } from '../../styles/theme';
import { fmt } from '../../utils/formatters';
import { Bar } from '../Common/Bar';

export function DashboardMetas({ metas, setAba }) {
  if (!metas || metas.length === 0) return null;
  
  const coresMap = { navy: C.navy, green:
