import { RESULTADO_LABELS, formatDatetime } from '../utils/urgencia';

function HistorialItem({ gestion }) {
  const isRenewal = gestion.type === 'renewal';
  const tagStyle = isRenewal
    ? { background: '#EAF3DE', color: '#27500A' }
    : { background: '#E6F1FB', color: '#0C447C' };

  return (
    <div className={`history-item history-${gestion.type}`}>
      <div className="history-item-top">
        <span className="history-badge" style={tagStyle}>
          {isRenewal ? 'Renovación' : 'Seguimiento'}
        </span>
        <span className="history-date">{formatDatetime(gestion.date)}</span>
      </div>
      {gestion.result && (
        <div className="history-result">
          {RESULTADO_LABELS[gestion.result] || gestion.result}
        </div>
      )}
      {gestion.note && <div className="history-note">{gestion.note}</div>}
    </div>
  );
}

export default function HistorialTab({ gestiones }) {
  if (!gestiones.length) {
    return <div className="empty-state" style={{ padding: '24px 0' }}>Sin gestiones registradas</div>;
  }
  return (
    <div className="history-list">
      {gestiones.map(g => <HistorialItem key={g.id} gestion={g} />)}
    </div>
  );
}
