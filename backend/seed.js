const db = require('./database');

db.exec(`DELETE FROM interactions; DELETE FROM policies; DELETE FROM clients;`);

const insertClient = db.prepare(
  `INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)`
);
const insertPolicy = db.prepare(
  `INSERT INTO policies (client_id, policy_number, type, insurer, expiration_date) VALUES (?, ?, ?, ?, ?)`
);
const insertInteraction = db.prepare(
  `INSERT INTO interactions (policy_id, type, date, result, note) VALUES (?, ?, ?, ?, ?)`
);

const clients = [
  { name: 'Lucía Martínez',   phone: '3101234567', email: 'lucia@email.com' },          // 0
  { name: 'Ana Torres',       phone: '3209876543', email: 'ana@email.com' },             // 1
  { name: 'Diana Herrera',    phone: '3112345678', email: 'diana.herrera@gmail.com' },   // 2
  { name: 'Sebastián Mora',   phone: '3201112233', email: 'smora@gmail.com' },           // 3
  { name: 'Carlos Mendoza',   phone: '3154443322', email: 'carlos@email.com' },          // 4
  { name: 'Andrés Castillo',  phone: '3223344556', email: 'andres.castillo@hotmail.com' }, // 5
  { name: 'Sandra Restrepo',  phone: '3064445566', email: 'srestrepo@email.com' },       // 6
  { name: 'Alejandra Duque',  phone: '3155559988', email: 'aduque@hotmail.com' },        // 7
  { name: 'Camila Jiménez',   phone: '3178889900', email: 'camila.j@email.com' },        // 8
  { name: 'Rosa Vargas',      phone: '3001112233', email: 'rosa@email.com' },            // 9
  { name: 'Roberto Navarro',  phone: '3246668877', email: 'rnavarro@email.com' },        // 10
  { name: 'Patricia López',   phone: '3145556677', email: 'patricia.lopez@email.com' },  // 11
  { name: 'Marcela Ríos',     phone: '3167778899', email: null },                        // 12
  { name: 'Juan Pérez',       phone: '3187654321', email: 'juan@email.com' },            // 13
  { name: 'Tomás Aguilar',    phone: '3193334455', email: 'taguilar@empresa.co' },       // 14
  { name: 'Pedro Gómez',      phone: '3125557788', email: null },                        // 15
  { name: 'Felipe Suárez',    phone: '3089991100', email: 'fsuarez@empresa.co' },        // 16
  { name: 'Mauricio Peña',    phone: '3132223344', email: null },                        // 17
  { name: 'Isabel Vergara',   phone: '3118887766', email: 'ivergara@gmail.com' },        // 18
  { name: 'Valentina Cruz',   phone: '3046669900', email: 'vale@email.com' },            // 19
];

const clientIds = clients.map(c =>
  insertClient.run(c.name, c.phone, c.email).lastInsertRowid
);

