function calculateInvoiceTotals(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    throw new TypeError('Invoice must be an object.');
  }
  const items = invoice.items;
  if (!Array.isArray(items)) {
    throw new TypeError('Invoice.items must be an array.');
  }

  const roundTwo = (num) => {
    if (typeof num !== 'number' || !isFinite(num)) {
      throw new TypeError('Numeric computation resulted in invalid number.');
    }
    return parseFloat(num.toFixed(2));
  };

  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let total = 0;

  const detailedLines = items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`Item at index ${index} must be an object.`);
    }

    let { description = '', quantity, unitPrice, discountRate = 0, taxRate = 0 } = item;

    // Validate and coerce description
    if (description == null) {
      description = '';
    } else if (typeof description !== 'string') {
      description = String(description);
    }

    if (typeof quantity !== 'number' || quantity < 0 || !isFinite(quantity)) {
      throw new TypeError(`Item.quantity at index ${index} must be a non-negative number.`);
    }
    if (typeof unitPrice !== 'number' || unitPrice < 0 || !isFinite(unitPrice)) {
      throw new TypeError(`Item.unitPrice at index ${index} must be a non-negative number.`);
    }
    if (typeof discountRate !== 'number' || discountRate < 0 || discountRate > 1 || !isFinite(discountRate)) {
      throw new TypeError(`Item.discountRate at index ${index} must be a number between 0 and 1.`);
    }
    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1 || !isFinite(taxRate)) {
      throw new TypeError(`Item.taxRate at index ${index} must be a number between 0 and 1.`);
    }

    // Round unitPrice before calculations for consistency
    const unitPriceRounded = roundTwo(unitPrice);

    const lineSubtotalRaw = quantity * unitPriceRounded;
    const lineDiscountRaw = lineSubtotalRaw * discountRate;
    const lineTaxableRaw = lineSubtotalRaw - lineDiscountRaw;
    const lineTaxRaw = lineTaxableRaw * taxRate;
    const lineTotalRaw = lineTaxableRaw + lineTaxRaw;

    const lineSubtotal = roundTwo(lineSubtotalRaw);
    const lineDiscount = roundTwo(lineDiscountRaw);
    const lineTaxable = roundTwo(lineTaxableRaw);
    const lineTax = roundTwo(lineTaxRaw);
    const lineTotal = roundTwo(lineTotalRaw);

    totalSubtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;
    total += lineTotal;

    return {
      description,
      quantity,
      unitPrice: unitPriceRounded,
      discountRate,
      taxRate,
      lineSubtotal,
      lineDiscount,
      lineTaxable,
      lineTax,
      lineTotal
    };
  });

  totalSubtotal = roundTwo(totalSubtotal);
  totalDiscount = roundTwo(totalDiscount);
  totalTax = roundTwo(totalTax);
  total = roundTwo(total);

  return {
    subtotal: totalSubtotal,
    discount: totalDiscount,
    tax: totalTax,
    total,
    lines: detailedLines
  };
}

module.exports = calculateInvoiceTotals;