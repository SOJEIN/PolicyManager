export const RESULTADOS = [
  { value: 'contacted',      label: 'Contactado' },
  { value: 'no_answer',      label: 'Sin respuesta' },
  { value: 'call_later',     label: 'Llamar después' },
  { value: 'interested',     label: 'Interesado' },
  { value: 'not_interested', label: 'No interesado' },
];

export const RESULTADO_LABELS = Object.fromEntries(
  RESULTADOS.map(r => [r.value, r.label])
);

export const CANALES = ['Llamada', 'WhatsApp', 'Email', 'Visita'];

export const STATUS_LABELS = {
  upcoming:          'Próxima a vencer',
  expired_in_window: 'Vencida en ventana',
  outside_window:    'Fuera de ventana',
  not_due:           'Al día',
};

export function urgencyBarWidth(daysUntilExpiration, status) {
  if (status === 'expired_in_window') return Math.min(100, Math.abs(daysUntilExpiration) * 3.3);
  if (status === 'upcoming') return Math.max(8, 100 - daysUntilExpiration * 3.3);
  return 0;
}

export function urgencyColor(status, daysUntilExpiration) {
  if (status === 'expired_in_window') return '#E24B4A';
  if (status === 'upcoming' && daysUntilExpiration <= 7) return '#EF9F27';
  return '#639922';
}

export function diasLabel(daysUntilExpiration) {
  if (daysUntilExpiration < 0) return `${Math.abs(daysUntilExpiration)}d vencida`;
  if (daysUntilExpiration === 0) return 'Vence hoy';
  return `${daysUntilExpiration}d para vencer`;
}

export function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function formatDatetime(str) {
  if (!str) return '—';
  return str.slice(0, 16).replace('T', ' ');
}
