const cron = require('node-cron');
const appointmentService = require('../services/appointmentService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const pLimit = require('p-limit');

const DAYS_AHEAD = parseInt(process.env.REMINDER_DAYS_AHEAD, 10);
if (isNaN(DAYS_AHEAD) || DAYS_AHEAD < 1) {
  throw new Error(
    `Invalid REMINDER_DAYS_AHEAD value: ${process.env.REMINDER_DAYS_AHEAD}. Must be a positive integer.`
  );
}

const TIMEZONE = process.env.TIMEZONE || 'UTC';
const CONCURRENCY_LIMIT = parseInt(process.env.REMINDER_CONCURRENCY, 10);
const LIMIT = !isNaN(CONCURRENCY_LIMIT) && CONCURRENCY_LIMIT > 0 ? CONCURRENCY_LIMIT : 5;
const limit = pLimit(LIMIT);

async function sendReminders() {
  try {
    const appointments = await appointmentService.findWithin(DAYS_AHEAD);
    if (!appointments || appointments.length === 0) {
      logger.info(`No appointments found within ${DAYS_AHEAD} day(s) ahead.`);
      return;
    }
    const tasks = appointments.map(appointment =>
      limit(async () => {
        try {
          await emailService.send({
            to: appointment.email,
            template: 'reminder',
            data: { appointment }
          });
          logger.info(
            `Sent reminder for appointment ${appointment.id} to ${appointment.email}`
          );
        } catch (err) {
          logger.error(
            `Failed to send reminder for appointment ${appointment.id} to ${appointment.email}`,
            { error: err }
          );
        }
      })
    );
    await Promise.all(tasks);
    logger.info(
      `Completed sending reminders for ${appointments.length} appointment(s).`
    );
  } catch (err) {
    logger.error('Error fetching appointments for sending reminders', {
      error: err
    });
    throw err;
  }
}

function initScheduler() {
  cron.schedule(
    '0 * * * *',
    async () => {
      logger.info('Starting appointment reminder job');
      try {
        await sendReminders();
      } catch (err) {
        logger.error('Unhandled error in appointment reminder job', {
          error: err
        });
      }
    },
    { timezone: TIMEZONE }
  );
  logger.info(
    `Appointment reminder scheduler initialized. Runs hourly at minute 0 (timezone: ${TIMEZONE}), concurrency limit: ${LIMIT}.`
  );
}

module.exports = {
  sendReminders,
  initScheduler
};