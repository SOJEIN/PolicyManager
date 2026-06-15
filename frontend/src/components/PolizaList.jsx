const STATUS_LABELS = {
  upcoming:           'Próxima a vencer',
  expired_in_window:  'Vencida en ventana',
  outside_window:     'Fuera de ventana',
  not_due:            'Al día',
};

const RESULT_LABELS = {
  contacted:      'Contactado',
  no_answer:      'Sin respuesta',
  call_later:     'Llamar después',
  interested:     'Interesado',
  not_interested: 'No interesado',
};

function DiasBadge({ days, status }) {
  if (days > 0) return <span className={`days-badge status-${status}`}>{days}d para vencer</span>;
  if (days === 0) return <span className={`days-badge status-${status}`}>Vence hoy</span>;
  return <span className={`days-badge status-${status}`}>{Math.abs(days)}d vencida</span>;
}

export default function PolizaList({ polizas, selectedId, onSelect }) {
  if (polizas.length === 0) {
    return (
      <div className="list-empty">
        No hay pólizas en la cola de trabajo
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="poliza-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Póliza</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th>Última gestión</th>
          </tr>
        </thead>
        <tbody>
          {polizas.map(p => (
            <tr
              key={p.id}
              className={p.id === selectedId ? 'row-selected' : ''}
              onClick={() => onSelect(p.id)}
            >
              <td>
                <div className="cell-primary">{p.client.name}</div>
                <div className="cell-secondary">{p.client.phone}</div>
              </td>
              <td>
                <div className="cell-primary">{p.type}</div>
                <div className="cell-secondary">{p.insurer}</div>
              </td>
              <td>
                <div className="cell-primary">{p.expirationDate}</div>
                <DiasBadge days={p.daysUntilExpiration} status={p.status} />
              </td>
              <td>
                <span className={`status-badge status-${p.status}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </td>
              <td>
                {p.lastInteraction ? (
                  <>
                    <div className="cell-primary">{p.lastInteraction.date.slice(0, 10)}</div>
                    <div className="cell-secondary">
                      {RESULT_LABELS[p.lastInteraction.result] ?? '—'}
                    </div>
                  </>
                ) : (
                  <span className="cell-muted">Sin gestiones</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
