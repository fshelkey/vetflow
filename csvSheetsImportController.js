const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { default: fetch, AbortController } = require('node-fetch');
const { validationResult } = require('express-validator');
const MigrationService = require('../services/migrationService');
const logger = require('../utils/logger');

const MAX_ROWS = parseInt(process.env.CSV_MAX_ROWS, 10) || 10000;
const BATCH_SIZE = parseInt(process.env.CSV_BATCH_SIZE, 10) || 1000;
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS, 10) || 30000;
const FETCH_RETRIES = parseInt(process.env.FETCH_RETRIES, 10) || 3;

async function importCsvSheets(req, res, next) {
  let inputStream = null;
  let tempFilePath = null;
  try {
    if (!req.file && !req.body.sheetUrl) {
      return res.status(400).json({ error: 'No CSV file or Google Sheet URL provided.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    if (req.file) {
      tempFilePath = req.file.path;
      inputStream = fs.createReadStream(tempFilePath);
    } else {
      let csvUrl;
      try {
        csvUrl = toCsvExportUrl(req.body.sheetUrl);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      const response = await fetchWithTimeoutAndRetry(csvUrl, FETCH_TIMEOUT_MS, FETCH_RETRIES);
      inputStream = response.body;
    }

    const importType = req.body.importType || 'default';
    const { totalRows, importedCount, updatedCount } = await parseAndProcessCsvStream(inputStream, importType);

    if (totalRows === 0) {
      return res.status(400).json({ error: 'No data rows found in the CSV or sheet.' });
    }

    res.json({
      success: true,
      rowsProcessed: totalRows,
      importedCount,
      updatedCount
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Remote CSV fetch timed out.' });
    }
    if (err.message && err.message.startsWith('CSV row count exceeds limit')) {
      return res.status(413).json({ error: err.message });
    }
    logger.error('CSV/Sheet import failed:', err);
    next(err);
  } finally {
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
}

async function fetchWithTimeoutAndRetry(url, timeoutMs, maxRetries) {
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      const backoff = 100 * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastError;
}

async function parseAndProcessCsvStream(readable, importType) {
  const parser = readable.pipe(csv());
  let totalRows = 0;
  let totalImported = 0;
  let totalUpdated = 0;
  let batch = [];

  for await (const row of parser) {
    totalRows++;
    if (totalRows > MAX_ROWS) {
      throw new Error(`CSV row count exceeds limit of ${MAX_ROWS}`);
    }
    batch.push(sanitizeRow(row));
    if (batch.length >= BATCH_SIZE) {
      const result = await MigrationService.bulkUpsert(batch, importType);
      totalImported += result.importedCount || 0;
      totalUpdated += result.updatedCount || 0;
      batch = [];
    }
  }

  if (batch.length > 0) {
    const result = await MigrationService.bulkUpsert(batch, importType);
    totalImported += result.importedCount || 0;
    totalUpdated += result.updatedCount || 0;
  }

  return { totalRows, importedCount: totalImported, updatedCount: totalUpdated };
}

function toCsvExportUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)(?:\/.*?gid=(\d+))?/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL format.');
  }
  const id = match[1];
  const gid = match[2] || '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function sanitizeRow(row) {
  const obj = {};
  Object.entries(row).forEach(([key, val]) => {
    const cleanKey = key.trim();
    let cleanVal = typeof val === 'string' ? val.trim() : val;
    if (/date/i.test(cleanKey) && cleanVal) {
      const date = new Date(cleanVal);
      if (!isNaN(date.getTime())) {
        cleanVal = date.toISOString();
      }
    }
    obj[cleanKey] = cleanVal;
  });
  return obj;
}

module.exports = {
  importCsvSheets
};