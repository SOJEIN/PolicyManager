import { useState, useCallback } from 'react';
import { IconPhone, IconCopy } from '@tabler/icons-react';
import GestionForm from './GestionForm';
import RenovacionForm from './RenovacionForm';
import HistorialTab from './HistorialTab';
import { getInitials, diasLabel } from '../utils/urgencia';

// Single Responsibility: solo renderiza el avatar con iniciales
function Avatar({ name }) {
  return <div className="avatar">{getInitials(name)}</div>;
}

// Single Responsibility: solo muestra el banner de información de la póliza
function PolicyBanner({ poliza }) {
  const dias = poliza.daysUntilExpiration;
  const badgeCls = poliza.status === 'expired_in_window'
    ? 'badge-expired'
    : dias <= 7 ? 'badge-soon' : 'badge-ok';

  return (
    <div className="policy-banner">
      <div className="section-label">póliza</div>
      <div className="policy-banner-row">
        <span className="pbn-main">
          <b>{poliza.policyNumber}</b>
          &nbsp;·&nbsp;{poliza.type}
          &nbsp;·&nbsp;{poliza.insurer}
        </span>
        <span className="pbn-date">Vence: {poliza.expirationDate}</span>
        <span className={`badge ${badgeCls}`}>{diasLabel(dias)}</span>
      </div>
    </div>
  );
}

// PanelDerecho recibe onGuardar y onRenovar como abstracciones (Dependency Inversion).
// No sabe qué hace la API; solo delega al padre.
export default function PanelDerecho({ poliza, gestiones, onGuardar, onRenovar }) {
  const [tabActiva, setTabActiva] = useState('gestion');

  // Después de guardar, cambia automáticamente al historial
  const handleGuardar = useCallback(async (data) => {
    await onGuardar(data);
    setTabActiva('historial');
  }, [onGuardar]);

  const handleRenovar = useCallback(async (data) => {
    await onRenovar(data);
    setTabActiva('historial');
  }, [onRenovar]);

  const copyPhone = () => {
    navigator.clipboard?.writeText(poliza.client.phone).catch(() => {});
  };

  return (
    <div className="pm-right">
      <div className="detail-header">
        <div className="detail-client-info">
          <Avatar name={poliza.client.name} />
          <div>
            <div className="detail-name">{poliza.client.name}</div>
            <div className="detail-meta">
              <IconPhone size={12} style={{ verticalAlign: '-1px', marginRight: 3 }} />
              <a href={`tel:${poliza.client.phone}`} className="phone-link">
                {poliza.client.phone}
              </a>
              {poliza.client.email && <>&nbsp;·&nbsp;{poliza.client.email}</>}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="action-btn" onClick={copyPhone} title="Copiar teléfono">
            <IconCopy size={14} /> Copiar teléfono
          </button>
        </div>
      </div>

      <PolicyBanner poliza={poliza} />

      <div className="tabs">
        <button
          className={`tab-btn${tabActiva === 'gestion' ? ' active' : ''}`}
          onClick={() => setTabActiva('gestion')}
        >
          Registrar gestión
        </button>
        <button
          className={`tab-btn${tabActiva === 'renovar' ? ' active' : ''}`}
          onClick={() => setTabActiva('renovar')}
        >
          Renovar póliza
        </button>
        <button
          className={`tab-btn${tabActiva === 'historial' ? ' active' : ''}`}
          onClick={() => setTabActiva('historial')}
        >
          Historial ({gestiones.length})
        </button>
      </div>

      <div className="detail-body">
        {tabActiva === 'gestion'  && <GestionForm   onGuardar={handleGuardar} />}
        {tabActiva === 'renovar'  && <RenovacionForm onRenovar={handleRenovar} />}
        {tabActiva === 'historial' && <HistorialTab  gestiones={gestiones} />}
      </div>
    </div>
  );
}
