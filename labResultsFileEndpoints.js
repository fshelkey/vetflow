const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const asyncHandler = require('express-async-handler')

const router = express.Router()
const UPLOAD_DIR = process.env.LAB_RESULTS_UPLOAD_DIR || path.join(__dirname, '../uploads/lab-results')
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/png,image/jpeg').split(',')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function sanitizeName(name) {
  return name.replace(/[^A-Za-z0-9._-]/g, '_')
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const random = Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
    const safeOriginal = sanitizeName(base)
    const name = `${req.params.labResultId}-${timestamp}-${random}-${safeOriginal}${ext}`
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'))
    }
    cb(null, true)
  }
})

router.post(
  '/:labResultId/files',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    res.status(201).json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadPath: req.file.path
    })
  })
)

router.get(
  '/:labResultId/files',
  asyncHandler(async (req, res) => {
    const labResultId = req.params.labResultId
    const dir = UPLOAD_DIR
    let files
    try {
      files = await fs.promises.readdir(dir)
    } catch (err) {
      return res.status(500).json({ error: 'Could not read upload directory' })
    }
    const list = []
    for (const name of files) {
      if (!name.startsWith(`${labResultId}-`)) {
        continue
      }
      const filePath = path.join(dir, name)
      let stats
      try {
        stats = await fs.promises.stat(filePath)
      } catch {
        continue
      }
      // parse originalName
      const match = name.match(new RegExp(`^${labResultId}-(\\d+)-(\\d+)-(.+)$`))
      const originalName = match ? match[3] : name
      list.push({
        fileId: name,
        originalName,
        size: stats.size,
        uploadedAt: stats.birthtime
      })
    }
    res.json(list)
  })
)

router.get(
  '/:labResultId/files/:fileId',
  asyncHandler(async (req, res) => {
    const labResultId = req.params.labResultId
    const fileName = req.params.fileId
    const filePath = path.resolve(UPLOAD_DIR, fileName)
    const uploadDirResolved = path.resolve(UPLOAD_DIR) + path.sep
    if (
      !filePath.startsWith(uploadDirResolved) ||
      !fileName.startsWith(`${labResultId}-`)
    ) {
      return res.status(404).json({ error: 'File not found' })
    }
    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch {
      return res.status(404).json({ error: 'File not found' })
    }
    const match = fileName.match(new RegExp(`^${labResultId}-(\\d+)-(\\d+)-(.+)$`))
    const originalName = match ? match[3] : fileName
    res.download(filePath, originalName)
  })
)

router.delete(
  '/:labResultId/files/:fileId',
  asyncHandler(async (req, res) => {
    const labResultId = req.params.labResultId
    const fileName = req.params.fileId
    const filePath = path.resolve(UPLOAD_DIR, fileName)
    const uploadDirResolved = path.resolve(UPLOAD_DIR) + path.sep
    if (
      !filePath.startsWith(uploadDirResolved) ||
      !fileName.startsWith(`${labResultId}-`)
    ) {
      return res.status(404).json({ error: 'File not found' })
    }
    try {
      await fs.promises.access(filePath, fs.constants.W_OK)
    } catch {
      return res.status(404).json({ error: 'File not found' })
    }
    await fs.promises.unlink(filePath)
    res.status(204).send()
  })
)

module.exports = router