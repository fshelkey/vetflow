const express = require('express')
const { body, param, validationResult } = require('express-validator')
const asyncHandler = require('../middleware/asyncHandler')
const inventoryController = require('../controllers/inventoryController')
const router = express.Router()

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

router.get(
  '/',
  asyncHandler(inventoryController.getAllStocks)
)

router.get(
  '/:stockId',
  [
    param('stockId')
      .isUUID()
      .withMessage('Invalid stock ID')
  ],
  validateRequest,
  asyncHandler(inventoryController.getStockById)
)

router.post(
  '/',
  [
    body('productId')
      .isUUID()
      .withMessage('Invalid product ID'),
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer')
      .toInt(),
    body('location')
      .optional()
      .isString()
      .withMessage('Location must be a string')
      .trim()
      .escape()
  ],
  validateRequest,
  asyncHandler(inventoryController.createStock)
)

router.put(
  '/:stockId',
  [
    param('stockId')
      .isUUID()
      .withMessage('Invalid stock ID'),
    body('quantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer')
      .toInt(),
    body('location')
      .optional()
      .isString()
      .withMessage('Location must be a string')
      .trim()
      .escape()
  ],
  validateRequest,
  asyncHandler(inventoryController.updateStock)
)

router.patch(
  '/:stockId/adjust',
  [
    param('stockId')
      .isUUID()
      .withMessage('Invalid stock ID'),
    body('adjustment')
      .isInt()
      .withMessage('Adjustment must be an integer')
      .toInt()
  ],
  validateRequest,
  asyncHandler(inventoryController.adjustStock)
)

router.delete(
  '/:stockId',
  [
    param('stockId')
      .isUUID()
      .withMessage('Invalid stock ID')
  ],
  validateRequest,
  asyncHandler(inventoryController.deleteStock)
)

module.exports = router