// Referencia: hoy = 2026-06-15
// Ventana activa: 2026-05-16 → 2026-07-15
const policies = [
  // ── Próximas a vencer (upcoming) ────────────────────────
  { ci: 0,  num: 'POL-001', type: 'auto',        insurer: 'Sura',       date: '2026-06-16' }, // idx 0  +1 día
  { ci: 1,  num: 'POL-002', type: 'hogar',       insurer: 'Bolívar',    date: '2026-06-18' }, // idx 1  +3 días
  { ci: 2,  num: 'POL-003', type: 'auto',        insurer: 'Allianz',    date: '2026-06-21' }, // idx 2  +6 días
  { ci: 3,  num: 'POL-004', type: 'vida',        insurer: 'Sura',       date: '2026-06-25' }, // idx 3  +10 días
  { ci: 4,  num: 'POL-005', type: 'empresarial', insurer: 'Mapfre',     date: '2026-06-30' }, // idx 4  +15 días
  { ci: 5,  num: 'POL-006', type: 'auto',        insurer: 'Colseguros', date: '2026-07-05' }, // idx 5  +20 días
  { ci: 6,  num: 'POL-007', type: 'hogar',       insurer: 'AXA',        date: '2026-07-10' }, // idx 6  +25 días
  { ci: 7,  num: 'POL-008', type: 'accidentes',  insurer: 'Bolívar',    date: '2026-07-14' }, // idx 7  +29 días

  // ── Vencidas dentro de la ventana (expired_in_window) ───
  { ci: 8,  num: 'POL-009', type: 'auto',        insurer: 'Sura',       date: '2026-06-14' }, // idx 8  -1 día
  { ci: 9,  num: 'POL-010', type: 'hogar',       insurer: 'AXA',        date: '2026-06-10' }, // idx 9  -5 días
  { ci: 10, num: 'POL-011', type: 'auto',        insurer: 'Bolívar',    date: '2026-06-05' }, // idx 10 -10 días
  { ci: 11, num: 'POL-012', type: 'vida',        insurer: 'Mapfre',     date: '2026-05-30' }, // idx 11 -16 días
  { ci: 12, num: 'POL-013', type: 'auto',        insurer: 'Allianz',    date: '2026-05-25' }, // idx 12 -21 días
  { ci: 13, num: 'POL-014', type: 'vida',        insurer: 'Sura',       date: '2026-05-20' }, // idx 13 -26 días CRÍTICA
  { ci: 14, num: 'POL-015', type: 'empresarial', insurer: 'Colseguros', date: '2026-05-17' }, // idx 14 -29 días CRÍTICA

  // ── Fuera de la ventana (no aparecen en work queue) ─────
  { ci: 15, num: 'POL-016', type: 'auto',        insurer: 'Allianz',    date: '2026-04-10' }, // idx 15 -66 días
  { ci: 16, num: 'POL-017', type: 'hogar',       insurer: 'Colseguros', date: '2026-03-01' }, // idx 16 -106 días
  { ci: 17, num: 'POL-018', type: 'auto',        insurer: 'Bolívar',    date: '2026-08-20' }, // idx 17 +66 días
  { ci: 18, num: 'POL-019', type: 'vida',        insurer: 'AXA',        date: '2026-09-15' }, // idx 18 +92 días
  { ci: 19, num: 'POL-020', type: 'auto',        insurer: 'Bolívar',    date: '2027-06-01' }, // idx 19 renovada
];

const policyIds = policies.map(p =>
  insertPolicy.run(clientIds[p.ci], p.num, p.type, p.insurer, p.date).lastInsertRowid
);

