/**
 * RSVP receiver for the Mary & J-Rex invitation.
 * Paste this into Apps Script (Extensions > Apps Script) on the Google
 * Sheet that should hold the replies, then deploy it as a web app.
 * Full steps are in SETUP.md.
 */

const SHEET_NAME = 'RSVPs';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialize writes so two guests can't clobber a row

  try {
    const data = JSON.parse(e.postData.contents);

    // Ignore anything that tripped the spam trap.
    if (data.website) {
      return json({ result: 'ok' });
    }

    const name = String(data.name || '').trim();
    if (name.length < 2) {
      return json({ result: 'error', message: 'Name is required' });
    }

    const sheet = getSheet();

    sheet.appendRow([
      new Date(),
      name,
      String(data.attendance || ''),
      Number(data.guests) || 0,
      String(data.dietary || '')
    ]);

    return json({ result: 'ok' });
  } catch (err) {
    return json({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you confirm the deployment is live by opening the URL in a browser. */
function doGet() {
  return json({ result: 'ok', message: 'RSVP endpoint is running' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Received', 'Name', 'Attendance', 'Guests', 'Dietary / note']);
    sheet.getRange('A1:E1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
