const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const router = express.Router({ mergeParams: true })
const Visit = require('../models/Visit')
const asyncHandler = require('../middleware/asyncHandler')

// validation result handler
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// GET /patients/:patientId/visits?limit=&offset=
router.get(
  '/',
  [
    param('patientId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { patientId } = req.params
    const limit = req.query.limit ?? 20
    const offset = req.query.offset ?? 0

    const [visits, totalCount] = await Promise.all([
      Visit.find({ patient: patientId })
        .skip(offset)
        .limit(limit)
        .sort({ date: -1 }),
      Visit.countDocuments({ patient: patientId })
    ])

    res.json({
      visits,
      pagination: {
        totalCount,
        limit,
        offset
      }
    })
  })
)

// GET /patients/:patientId/visits/:visitId
router.get(
  '/:visitId',
  [
    param('patientId').isMongoId(),
    param('visitId').isMongoId()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { patientId, visitId } = req.params
    const visit = await Visit.findOne({ _id: visitId, patient: patientId })
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' })
    }
    res.json(visit)
  })
)

// POST /patients/:patientId/visits
router.post(
  '/',
  [
    param('patientId').isMongoId(),
    body('date').isISO8601(),
    body('reason').isString().trim().notEmpty(),
    body('notes').optional().isString(),
    body('treatments').optional().isArray(),
    body('treatments.*.name').optional().isString().trim().notEmpty(),
    body('treatments.*.dosage').optional().isNumeric()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { patientId } = req.params
    // whitelist permitted fields
    const { date, reason, notes, treatments } = req.body
    const visitData = { patient: patientId, date, reason }
    if (notes !== undefined) visitData.notes = notes
    if (treatments !== undefined) visitData.treatments = treatments

    const visit = await Visit.create(visitData)
    res.status(201).json(visit)
  })
)

// PUT /patients/:patientId/visits/:visitId
router.put(
  '/:visitId',
  [
    param('patientId').isMongoId(),
    param('visitId').isMongoId(),
    body('date').optional().isISO8601(),
    body('reason').optional().isString().trim().notEmpty(),
    body('notes').optional().isString(),
    body('treatments').optional().isArray(),
    body('treatments.*.name').optional().isString().trim().notEmpty(),
    body('treatments.*.dosage').optional().isNumeric()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { patientId, visitId } = req.params
    // build update object with whitelisted fields
    const update = {}
    if (req.body.date !== undefined) update.date = req.body.date
    if (req.body.reason !== undefined) update.reason = req.body.reason
    if (req.body.notes !== undefined) update.notes = req.body.notes
    if (req.body.treatments !== undefined) update.treatments = req.body.treatments

    const updated = await Visit.findOneAndUpdate(
      { _id: visitId, patient: patientId },
      update,
      { new: true, runValidators: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Visit not found' })
    }
    res.json(updated)
  })
)

// DELETE /patients/:patientId/visits/:visitId
router.delete(
  '/:visitId',
  [
    param('patientId').isMongoId(),
    param('visitId').isMongoId()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { patientId, visitId } = req.params
    const deleted = await Visit.findOneAndDelete({ _id: visitId, patient: patientId })
    if (!deleted) {
      return res.status(404).json({ message: 'Visit not found' })
    }
    res.status(204).end()
  })
)

module.exports = router