const { EventEmitter } = require('events');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class InsufficientStockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

class StockLevelManager extends EventEmitter {
  /**
   * @param {Object} inventoryService - Service with getProductById and updateProductStockLevel methods
   * @param {Object} logger - Logger with info method
   */
  constructor(inventoryService, logger = console) {
    super();
    if (
      !inventoryService ||
      typeof inventoryService.getProductById !== 'function' ||
      typeof inventoryService.updateProductStockLevel !== 'function'
    ) {
      throw new ValidationError(
        'A valid InventoryService with getProductById and updateProductStockLevel methods is required'
      );
    }
    this.inventoryService = inventoryService;
    this.logger = logger;
  }

  /**
   * Retrieves the stock level for a given product.
   * @param {string|number} productId
   * @throws {ValidationError|NotFoundError}
   * @returns {Promise<number>}
   */
  async getStockLevel(productId) {
    this._validateProductId(productId);
    const product = await this.inventoryService.getProductById(productId);
    if (!product) {
      throw new NotFoundError(`Product not found: ${productId}`);
    }
    const stock = Number(product.stockLevel);
    return Number.isInteger(stock) && stock >= 0 ? stock : 0;
  }

  /**
   * Increases the stock level of a product.
   * @param {string|number} productId
   * @param {number} quantity
   * @throws {ValidationError|NotFoundError}
   * @returns {Promise<number>}
   */
  async increaseStock(productId, quantity) {
    this._validateProductId(productId);
    this._validateQuantity(quantity);

    const current = await this.getStockLevel(productId);
    const updated = current + quantity;

    await this.inventoryService.updateProductStockLevel(productId, updated);
    this.logger.info(
      `Stock increased for ${productId}: +${quantity} (from ${current} to ${updated})`
    );
    this.emit('stockChanged', { productId, change: quantity, newStock: updated });

    return updated;
  }

  /**
   * Decreases the stock level of a product.
   * @param {string|number} productId
   * @param {number} quantity
   * @throws {ValidationError|NotFoundError|InsufficientStockError}
   * @returns {Promise<number>}
   */
  async decreaseStock(productId, quantity) {
    this._validateProductId(productId);
    this._validateQuantity(quantity);

    const current = await this.getStockLevel(productId);
    if (current < quantity) {
      throw new InsufficientStockError(
        `Insufficient stock for ${productId}: have ${current}, need ${quantity}`
      );
    }

    const updated = current - quantity;
    await this.inventoryService.updateProductStockLevel(productId, updated);
    this.logger.info(
      `Stock decreased for ${productId}: -${quantity} (from ${current} to ${updated})`
    );
    this.emit('stockChanged', { productId, change: -quantity, newStock: updated });

    return updated;
  }

  _validateProductId(id) {
    if (id === undefined || id === null) {
      throw new ValidationError('Invalid productId: value is required');
    }
    if (typeof id === 'string') {
      if (id.trim() === '') {
        throw new ValidationError('Invalid productId: string must be non-empty');
      }
    } else if (typeof id === 'number') {
      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid productId: number must be a positive integer');
      }
    } else {
      throw new ValidationError(
        'Invalid productId: must be a non-empty string or positive integer'
      );
    }
  }

  _validateQuantity(qty) {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }
  }
}

module.exports = {
  StockLevelManager,
  ValidationError,
  NotFoundError,
  InsufficientStockError
};