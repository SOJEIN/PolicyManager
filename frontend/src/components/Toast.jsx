import { useEffect } from 'react';

export default function Toast({ message, type = 'ok', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const bg = type === 'ok' ? '#185FA5' : type === 'warn' ? '#854F0B' : '#A32D2D';

  return (
    <div className="toast" style={{ background: bg }} role="alert" aria-live="polite">
      {message}
    </div>
  );
}
