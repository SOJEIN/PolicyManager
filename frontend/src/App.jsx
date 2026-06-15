import { useState, useCallback } from 'react';
import { usePolizas } from './hooks/usePolizas';
import PanelIzquierdo from './components/PanelIzquierdo';
import PanelDerecho from './components/PanelDerecho';
import Toast from './components/Toast';
import './App.css';

export default function App() {
  const {
    polizas, selectedId, detalle, gestiones,
    loadingLista, loadingDetalle,
    seleccionar, guardarGestion, renovar,
  } = usePolizas();

  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'ok') => setToast({ msg, type }), []);

  // Envuelve las funciones del hook con feedback visual (toast).
  // Los formularios reciben estas funciones como abstracciones (DI).
  const handleGuardar = useCallback(async (data) => {
    await guardarGestion(data);
    showToast('Gestión registrada correctamente');
  }, [guardarGestion, showToast]);

  const handleRenovar = useCallback(async (data) => {
    await renovar(data);
    showToast('Póliza renovada exitosamente');
  }, [renovar, showToast]);

  return (
    <div className="pm-wrap">
      <PanelIzquierdo
        polizas={polizas}
        selectedId={selectedId}
        onSelect={seleccionar}
        loading={loadingLista}
      />

      <div className="pm-right-col">
        {!selectedId && (
          <div className="empty-state-full">
            Selecciona una póliza para ver el detalle
          </div>
        )}
        {selectedId && loadingDetalle && (
          <div className="empty-state-full">Cargando detalle…</div>
        )}
        {selectedId && !loadingDetalle && detalle && (
          // key={selectedId} fuerza remount al cambiar de póliza → tab vuelve a 'gestion'
          <PanelDerecho
            key={selectedId}
            poliza={detalle}
            gestiones={gestiones}
            onGuardar={handleGuardar}
            onRenovar={handleRenovar}
          />
        )}
      </div>

      <Toast message={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
