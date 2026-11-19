const express = require('express');
const router = express.Router();
const {
  getUsers,
  getStats,
  getOperators,
  createOperator,
  deleteOperator,
  demoteToCustomer,
  promoteToOperator,
  promoteToAdmin,
  manualProvisionOtt,
  updateUserPhone,
  sendGiftManually,
  retryOscGift,
  exportPaymentsCsv,
} = require('../controllers/adminController');
const { authenticate, requireAdmin, requireAdminOrOperator } = require('../middleware/auth');

router.get('/users', authenticate, requireAdminOrOperator, getUsers);
router.get('/stats', authenticate, requireAdminOrOperator, getStats);
router.get('/operators', authenticate, requireAdmin, getOperators);
router.post('/operators', authenticate, requireAdmin, createOperator);
router.delete('/operators/:id', authenticate, requireAdmin, deleteOperator);
router.put('/operators/:id/demote', authenticate, requireAdmin, demoteToCustomer);
router.put('/operators/:id/promote-admin', authenticate, requireAdmin, promoteToAdmin);
router.put('/users/:id/promote', authenticate, requireAdmin, promoteToOperator);
router.post('/users/:id/provision-ott', authenticate, requireAdminOrOperator, manualProvisionOtt);
router.patch('/users/:id/phone', authenticate, requireAdmin, updateUserPhone);
router.post('/users/:id/send-gift', authenticate, requireAdminOrOperator, sendGiftManually);
router.post('/users/:id/retry-osc-gift', authenticate, requireAdminOrOperator, retryOscGift);
router.get('/payments/export', authenticate, requireAdmin, exportPaymentsCsv);

module.exports = router;
