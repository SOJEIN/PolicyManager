const express = require('express');
const { getWorkQueue, getPolicyById, renewPolicy } = require('../services/policyService');

const router = express.Router();

router.get('/', (req, res) => {
  const queue = getWorkQueue();
  res.json(queue);
});

router.get('/:id', (req, res) => {
  const policy = getPolicyById(Number(req.params.id));
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

router.post('/:id/renew', (req, res) => {
  const { newExpirationDate, note } = req.body;

  if (!newExpirationDate || !/^\d{4}-\d{2}-\d{2}$/.test(newExpirationDate)) {
    return res.status(400).json({ error: 'newExpirationDate is required in YYYY-MM-DD format' });
  }
  if (!note || typeof note !== 'string' || note.trim() === '') {
    return res.status(400).json({ error: 'note is required' });
  }

  const policy = getPolicyById(Number(req.params.id));
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  renewPolicy(Number(req.params.id), { newExpirationDate, note: note.trim() });

  res.status(200).json({ message: 'Policy renewed successfully' });
});

module.exports = router;
