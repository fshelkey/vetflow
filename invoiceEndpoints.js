const express = require('express')
const { body, param, query, check, validationResult } = require('express-validator')
const auth = require('../middleware/auth')
const roles = require('../middleware/rbacmiddleware')
const billingController = require('../controllers/billingcontroller')

const router = express.Router()

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.get(
  '/',
  auth,
  [
    query('status').optional().isIn(['draft', 'sent', 'paid', 'cancelled', 'overdue']),
    query('patientId').optional().isUUID(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    check('endDate').custom((endDate, { req }) => {
      const startDate = req.query.startDate
      if (startDate && endDate && startDate > endDate) {
        throw new Error('startDate must be on or before endDate')
      }
      return true
    }),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const filters = {
      status: req.query.status,
      patientId: req.query.patientId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit,
      offset: req.query.offset
    }

    const invoices = await billingController.listInvoices(filters)
    res.json(invoices)
  })
)

router.get(
  '/:id',
  auth,
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const invoice = await billingController.getInvoiceById(req.params.id)
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' })

    res.json(invoice)
  })
)

router.post(
  '/',
  auth,
  roles('staff', 'admin'),
  [
    body('patientId').isUUID(),
    body('items').isArray({ min: 1 }),
    body('items.*.description').isString().trim().notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }).toInt(),
    body('items.*.unitPrice').isFloat({ min: 0 }).toFloat(),
    body('dueDate').optional().isISO8601().toDate(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const invoice = await billingController.createInvoice(req.body)
    res.status(201).json(invoice)
  })
)

router.put(
  '/:id',
  auth,
  roles('staff', 'admin'),
  [
    param('id').isUUID(),
    body('items').optional().isArray({ min: 1 }),
    body('items.*.description').if(body('items').exists()).isString().trim().notEmpty(),
    body('items.*.quantity').if(body('items').exists()).isInt({ min: 1 }).toInt(),
    body('items.*.unitPrice').if(body('items').exists()).isFloat({ min: 0 }).toFloat(),
    body('status').optional().isIn(['draft', 'sent', 'paid', 'cancelled', 'overdue']),
    body('dueDate').optional().isISO8601().toDate(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const updated = await billingController.updateInvoice(req.params.id, req.body)
    if (!updated) return res.status(404).json({ message: 'Invoice not found' })

    res.json(updated)
  })
)

router.delete(
  '/:id',
  auth,
  roles('admin'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const deleted = await billingController.deleteInvoice(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Invoice not found' })

    res.status(204).end()
  })
)

module.exports = router