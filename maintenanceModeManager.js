const db = require('../db');

const FEATURE_TOGGLES_TABLE = 'feature_toggles';
const MAINTENANCE_KEY = 'maintenance';

async function isMaintenanceEnabled() {
  try {
    let record = await db(FEATURE_TOGGLES_TABLE)
      .where({ key: MAINTENANCE_KEY })
      .first();

    if (!record || record.value === undefined || record.value === null) {
      return false;
    }

    const value = record.value;

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      throw new TypeError(`Invalid numeric value for maintenance flag: ${value}`);
    }

    throw new TypeError(`Unsupported type for maintenance flag: ${typeof value}`);
  } catch (err) {
    throw new Error('Error checking maintenance mode', { cause: err });
  }
}

async function setMaintenance(enabled) {
  if (typeof enabled !== 'boolean') {
    throw new TypeError('Maintenance flag must be a boolean');
  }
  try {
    await db(FEATURE_TOGGLES_TABLE)
      .insert({ key: MAINTENANCE_KEY, value: enabled })
      .onConflict('key')
      .merge({ value: enabled });
  } catch (err) {
    throw new Error('Error setting maintenance mode', { cause: err });
  }
}

module.exports = {
  isMaintenanceEnabled,
  setMaintenance
};