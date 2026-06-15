const express = require('express');
const { getInteractionsByPolicyId, createInteraction } = require('../services/interactionService');
const { getPolicyById } = require('../services/policyService');

const router = express.Router();

const VALID_RESULTS = ['contacted', 'no_answer', 'call_later', 'interested', 'not_interested'];

router.get('/:id/interactions', (req, res) => {
  const policy = getPolicyById(Number(req.params.id));
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const interactions = getInteractionsByPolicyId(Number(req.params.id));
  res.json(interactions);
});

router.post('/:id/interactions', (req, res) => {
  const { result, note } = req.body;

  if (!result || !VALID_RESULTS.includes(result)) {
    return res.status(400).json({
      error: `result is required and must be one of: ${VALID_RESULTS.join(', ')}`,
    });
  }
  if (!note || typeof note !== 'string' || note.trim() === '') {
    return res.status(400).json({ error: 'note is required' });
  }

  const policy = getPolicyById(Number(req.params.id));
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const interaction = createInteraction(Number(req.params.id), { result, note: note.trim() });
  res.status(201).json(interaction);
});

module.exports = router;
