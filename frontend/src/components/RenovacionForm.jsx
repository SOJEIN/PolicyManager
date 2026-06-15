import { useState } from 'react';
import { IconRefresh } from '@tabler/icons-react';

// Recibe onRenovar como prop (Dependency Inversion).
export default function RenovacionForm({ onRenovar }) {
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [prima, setPrima]     = useState('');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const notaFinal = prima
        ? `${note.trim()} · ajuste de prima: ${prima}%`
        : note.trim();
      await onRenovar({ newExpirationDate, note: notaFinal });
      setNewExpirationDate(''); setNote(''); setPrima('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la renovación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="gestion-form">
      <div className="form-row">
        <div className="form-group">
          <label>Nueva fecha de vencimiento</label>
          <input
            type="date"
            value={newExpirationDate}
            onChange={e => setNewExpirationDate(e.target.value)}
            min={minDate}
            required
          />
        </div>
        <div className="form-group">
          <label>Ajuste de prima (%)</label>
          <input
            type="number"
            value={prima}
            onChange={e => setPrima(e.target.value)}
            placeholder="0"
            min="-50"
            max="100"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Nota de renovación</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          required
          placeholder="Ej: Renovado con ajuste de prima…"
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer">
        <button type="submit" disabled={loading} className="btn-submit renew">
          <IconRefresh size={13} style={{ verticalAlign: '-1px', marginRight: 4 }} />
          {loading ? 'Procesando…' : 'Confirmar renovación'}
        </button>
      </div>
    </form>
  );
}
