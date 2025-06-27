const {google} = require('googleapis');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error(
    'Missing required Google OAuth2 environment variables. ' +
    'Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.'
  );
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

/**
 * Syncs an appointment to Google Calendar.
 * If appointment.eventId is provided, updates the existing event.
 * Otherwise, inserts a new event.
 *
 * @param {Object} appointment - Appointment data.
 * @param {string|Date|number} appointment.start - Event start time.
 * @param {string|Date|number} appointment.end - Event end time.
 * @param {string} [appointment.summary] - Event title.
 * @param {string} [appointment.description] - Event description.
 * @param {string} [appointment.calendarId='primary'] - Calendar ID.
 * @param {string} [appointment.eventId] - Google Calendar event ID for updates.
 * @param {Object} userToken - OAuth2 token for a Google user.
 * @param {string} userToken.access_token - Access token.
 * @param {string} [userToken.refresh_token] - Refresh token.
 * @returns {Promise<Object>} The created or updated Google Calendar event.
 */
async function syncToGoogle(appointment, userToken) {
  if (!appointment || typeof appointment !== 'object') {
    throw new Error('Appointment object is required');
  }
  if (!userToken || typeof userToken !== 'object') {
    throw new Error('User OAuth token object is required');
  }
  if (!userToken.access_token) {
    throw new Error('User OAuth token must include access_token');
  }

  const {
    start,
    end,
    summary = '',
    description = '',
    calendarId = 'primary',
    eventId
  } = appointment;

  if (start == null || end == null) {
    throw new Error('Appointment start and end times are required');
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid start time: ${start}`);
  }
  if (isNaN(endDate.getTime())) {
    throw new Error(`Invalid end time: ${end}`);
  }

  oauth2Client.setCredentials(userToken);
  const calendar = google.calendar({version: 'v3', auth: oauth2Client});

  const eventResource = {
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
    summary,
    description
  };

  try {
    let response;
    if (eventId) {
      response = await calendar.events.update({
        calendarId,
        eventId,
        resource: eventResource
      });
    } else {
      response = await calendar.events.insert({
        calendarId,
        resource: eventResource
      });
    }
    return response.data;
  } catch (error) {
    console.error('Error syncing appointment to Google Calendar:', error);
    throw error;
  }
}

module.exports = { syncToGoogle };