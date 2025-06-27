const fs = require('fs')
const { pipeline, Readable } = require('stream')
const { promisify } = require('util')
const { parse } = require('csv-parse')
const db = require('../db')
const { validateRows } = require('../validators/importValidator')

const ALLOWED_TABLES = [
  'patients',
  'appointments',
  'billing',
  'visits',
  'inventory',
  'lab_results',
  'invoices'
]

const asyncPipeline = promisify(pipeline)

async function parseValidateImport({ file, table }) {
  if (!ALLOWED_TABLES.includes(table)) {
    return { success: false, errors: [`Invalid table name: ${table}`] }
  }

  const rows = []
  let tempFilePath = null

  try {
    let inputStream
    if (file.buffer) {
      inputStream = Readable.from(file.buffer)
    } else if (file.path) {
      inputStream = fs.createReadStream(file.path)
      tempFilePath = file.path
    } else {
      return { success: false, errors: ['Invalid file input'] }
    }

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    parser.on('readable', () => {
      let record
      while ((record = parser.read())) {
        rows.push(record)
      }
    })

    parser.on('error', err => {
      throw err
    })

    await asyncPipeline(inputStream, parser)
  } catch (err) {
    return { success: false, errors: [`CSV parsing error: ${err.message}`] }
  } finally {
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch(() => {})
    }
  }

  const errors = validateRows(rows)
  if (errors && errors.length) {
    return { success: false, errors }
  }

  try {
    await db.transaction(async trx => {
      const chunkSize = 1000
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        await trx(table).insert(chunk)
      }
    })
    return { success: true }
  } catch (err) {
    return { success: false, errors: [err.message] }
  }
}

module.exports = { parseValidateImport }