import { useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { RESULTADOS, CANALES } from '../utils/urgencia';

// Recibe onGuardar como prop (Dependency Inversion):
// el formulario no sabe de la API, solo llama la función inyectada.
export default function GestionForm({ onGuardar }) {
  const [result, setResult]   = useState('');
  const [canal, setCanal]     = useState('Llamada');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onGuardar({ result, note: `${canal}: ${note.trim()}` });
      setResult(''); setNote(''); setCanal('Llamada');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la gestión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="gestion-form">
      <div className="form-row">
        <div className="form-group">
          <label>Resultado del contacto</label>
          <select value={result} onChange={e => setResult(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {RESULTADOS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Canal</label>
          <select value={canal} onChange={e => setCanal(e.target.value)}>
            {CANALES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Nota</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          required
          placeholder="Describe el resultado del contacto…"
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer">
        <button type="submit" disabled={loading} className="btn-submit save">
          <IconDeviceFloppy size={13} style={{ verticalAlign: '-1px', marginRight: 4 }} />
          {loading ? 'Guardando…' : 'Guardar gestión'}
        </button>
      </div>
    </form>
  );
}
