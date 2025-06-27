const PDFDocument = require('pdfkit');

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

function validateData(data) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Validation error: data must be an object');
  }
  const { clinic, client, items, invoiceNumber, date } = data;
  if (!clinic || typeof clinic !== 'object') {
    throw new Error('Validation error: clinic information is required');
  }
  if (!clinic.name || !clinic.address) {
    throw new Error('Validation error: clinic.name and clinic.address are required');
  }
  const ca = clinic.address;
  ['line1', 'city', 'state', 'postalCode', 'country'].forEach(field => {
    if (!ca[field]) {
      throw new Error(`Validation error: clinic.address.${field} is required`);
    }
  });
  if (!client || typeof client !== 'object') {
    throw new Error('Validation error: client information is required');
  }
  if (!client.name || !client.address) {
    throw new Error('Validation error: client.name and client.address are required');
  }
  const ua = client.address;
  ['line1', 'city', 'state', 'postalCode', 'country'].forEach(field => {
    if (!ua[field]) {
      throw new Error(`Validation error: client.address.${field} is required`);
    }
  });
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Validation error: items must be a non-empty array');
  }
  items.forEach((item, idx) => {
    if (!item.description) {
      throw new Error(`Validation error: items[${idx}].description is required`);
    }
    if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
      throw new Error(`Validation error: items[${idx}].quantity must be a number`);
    }
    if (typeof item.unitPrice !== 'number' || isNaN(item.unitPrice)) {
      throw new Error(`Validation error: items[${idx}].unitPrice must be a number`);
    }
    if (!item.currency) {
      throw new Error(`Validation error: items[${idx}].currency is required`);
    }
    if (item.taxRate != null && (typeof item.taxRate !== 'number' || isNaN(item.taxRate))) {
      throw new Error(`Validation error: items[${idx}].taxRate must be a number if provided`);
    }
  });
  if (!invoiceNumber) {
    throw new Error('Validation error: invoiceNumber is required');
  }
  if (!date) {
    throw new Error('Validation error: date is required');
  }
}

function generateHeader(doc, data) {
  const { clinic } = data;
  const invoiceDateObj = new Date(data.date);
  const formattedDate = isNaN(invoiceDateObj)
    ? String(data.date)
    : new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
      }).format(invoiceDateObj);
  doc
    .fontSize(20)
    .text(clinic.name, 50, 50)
    .fontSize(10)
    .text(clinic.address.line1, 50, 75)
    .text(`${clinic.address.city}, ${clinic.address.state} ${clinic.address.postalCode}`, 50, 90)
    .text(clinic.address.country, 50, 105)
    .moveDown();
  doc
    .fontSize(12)
    .text(`Invoice #${data.invoiceNumber}`, 400, 50, { align: 'right' })
    .text(`Date: ${formattedDate}`, 400, 65, { align: 'right' })
    .moveDown();
  doc.moveTo(50, 130).lineTo(550, 130).stroke();
}

function generateCustomerInfo(doc, data) {
  doc
    .fontSize(10)
    .text('Bill To:', 50, 145)
    .font('Helvetica-Bold')
    .text(data.client.name, 50, 160)
    .font('Helvetica')
    .text(data.client.address.line1, 50, 175)
    .text(`${data.client.address.city}, ${data.client.address.state} ${data.client.address.postalCode}`, 50, 190)
    .text(data.client.address.country, 50, 205)
    .moveDown();
  doc.moveTo(50, 230).lineTo(550, 230).stroke();
}

function generateInvoiceTable(doc, items) {
  const columnWidths = { description: 240, qty: 70, unitPrice: 100, lineTotal: 100 };
  let positionY = 0;
  const tableTop = 250;

  function renderTableHeader(y) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', 50, y)
      .text('Qty', 50 + columnWidths.description, y, { width: columnWidths.qty, align: 'right' })
      .text('Unit Price', 50 + columnWidths.description + columnWidths.qty, y, { width: columnWidths.unitPrice, align: 'right' })
      .text('Line Total', 50 + columnWidths.description + columnWidths.qty + columnWidths.unitPrice, y, { width: columnWidths.lineTotal, align: 'right' })
      .moveTo(50, y + 15)
      .lineTo(550, y + 15)
      .stroke();
    positionY = y + 25;
    doc.font('Helvetica').fontSize(10);
  }

  renderTableHeader(tableTop);
  items.forEach(item => {
    const lineTotal = item.quantity * item.unitPrice;
    if (positionY > 700) {
      doc.addPage();
      renderTableHeader(50);
    }
    doc
      .text(item.description, 50, positionY, { width: columnWidths.description })
      .text(item.quantity, 50 + columnWidths.description, positionY, { width: columnWidths.qty, align: 'right' })
      .text(formatCurrency(item.unitPrice, item.currency), 50 + columnWidths.description + columnWidths.qty, positionY, { width: columnWidths.unitPrice, align: 'right' })
      .text(formatCurrency(lineTotal, item.currency), 50 + columnWidths.description + columnWidths.qty + columnWidths.unitPrice, positionY, { width: columnWidths.lineTotal, align: 'right' });
    positionY += 20;
  });

  return positionY;
}

function generateTotals(doc, items, startY, currency) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.taxRate || 0), 0);
  const total = subtotal + tax;
  const labelX = 350;
  const valueX = 550;
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Subtotal', labelX, startY, { align: 'right' })
    .text(formatCurrency(subtotal, currency), valueX, startY, { align: 'right' })
    .text('Tax', labelX, startY + 15, { align: 'right' })
    .text(formatCurrency(tax, currency), valueX, startY + 15, { align: 'right' })
    .fontSize(12)
    .text('Total', labelX, startY + 35, { align: 'right' })
    .text(formatCurrency(total, currency), valueX, startY + 35, { align: 'right' });
}

module.exports = function generateInvoicePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      validateData(data);

      const itemCurrencies = new Set(data.items.map(i => i.currency));
      if (itemCurrencies.size > 1) {
        throw new Error('Validation error: all items must use the same currency');
      }
      const currency = itemCurrencies.values().next().value;

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.info.Title = `Invoice ${data.invoiceNumber}`;
      doc.info.Author = data.clinic.name;

      generateHeader(doc, data);
      generateCustomerInfo(doc, data);
      const lastY = generateInvoiceTable(doc, data.items);
      generateTotals(doc, data.items, lastY + 20, currency);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};