const Joi = require('joi')
const db = require('./db')
const logger = require('./logger')

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

const patientSchema = Joi.object({
  firstName: Joi.string().max(100).required(),
  lastName: Joi.string().max(100).required(),
  dob: Joi.date().iso().required(),
  species: Joi.string().max(50).required(),
  breed: Joi.string().max(100).optional(),
  ownerId: Joi.number().integer().required(),
  microchipNumber: Joi.string().max(50).optional(),
  medicalHistory: Joi.object().optional()
})

const patientUpdateSchema = Joi.object({
  firstName: Joi.string().max(100),
  lastName: Joi.string().max(100),
  dob: Joi.date().iso(),
  species: Joi.string().max(50),
  breed: Joi.string().max(100),
  ownerId: Joi.number().integer(),
  microchipNumber: Joi.string().max(50),
  medicalHistory: Joi.object()
}).min(1)

const idSchema = Joi.number().integer().positive().required()

async function createPatient(data, userId) {
  const { error, value } = patientSchema.validate(data, { stripUnknown: true })
  if (error) throw new ValidationError(`Validation error: ${error.message}`)

  return await db.transaction(async trx => {
    const inserted = await trx('patients').insert(value).returning('id')
    const id = inserted[0].id || inserted[0]
    const patient = await trx('patients').where({ id }).first()
    await trx('audit_logs').insert({
      action: 'CREATE',
      entity: 'patient',
      entity_id: id,
      user_id: userId,
      timestamp: new Date(),
      changes: JSON.stringify(value)
    })
    logger.info(`Patient created with id ${id} by user ${userId}`)
    return patient
  })
}

async function getPatient(id) {
  const { error: idError, value: validId } = idSchema.validate(id)
  if (idError) throw new ValidationError(`Patient ID validation error: ${idError.message}`)

  const patient = await db('patients').where({ id: validId }).first()
  if (!patient) throw new NotFoundError(`Patient with id ${validId} not found`)
  return patient
}

async function updatePatient(id, data, userId) {
  const { error: idError, value: validId } = idSchema.validate(id)
  if (idError) throw new ValidationError(`Patient ID validation error: ${idError.message}`)

  const { error, value } = patientUpdateSchema.validate(data, { stripUnknown: true })
  if (error) throw new ValidationError(`Validation error: ${error.message}`)

  return await db.transaction(async trx => {
    const existing = await trx('patients').where({ id: validId }).first()
    if (!existing) throw new NotFoundError(`Patient with id ${validId} not found`)

    const updatePayload = { ...value, updatedAt: new Date() }
    await trx('patients').where({ id: validId }).update(updatePayload)
    const updated = await trx('patients').where({ id: validId }).first()

    const changes = {}
    for (const key of Object.keys(value)) {
      changes[key] = { before: existing[key], after: updated[key] }
    }

    await trx('audit_logs').insert({
      action: 'UPDATE',
      entity: 'patient',
      entity_id: validId,
      user_id: userId,
      timestamp: new Date(),
      changes: JSON.stringify(changes)
    })

    logger.info(`Patient ${validId} updated by user ${userId}`, changes)
    return updated
  })
}

async function deletePatient(id, userId) {
  const { error: idError, value: validId } = idSchema.validate(id)
  if (idError) throw new ValidationError(`Patient ID validation error: ${idError.message}`)

  return await db.transaction(async trx => {
    const existing = await trx('patients').where({ id: validId }).first()
    if (!existing) throw new NotFoundError(`Patient with id ${validId} not found`)

    await trx('patients').where({ id: validId }).del()
    await trx('audit_logs').insert({
      action: 'DELETE',
      entity: 'patient',
      entity_id: validId,
      user_id: userId,
      timestamp: new Date(),
      changes: JSON.stringify(existing)
    })
    logger.info(`Patient ${validId} deleted by user ${userId}`)
    return { success: true }
  })
}

module.exports = {
  ValidationError,
  NotFoundError,
  createPatient,
  getPatient,
  updatePatient,
  deletePatient
}