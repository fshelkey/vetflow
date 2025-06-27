const express = require('express')
const { checkSchema, validationResult } = require('express-validator')
const auth = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const appointmentController = require('../controllers/appointmentController')

const router = express.Router()

// Validation middleware
const validate = schema => [
  checkSchema(schema),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]

// Schemas
const createAppointmentSchema = {
  petId: {
    in: ['body'],
    isMongoId: true,
    notEmpty: true,
    errorMessage: 'petId is required and must be a valid ID'
  },
  ownerId: {
    in: ['body'],
    isMongoId: true,
    notEmpty: true,
    errorMessage: 'ownerId is required and must be a valid ID'
  },
  vetId: {
    in: ['body'],
    isMongoId: true,
    notEmpty: true,
    errorMessage: 'vetId is required and must be a valid ID'
  },
  date: {
    in: ['body'],
    isISO8601: true,
    toDate: true,
    notEmpty: true,
    errorMessage: 'date is required and must be a valid ISO8601 date'
  },
  notes: {
    in: ['body'],
    optional: true,
    isString: true,
    errorMessage: 'notes must be a string'
  },
  status: {
    in: ['body'],
    optional: true,
    isIn: {
      options: [['scheduled', 'completed', 'cancelled']]
    },
    errorMessage: 'status must be one of scheduled, completed, cancelled'
  }
}

const updateAppointmentSchema = {
  petId: {
    in: ['body'],
    optional: true,
    isMongoId: true,
    errorMessage: 'petId must be a valid ID'
  },
  ownerId: {
    in: ['body'],
    optional: true,
    isMongoId: true,
    errorMessage: 'ownerId must be a valid ID'
  },
  vetId: {
    in: ['body'],
    optional: true,
    isMongoId: true,
    errorMessage: 'vetId must be a valid ID'
  },
  date: {
    in: ['body'],
    optional: true,
    isISO8601: true,
    toDate: true,
    errorMessage: 'date must be a valid ISO8601 date'
  },
  notes: {
    in: ['body'],
    optional: true,
    isString: true,
    errorMessage: 'notes must be a string'
  },
  status: {
    in: ['body'],
    optional: true,
    isIn: {
      options: [['scheduled', 'completed', 'cancelled']]
    },
    errorMessage: 'status must be one of scheduled, completed, cancelled'
  }
}

const idParamSchema = {
  id: {
    in: ['params'],
    isMongoId: true,
    errorMessage: 'Invalid appointment ID'
  }
}

const querySchema = {
  start: {
    in: ['query'],
    optional: true,
    isISO8601: true,
    toDate: true,
    errorMessage: 'start must be a valid ISO8601 date'
  },
  end: {
    in: ['query'],
    optional: true,
    isISO8601: true,
    toDate: true,
    errorMessage: 'end must be a valid ISO8601 date'
  },
  vetId: {
    in: ['query'],
    optional: true,
    isMongoId: true,
    errorMessage: 'vetId must be a valid ID'
  },
  status: {
    in: ['query'],
    optional: true,
    isIn: {
      options: [['scheduled', 'completed', 'cancelled']]
    },
    errorMessage: 'status must be one of scheduled, completed, cancelled'
  }
}

router.use(auth)

router.post(
  '/',
  validate(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await appointmentController.createAppointment(req.body)
    res.status(201).json(appointment)
  })
)

router.get(
  '/',
  validate(querySchema),
  asyncHandler(async (req, res) => {
    const filters = {
      start: req.query.start,
      end: req.query.end,
      vetId: req.query.vetId,
      status: req.query.status
    }
    const appointments = await appointmentController.getAppointments(filters)
    res.json(appointments)
  })
)

router.get(
  '/:id',
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const appointment = await appointmentController.getAppointmentById(req.params.id)
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }
    res.json(appointment)
  })
)

router.put(
  '/:id',
  validate(Object.assign({}, idParamSchema, updateAppointmentSchema)),
  asyncHandler(async (req, res) => {
    const updated = await appointmentController.updateAppointment(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ message: 'Appointment not found' })
    }
    res.json(updated)
  })
)

router.delete(
  '/:id',
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const deleted = await appointmentController.deleteAppointment(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Appointment not found' })
    }
    res.status(204).end()
  })
)

module.exports = router