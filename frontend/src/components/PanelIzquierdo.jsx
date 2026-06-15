import { useState, useMemo } from 'react';
import { IconShield, IconSearch } from '@tabler/icons-react';
import { urgencyBarWidth, urgencyColor, diasLabel, RESULTADO_LABELS } from '../utils/urgencia';

// Single Responsibility: solo renderiza un ítem de la lista
function PolizaItem({ poliza, isSelected, onClick }) {
  const barWidth = urgencyBarWidth(poliza.daysUntilExpiration, poliza.status);
  const barColor = urgencyColor(poliza.status, poliza.daysUntilExpiration);
  const dias = poliza.daysUntilExpiration;
  const badgeCls = poliza.status === 'expired_in_window'
    ? 'badge-expired'
    : dias <= 7 ? 'badge-soon' : 'badge-ok';
  const lastDate   = poliza.lastInteraction?.date?.slice(0, 10);
  const lastResult = poliza.lastInteraction
    ? RESULTADO_LABELS[poliza.lastInteraction.result] || '—'
    : null;

  return (
    <div
      className={`client-row${isSelected ? ' selected' : ''}`}
      onClick={onClick}
      role="button"
      aria-label={`Ver detalle de ${poliza.client.name}`}
    >
      <div className="client-row-top">
        <div>
          <div className="client-name">{poliza.client.name}</div>
          <div className="client-phone">{poliza.client.phone}</div>
        </div>
        <span className={`badge ${badgeCls}`}>{diasLabel(dias)}</span>
      </div>
      <div className="client-row-mid">
        <span className="policy-insurer">{poliza.insurer}</span>
        <span className="policy-type">· {poliza.type}</span>
      </div>
      <div className="client-row-bottom">
        <div className="urgency-bar-wrap">
          <div className="urgency-bar" style={{ width: `${barWidth}%`, background: barColor }} />
        </div>
        <span className="last-contact">
          {lastDate ? `Últ. ${lastDate}` : 'Sin gestiones'}
          {lastResult && ` · ${lastResult}`}
        </span>
      </div>
    </div>
  );
}

const FILTROS = [
  { key: 'all',     label: 'Todas' },
  { key: 'vencida', label: 'Vencidas' },
  { key: 'proxima', label: 'Próximas' },
];

// Single Responsibility: gestiona filtro, búsqueda y renderizado de la lista
export default function PanelIzquierdo({ polizas, selectedId, onSelect, loading }) {
  const [filtro, setFiltro]     = useState('all');
  const [busqueda, setBusqueda] = useState('');

  const lista = useMemo(() => polizas.filter(p => {
    const matchFiltro =
      filtro === 'all' ||
      (filtro === 'vencida' && p.status === 'expired_in_window') ||
      (filtro === 'proxima' && p.status === 'upcoming');
    const q = busqueda.toLowerCase();
    const matchBusqueda = !q ||
      p.client.name.toLowerCase().includes(q) ||
      p.client.phone.includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.insurer.toLowerCase().includes(q) ||
      p.policyNumber.toLowerCase().includes(q);
    return matchFiltro && matchBusqueda;
  }), [polizas, filtro, busqueda]);

  return (
    <div className="pm-left">
      <div className="pm-header">
        <div className="pm-title">
          <IconShield size={16} stroke={1.5} color="var(--color-text-secondary)" />
          PolicyManager
          <span className="pm-count">{lista.length} póliza{lista.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="pm-filters">
        {FILTROS.map(f => (
          <button
            key={f.key}
            className={`filter-btn${filtro === f.key ? ' active' : ''}`}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="pm-search">
        <div className="search-wrap">
          <IconSearch size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar cliente, póliza, aseguradora…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="client-list">
        {loading ? (
          <div className="empty-state">Cargando pólizas…</div>
        ) : lista.length === 0 ? (
          <div className="empty-state">Sin resultados</div>
        ) : (
          lista.map(p => (
            <PolizaItem
              key={p.id}
              poliza={p}
              isSelected={p.id === selectedId}
              onClick={() => onSelect(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
