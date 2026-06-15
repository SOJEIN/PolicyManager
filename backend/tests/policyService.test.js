const db = require('../database');
const { deriveStatus, getWorkQueue } = require('../services/policyService');

// Returns a date string YYYY-MM-DD offset by n days from today
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
// Test 1 — deriveStatus: regla de negocio pura
// ─────────────────────────────────────────────
describe('deriveStatus', () => {
  it('clasifica correctamente los cuatro estados según la ventana de 30 días', () => {
    // Fuera del rango de acción (más de 30 días para vencer)
    expect(deriveStatus(31)).toBe('not_due');

    // Dentro de la ventana pre-vencimiento (1 a 30 días)
    expect(deriveStatus(30)).toBe('upcoming');
    expect(deriveStatus(1)).toBe('upcoming');

    // Vencida dentro de la ventana de recuperación (0 a -30 días)
    expect(deriveStatus(0)).toBe('expired_in_window');
    expect(deriveStatus(-30)).toBe('expired_in_window');

    // Fuera de la ventana: ya no es accionable por el mismo intermediario
    expect(deriveStatus(-31)).toBe('outside_window');
  });
});

// ─────────────────────────────────────────────
// Setup compartido para los tests con BD
// ─────────────────────────────────────────────
let clientId;

beforeEach(() => {
  db.prepare('DELETE FROM interactions').run();
  db.prepare('DELETE FROM policies').run();
  db.prepare('DELETE FROM clients').run();

  clientId = db.prepare(
    'INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)'
  ).run('María Test', '3001234567', 'test@test.com').lastInsertRowid;
});

function insertPolicy(policyNumber, expirationDate) {
  return db.prepare(
    'INSERT INTO policies (client_id, policy_number, type, insurer, expiration_date) VALUES (?, ?, ?, ?, ?)'
  ).run(clientId, policyNumber, 'Auto', 'Aseguradora SA', expirationDate).lastInsertRowid;
}

// ─────────────────────────────────────────────
// Test 2 — getWorkQueue: filtrado
// ─────────────────────────────────────────────
describe('getWorkQueue — filtrado', () => {
  it('excluye pólizas fuera de la ventana de ±30 días', () => {
    insertPolicy('POL-DENTRO',  daysFromToday(10));   // upcoming → debe aparecer
    insertPolicy('POL-FUERA',   daysFromToday(-45));  // outside_window → no debe aparecer

    const cola = getWorkQueue();

    expect(cola).toHaveLength(1);
    expect(cola[0].policyNumber).toBe('POL-DENTRO');
  });
});

// ─────────────────────────────────────────────
// Test 3 — getWorkQueue: orden de prioridad
// ─────────────────────────────────────────────
describe('getWorkQueue — orden', () => {
  it('muestra las pólizas vencidas en ventana antes que las próximas a vencer', () => {
    insertPolicy('POL-PROXIMA',  daysFromToday(15));  // upcoming
    insertPolicy('POL-VENCIDA',  daysFromToday(-5));  // expired_in_window

    const cola = getWorkQueue();

    expect(cola).toHaveLength(2);
    expect(cola[0].policyNumber).toBe('POL-VENCIDA');   // vencida → más urgente
    expect(cola[1].policyNumber).toBe('POL-PROXIMA');
    expect(cola[0].status).toBe('expired_in_window');
    expect(cola[1].status).toBe('upcoming');
  });
});
