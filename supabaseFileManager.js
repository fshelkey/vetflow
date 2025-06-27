const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function validateBucket(bucket) {
  if (typeof bucket !== 'string' || !bucket.trim()) {
    throw new Error('Invalid bucket name: must be a non-empty string')
  }
  const bucketPattern = /^[a-z0-9-]+$/
  if (!bucketPattern.test(bucket)) {
    throw new Error('Invalid bucket name: only lowercase letters, numbers, and hyphens allowed')
  }
}

function validatePath(path) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new Error('Invalid path: must be a non-empty string')
  }
  if (path.startsWith('/') || path.includes('..')) {
    throw new Error('Invalid path: must not start with "/" or contain ".."')
  }
}

/**
 * Uploads a file buffer or stream to a specified bucket and path.
 * @param {string} bucket
 * @param {string} path
 * @param {Buffer|Blob|File|ReadableStream} file
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function uploadFile(bucket, path, file, options = {}) {
  validateBucket(bucket)
  validatePath(path)
  if (!file) {
    throw new Error('No file provided for upload')
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options)
  if (error) throw error
  return data
}

/**
 * Generates a public URL for a file in storage.
 * @param {string} bucket
 * @param {string} path
 * @returns {string}
 */
function getPublicUrl(bucket, path) {
  validateBucket(bucket)
  validatePath(path)
  const { data, error } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  if (error) throw error
  return data.publicUrl
}

/**
 * Downloads a file from storage.
 * @param {string} bucket
 * @param {string} path
 * @returns {Promise<ReadableStream|Blob>}
 */
async function downloadFile(bucket, path) {
  validateBucket(bucket)
  validatePath(path)
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)
  if (error) throw error
  return data
}

/**
 * Deletes a file from storage.
 * @param {string} bucket
 * @param {string} path
 * @returns {Promise<object>}
 */
async function deleteFile(bucket, path) {
  validateBucket(bucket)
  validatePath(path)
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])
  if (error) throw error
  return data
}

/**
 * Lists files in a bucket under a given prefix.
 * @param {string} bucket
 * @param {string} [prefix='']
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
async function listFiles(bucket, prefix = '', options = {}) {
  validateBucket(bucket)
  if (prefix) validatePath(prefix)
  if (typeof options !== 'object') {
    throw new Error('Invalid options: must be an object')
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, options)
  if (error) throw error
  return data
}

/**
 * Creates a new storage bucket.
 * @param {string} bucket
 * @param {object} [config]
 * @returns {Promise<object>}
 */
async function createBucket(bucket, config = { public: false }) {
  validateBucket(bucket)
  if (typeof config !== 'object' || typeof config.public !== 'boolean') {
    throw new Error('Invalid config: must be an object with a boolean "public" property')
  }
  const { data, error } = await supabase.storage.createBucket(bucket, config)
  if (error) throw error
  return data
}

module.exports = {
  uploadFile,
  getPublicUrl,
  downloadFile,
  deleteFile,
  listFiles,
  createBucket
}