// JobTracker push delivery: server-side only. Clients cannot send arbitrary push messages.
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const DEFAULTS = {
  newJobs: true, assignments: true, jobUpdates: true, messages: true, reminders: true,
};

async function sendToUser(uid, category, title, body, data) {
  if (!uid || !DEFAULTS.hasOwnProperty(category)) return;
  const settingsDoc = await db.doc(`users/${uid}/notificationSettings/preferences`).get();
  const preferences = settingsDoc.data() || {};
  if (preferences[category] === false) return;
  const devices = await db.collection(`users/${uid}/pushTokens`).get();
  const messages = devices.docs.map(d => d.data().token).filter(token =>
    typeof token === 'string' && /^(Expo|Exponent)PushToken\[/.test(token)
  ).map(to => ({ to, sound: 'default', title, body, data: { ...data, category }, channelId: 'jobtracker', priority: 'high' }));
  if (!messages.length) return;
  for (let i = 0; i < messages.length; i += 100) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!response.ok) {
      throw new Error(`Expo push endpoint returned ${response.status}`);
    }
    const result = await response.json();
    if (result.errors?.length) console.error('Expo push errors', result.errors);
  }
}

exports.notifySharedJobCreated = onDocumentCreated(
  'users/{employeeUid}/ownerJobs/{jobId}',
  async event => {
    const job = event.data?.data();
    if (!job?.ownerId || !job?.employeeId) return;
    const employeeUid = event.params.employeeUid;
    // Check that ownership is current and based on the protected relationship, not user-supplied text.
    const relation = await db.doc(`users/${job.ownerId}/employees/${employeeUid}`).get();
    if (relation.data()?.status !== 'active') return;
    const name = job.employeeName || 'Your employee';
    const location = [job.city, job.companyName].filter(Boolean).join(' · ');
    if (job.entrySource === 'employee-entry' && job.createdByUid === employeeUid) {
      await sendToUser(job.ownerId, 'newJobs', 'New job entered',
        `${name} added a job${location ? ' — ' + location : ''}.`,
        { type: 'shared-job-created', jobId: event.params.jobId, employeeUid });
    } else {
      await sendToUser(employeeUid, 'assignments', 'New job assignment',
        `A job has been assigned to you${location ? ' — ' + location : ''}.`,
        { type: 'job-assigned', jobId: event.params.jobId });
    }
  }
);

exports.notifySharedJobUpdated = onDocumentUpdated(
  'users/{employeeUid}/ownerJobs/{jobId}',
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || !after.ownerId || after.ownerId !== before.ownerId) return;
    if (before.status === after.status && before.date === after.date &&
        before.address === after.address && before.amount === after.amount) return;
    const employeeUid = event.params.employeeUid;
    const receiver = after.createdByUid === employeeUid ? after.ownerId : employeeUid;
    const relation = await db.doc(`users/${after.ownerId}/employees/${employeeUid}`).get();
    if (relation.data()?.status !== 'active') return;
    await sendToUser(receiver, 'jobUpdates', 'Job updated',
      `A shared job was updated${after.city ? ' — ' + after.city : ''}.`,
      { type: 'shared-job-updated', jobId: event.params.jobId, employeeUid });
  }
);
