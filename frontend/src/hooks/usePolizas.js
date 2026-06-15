import { useState, useEffect, useCallback } from 'react';
import {
  getPolizas, getPoliza, getGestiones,
  registrarGestion, renovarPoliza,
} from '../services/api';

export function usePolizas() {
  const [polizas, setPolizas]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle]     = useState(null);
  const [gestiones, setGestiones] = useState([]);
  const [loadingLista, setLoadingLista]     = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const cargarLista = useCallback(async () => {
    setLoadingLista(true);
    try {
      const { data } = await getPolizas();
      setPolizas(data);
      return data;
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  const cargarDetalle = useCallback(async (id) => {
    const [{ data: pol }, { data: gest }] = await Promise.all([
      getPoliza(id),
      getGestiones(id),
    ]);
    setDetalle(pol);
    setGestiones(gest);
  }, []);

  const seleccionar = useCallback(async (id) => {
    setSelectedId(id);
    setLoadingDetalle(true);
    try {
      await cargarDetalle(id);
    } finally {
      setLoadingDetalle(false);
    }
  }, [cargarDetalle]);

  const refrescarTodo = useCallback(async () => {
    const lista = await cargarLista();
    if (!selectedId) return;
    const sigueEnCola = lista?.some(p => p.id === selectedId);
    if (sigueEnCola) {
      await cargarDetalle(selectedId);
    } else {
      setSelectedId(null);
      setDetalle(null);
      setGestiones([]);
    }
  }, [selectedId, cargarLista, cargarDetalle]);

  // Estas funciones se pasan como callbacks a los formularios (Dependency Inversion)
  const guardarGestion = useCallback(async (data) => {
    await registrarGestion(selectedId, data);
    await refrescarTodo();
  }, [selectedId, refrescarTodo]);

  const renovar = useCallback(async (data) => {
    await renovarPoliza(selectedId, data);
    await refrescarTodo();
  }, [selectedId, refrescarTodo]);

  return {
    polizas, selectedId, detalle, gestiones,
    loadingLista, loadingDetalle,
    seleccionar, guardarGestion, renovar,
  };
}