const interactions = [
  // POL-001 Lucía — vence mañana, ya intentaron contactar
  { pi: 0,  type: 'follow_up', date: '2026-06-10', result: 'call_later', note: 'Llamada: Dijo que llamara esta semana, estaba de viaje' },
  { pi: 0,  type: 'follow_up', date: '2026-06-14', result: 'interested', note: 'WhatsApp: Confirma que quiere renovar, espera la cotización por correo' },

  // POL-002 Ana — vence en 3 días
  { pi: 1,  type: 'follow_up', date: '2026-06-13', result: 'call_later', note: 'Llamada: Estaba en reunión, pidió que llamara el lunes' },

  // POL-003 Diana — vence en 6 días (sin gestiones — primera vez en la cola)

  // POL-004 Sebastián — vence en 10 días, evaluando opciones
  { pi: 3,  type: 'follow_up', date: '2026-06-08', result: 'not_interested', note: 'Llamada: Está evaluando cambiar de aseguradora, quiere comparar' },
  { pi: 3,  type: 'follow_up', date: '2026-06-12', result: 'interested', note: 'WhatsApp: Reconsideró, pide información de beneficios de Sura' },

  // POL-005 Carlos — vence en 15 días, esperando aprobación interna
  { pi: 4,  type: 'follow_up', date: '2026-06-05', result: 'call_later', note: 'Email: Enviada cotización, espera aprobación de gerencia' },

  // POL-006 Andrés — vence en 20 días (sin gestiones)

  // POL-007 Sandra — vence en 25 días
  { pi: 6,  type: 'follow_up', date: '2026-06-14', result: 'interested', note: 'Llamada: Quiere renovar, preguntó si hay ajuste de prima este año' },

  // POL-008 Alejandra — vence en 29 días
  { pi: 7,  type: 'follow_up', date: '2026-06-12', result: 'call_later', note: 'WhatsApp: Leyó el mensaje, pide que le escriban en una semana' },

  // POL-009 Camila — venció ayer (sin gestiones, se les pasó)

  // POL-010 Rosa — venció hace 5 días
  { pi: 9,  type: 'follow_up', date: '2026-06-08', result: 'no_answer',  note: 'Llamada: No contesta, buzón lleno' },
  { pi: 9,  type: 'follow_up', date: '2026-06-11', result: 'no_answer',  note: 'WhatsApp: Mensaje enviado, no ha visto' },
  { pi: 9,  type: 'follow_up', date: '2026-06-14', result: 'call_later', note: 'Llamada: Contestó, dice que llame mañana que está ocupada' },

  // POL-011 Roberto — venció hace 10 días
  { pi: 10, type: 'follow_up', date: '2026-06-07', result: 'interested',  note: 'Llamada: Interesado en renovar pero quiere negociar la prima' },
  { pi: 10, type: 'follow_up', date: '2026-06-13', result: 'call_later',  note: 'WhatsApp: Enviada contrapropuesta, espera respuesta esta semana' },

  // POL-012 Patricia — venció hace 16 días
  { pi: 11, type: 'follow_up', date: '2026-06-01', result: 'no_answer',  note: 'Llamada: No contesta ningún número registrado' },
  { pi: 11, type: 'follow_up', date: '2026-06-08', result: 'no_answer',  note: 'WhatsApp: Mensaje sin respuesta después de 7 días' },

  // POL-013 Marcela — venció hace 21 días
  { pi: 12, type: 'follow_up', date: '2026-05-28', result: 'not_interested', note: 'Llamada: Problemas económicos, no puede renovar este mes' },
  { pi: 12, type: 'follow_up', date: '2026-06-05', result: 'interested',     note: 'Llamada: Situación mejoró, dice que sí quiere renovar' },
  { pi: 12, type: 'follow_up', date: '2026-06-12', result: 'call_later',     note: 'WhatsApp: Está de viaje, vuelve el 18, que llamen entonces' },

  // POL-014 Juan — venció hace 26 días (CRÍTICA — quedan 4 días en ventana)
  { pi: 13, type: 'follow_up', date: '2026-05-22', result: 'interested', note: 'Llamada: Interesado pero quiere comparar con otra aseguradora' },
  { pi: 13, type: 'follow_up', date: '2026-05-30', result: 'call_later', note: 'Llamada: Sigue evaluando, que llame la próxima semana' },
  { pi: 13, type: 'follow_up', date: '2026-06-08', result: 'no_answer',  note: 'Llamada: No contesta, dejó buzón de voz' },
  { pi: 13, type: 'follow_up', date: '2026-06-13', result: 'no_answer',  note: 'WhatsApp: Doble check azul, sin respuesta' },

  // POL-015 Tomás — venció hace 29 días (CRÍTICA — quedan ~1 día en ventana)
  { pi: 14, type: 'follow_up', date: '2026-05-18', result: 'call_later', note: 'Llamada: Recién vencida, dijo que llamara a fin de mes' },
  { pi: 14, type: 'follow_up', date: '2026-06-01', result: 'no_answer',  note: 'Llamada: No contesta, dejó buzón de voz' },
  { pi: 14, type: 'follow_up', date: '2026-06-10', result: 'no_answer',  note: 'WhatsApp: Doble check azul desde hace días, sin respuesta' },

  // POL-020 Valentina — renovada, fuera de cola
  { pi: 19, type: 'renewal',   date: '2026-06-01', result: null,         note: 'Renovada por un año, nueva vigencia hasta junio 2027' },
];

interactions.forEach(i =>
  insertInteraction.run(policyIds[i.pi], i.type, i.date, i.result, i.note)
);

const inQueue = policies.filter(p => {
  const d = new Date(p.date);
  const today = new Date('2026-06-15');
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  return diff >= -30 && diff <= 30;
}).length;

console.log(`Seed completado: ${clients.length} clientes, ${policies.length} pólizas (${inQueue} en cola de trabajo), ${interactions.length} interacciones`);
