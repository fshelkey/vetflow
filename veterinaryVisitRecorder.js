const Joi = require('joi')
const mongoose = require('mongoose')
const Visit = require('../models/Visit')
const logger = require('../config/logger')

const visitCreationSchema = Joi.object({
  patientId: Joi.string().hex().length(24).required(),
  veterinarianId: Joi.string().hex().length(24).required(),
  visitDate: Joi.date().iso().required(),
  reason: Joi.string().max(500).required(),
  notes: Joi.string().max(2000).allow('', null),
  treatments: Joi.array().items(Joi.string().max(200)).default([]),
  medications: Joi.array().items(
    Joi.object({
      name: Joi.string().max(100).required(),
      dosage: Joi.string().max(100).required(),
      frequency: Joi.string().max(100).required()
    })
  ).default([])
})

const visitUpdateSchema = visitCreationSchema.fork(
  ['patientId','veterinarianId','visitDate','reason'],
  schema => schema.optional()
)

const MAX_LIMIT = 100

async function recordVisit(visitData) {
  try {
    const valid = await visitCreationSchema.validateAsync(visitData, { abortEarly: false })
    const visit = new Visit(valid)
    const saved = await visit.save()
    logger.info(`New visit recorded: ${saved._id}`)
    return saved
  } catch (err) {
    if (err.isJoi) {
      err.status = 400
      logger.warn('Validation error recording visit', { error: err.details })
    } else {
      logger.error('Error recording visit', { error: err })
    }
    throw err
  }
}

async function fetchVisitById(visitId) {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    const message = 'Invalid visitId'
    logger.warn(message, { visitId })
    const err = new Error(message)
    err.status = 400
    throw err
  }
  const visit = await Visit.findById(visitId).exec()
  if (!visit) {
    const message = 'Visit not found'
    logger.warn(message, { visitId })
    const err = new Error(message)
    err.status = 404
    throw err
  }
  return visit
}

async function modifyVisit(visitId, updateData) {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    const message = 'Invalid visitId'
    logger.warn(message, { visitId })
    const err = new Error(message)
    err.status = 400
    throw err
  }
  try {
    const valid = await visitUpdateSchema.validateAsync(updateData, { abortEarly: false })
    if (!valid || Object.keys(valid).length === 0) {
      const message = 'No valid fields provided for update'
      logger.warn(message, { visitId })
      const err = new Error(message)
      err.status = 400
      throw err
    }
    const updated = await Visit.findByIdAndUpdate(visitId, { $set: valid }, { new: true }).exec()
    if (!updated) {
      const message = 'Visit not found for update'
      logger.warn(message, { visitId })
      const err = new Error(message)
      err.status = 404
      throw err
    }
    logger.info(`Visit updated: ${visitId}`)
    return updated
  } catch (err) {
    if (err.isJoi) {
      err.status = 400
      logger.warn('Validation error updating visit', { visitId, error: err.details })
    } else {
      logger.error('Error updating visit', { visitId, error: err })
    }
    throw err
  }
}

async function removeVisit(visitId) {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    const message = 'Invalid visitId'
    logger.warn(message, { visitId })
    const err = new Error(message)
    err.status = 400
    throw err
  }
  const removed = await Visit.findByIdAndDelete(visitId).exec()
  if (!removed) {
    const message = 'Visit not found for deletion'
    logger.warn(message, { visitId })
    const err = new Error(message)
    err.status = 404
    throw err
  }
  logger.info(`Visit deleted: ${visitId}`)
  return removed
}

async function listVisitsByFilter({
  patientId,
  veterinarianId,
  fromDate,
  toDate,
  limit = 50,
  page = 1
} = {}) {
  const filter = {}

  if (patientId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      const message = 'Invalid patientId filter'
      logger.warn(message, { patientId })
      const err = new Error(message)
      err.status = 400
      throw err
    }
    filter.patientId = patientId
  }

  if (veterinarianId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(veterinarianId)) {
      const message = 'Invalid veterinarianId filter'
      logger.warn(message, { veterinarianId })
      const err = new Error(message)
      err.status = 400
      throw err
    }
    filter.veterinarianId = veterinarianId
  }

  if (fromDate !== undefined || toDate !== undefined) {
    filter.visitDate = {}
    if (fromDate !== undefined) {
      const d = new Date(fromDate)
      if (isNaN(d.getTime())) {
        const message = 'Invalid fromDate filter'
        logger.warn(message, { fromDate })
        const err = new Error(message)
        err.status = 400
        throw err
      }
      filter.visitDate.$gte = d
    }
    if (toDate !== undefined) {
      const d2 = new Date(toDate)
      if (isNaN(d2.getTime())) {
        const message = 'Invalid toDate filter'
        logger.warn(message, { toDate })
        const err = new Error(message)
        err.status = 400
        throw err
      }
      filter.visitDate.$lte = d2
    }
  }

  let lim = parseInt(limit, 10)
  if (isNaN(lim) || lim < 1) lim = 50
  if (lim > MAX_LIMIT) lim = MAX_LIMIT

  let pg = parseInt(page, 10)
  if (isNaN(pg) || pg < 1) pg = 1

  const skip = (pg - 1) * lim

  const [visits, total] = await Promise.all([
    Visit.find(filter).sort({ visitDate: -1 }).skip(skip).limit(lim).exec(),
    Visit.countDocuments(filter).exec()
  ])

  return {
    visits,
    total,
    page: pg,
    pages: Math.ceil(total / lim)
  }
}

module.exports = {
  recordVisit,
  fetchVisitById,
  modifyVisit,
  removeVisit,
  listVisitsByFilter
}