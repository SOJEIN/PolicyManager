const db = require('../database');

function deriveStatus(daysUntilExpiration) {
  if (daysUntilExpiration > 30)  return 'not_due';
  if (daysUntilExpiration > 0)   return 'upcoming';
  if (daysUntilExpiration >= -30) return 'expired_in_window';
  return 'outside_window';
}

function getWorkQueue() {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.policy_number,
      p.type,
      p.insurer,
      p.expiration_date,
      CAST(julianday(p.expiration_date) - julianday(date('now', 'localtime')) AS INTEGER) AS days_until_expiration,
      c.name  AS client_name,
      c.phone AS client_phone,
      last_i.date   AS last_interaction_date,
      last_i.result AS last_interaction_result
    FROM policies p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN (
      SELECT policy_id, date, result
      FROM interactions
      WHERE (policy_id, date) IN (SELECT policy_id, MAX(date) FROM interactions GROUP BY policy_id)
    ) last_i ON last_i.policy_id = p.id
    WHERE p.expiration_date BETWEEN date('now', 'localtime', '-30 days')
                                AND date('now', 'localtime', '+30 days')
    ORDER BY
      CASE WHEN CAST(julianday(p.expiration_date) - julianday(date('now', 'localtime')) AS INTEGER) <= 0
           THEN 0 ELSE 1 END ASC,
      CAST(julianday(p.expiration_date) - julianday(date('now', 'localtime')) AS INTEGER) ASC
  `).all();

  return rows.map(row => ({
    id: row.id,
    policyNumber: row.policy_number,
    type: row.type,
    insurer: row.insurer,
    expirationDate: row.expiration_date,
    daysUntilExpiration: row.days_until_expiration,
    status: deriveStatus(row.days_until_expiration),
    client: {
      name: row.client_name,
      phone: row.client_phone,
    },
    lastInteraction: row.last_interaction_date
      ? { date: row.last_interaction_date, result: row.last_interaction_result }
      : null,
  }));
}

function getPolicyById(id) {
  const row = db.prepare(`
    SELECT
      p.*,
      c.name  AS client_name,
      c.phone AS client_phone,
      c.email AS client_email,
      CAST(julianday(p.expiration_date) - julianday(date('now', 'localtime')) AS INTEGER) AS days_until_expiration
    FROM policies p
    JOIN clients c ON c.id = p.client_id
    WHERE p.id = ?
  `).get(id);

  if (!row) return null;

  return {
    id: row.id,
    policyNumber: row.policy_number,
    type: row.type,
    insurer: row.insurer,
    expirationDate: row.expiration_date,
    daysUntilExpiration: row.days_until_expiration,
    status: deriveStatus(row.days_until_expiration),
    client: {
      name: row.client_name,
      phone: row.client_phone,
      email: row.client_email,
    },
  };
}

function renewPolicy(id, { newExpirationDate, note }) {
  const execute = db.transaction(() => {
    db.prepare(`
      UPDATE policies SET expiration_date = ? WHERE id = ?
    `).run(newExpirationDate, id);

    db.prepare(`
      INSERT INTO interactions (policy_id, type, note)
      VALUES (?, 'renewal', ?)
    `).run(id, note);
  });

  execute();
}

module.exports = { getWorkQueue, getPolicyById, renewPolicy, deriveStatus };
