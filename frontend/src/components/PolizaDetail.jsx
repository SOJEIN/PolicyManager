import GestionForm from './GestionForm';
import RenovacionForm from './RenovacionForm';

const STATUS_LABELS = {
  upcoming:          'Próxima a vencer',
  expired_in_window: 'Vencida en ventana',
  outside_window:    'Fuera de ventana',
  not_due:           'Al día',
};

const RESULT_LABELS = {
  contacted:      'Contactado',
  no_answer:      'Sin respuesta',
  call_later:     'Llamar después',
  interested:     'Interesado',
  not_interested: 'No interesado',
};

function formatDatetime(str) {
  if (!str) return '—';
  return str.slice(0, 16).replace('T', ' ');
}

export default function PolizaDetail({ poliza, gestiones, onActualizado }) {
  return (
    <div className="detail">

      <section className="detail-card">
        <h2>Cliente</h2>
        <div className="info-grid">
          <span className="info-label">Nombre</span>   <span>{poliza.client.name}</span>
          <span className="info-label">Teléfono</span> <span>{poliza.client.phone}</span>
          <span className="info-label">Email</span>    <span>{poliza.client.email || '—'}</span>
        </div>
      </section>

      <section className="detail-card">
        <h2>Póliza</h2>
        <div className="info-grid">
          <span className="info-label">Número</span>      <span>{poliza.policyNumber}</span>
          <span className="info-label">Tipo</span>        <span>{poliza.type}</span>
          <span className="info-label">Aseguradora</span> <span>{poliza.insurer}</span>
          <span className="info-label">Vencimiento</span> <span>{poliza.expirationDate}</span>
          <span className="info-label">Estado</span>
          <span className={`status-badge status-${poliza.status}`}>
            {STATUS_LABELS[poliza.status] ?? poliza.status}
          </span>
        </div>
      </section>

      <section className="detail-card">
        <h2>Registrar gestión</h2>
        <GestionForm polizaId={poliza.id} onCreada={onActualizado} />
      </section>

      <section className="detail-card">
        <h2>Renovar póliza</h2>
        <RenovacionForm polizaId={poliza.id} onRenovada={onActualizado} />
      </section>

      <section className="detail-card">
        <h2>Historial de gestiones</h2>
        {gestiones.length === 0 ? (
          <p className="cell-muted">Sin gestiones registradas</p>
        ) : (
          <ul className="gestiones-list">
            {gestiones.map(g => (
              <li key={g.id} className={`gestion-item gestion-${g.type}`}>
                <div className="gestion-header">
                  <span className={`type-tag type-${g.type}`}>
                    {g.type === 'renewal' ? 'Renovación' : 'Seguimiento'}
                  </span>
                  <span className="cell-muted">{formatDatetime(g.date)}</span>
                </div>
                {g.result && (
                  <div className="gestion-result">
                    {RESULT_LABELS[g.result] ?? g.result}
                  </div>
                )}
                {g.note && <div className="gestion-note">{g.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
