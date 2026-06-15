const db = require('../database');

function getInteractionsByPolicyId(policyId) {
  return db.prepare(`
    SELECT id, type, date, result, note
    FROM interactions
    WHERE policy_id = ?
    ORDER BY date DESC
  `).all(policyId);
}

function createInteraction(policyId, { result, note }) {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO interactions (policy_id, type, result, note)
    VALUES (?, 'follow_up', ?, ?)
  `).run(policyId, result, note);

  return db.prepare(`
    SELECT id, type, date, result, note
    FROM interactions WHERE id = ?
  `).get(lastInsertRowid);
}

module.exports = { getInteractionsByPolicyId, createInteraction };
