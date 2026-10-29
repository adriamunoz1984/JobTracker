// Run with: npm run test:security
// This exercises repository firestore.rules in a LOCAL emulator only.
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-jobtracker-security',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
  const ownerId = 'test-owner', employeeId = 'test-employee', outsiderId = 'test-outsider';
  const owner = testEnv.authenticatedContext(ownerId).firestore();
  const employee = testEnv.authenticatedContext(employeeId).firestore();
  const outsider = testEnv.authenticatedContext(outsiderId).firestore();
  const anonymous = testEnv.unauthenticatedContext().firestore();
  const personal = ['users', employeeId, 'jobs', 'private-job'];
  const shared = ['users', employeeId, 'ownerJobs', 'company-job'];

  let count = 0;
  const check = async (label, allowed, promise) => {
    await (allowed ? assertSucceeds(promise) : assertFails(promise));
    count++;
    console.log(`PASS ${label}`);
  };

  try {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', ownerId, 'employees', employeeId), {
        status: 'active', ownerId, uid: employeeId,
      });
      await setDoc(doc(db, ...personal), {
        amount: 400, jobType: 'personal', employeeCommissionRate: 100,
      });
      await setDoc(doc(db, ...shared), {
        amount: 500, jobType: 'employee', employeeId, assignedTo: employeeId,
        ownerId, employeeCommissionRate: 50, createdByUid: ownerId,
      });
    });

    await check('Employee reads own independent job', true, getDoc(doc(employee, ...personal)));
    await check('Owner cannot read employee independent job', false, getDoc(doc(owner, ...personal)));
    await check('Outsider cannot read employee independent job', false, getDoc(doc(outsider, ...personal)));
    await check('Anonymous cannot read employee independent job', false, getDoc(doc(anonymous, ...personal)));
    await check('Owner cannot change employee independent job', false, updateDoc(doc(owner, ...personal), { amount: 10 }));
    await check('Owner cannot delete employee independent job', false, deleteDoc(doc(owner, ...personal)));
    await check('Owner cannot create an employee private job', false, setDoc(doc(owner, 'users', employeeId, 'jobs', 'intrusion'), { jobType: 'personal' }));
    await check('Employee can update own independent job', true, updateDoc(doc(employee, ...personal), { amount: 420 }));
    await check('Employee reads own shared company job', true, getDoc(doc(employee, ...shared)));
    await check('Owner reads employee shared company job', true, getDoc(doc(owner, ...shared)));
    await check('Outsider cannot read employee shared company job', false, getDoc(doc(outsider, ...shared)));
    await check('Anonymous cannot read employee shared company job', false, getDoc(doc(anonymous, ...shared)));
    await check('Employee cannot change shared job ownership', false, updateDoc(doc(employee, ...shared), { ownerId: outsiderId }));
    await check('Employee cannot change commission on shared job', false, updateDoc(doc(employee, ...shared), { employeeCommissionRate: 100 }));
    await check('Owner can update shared company job', true, updateDoc(doc(owner, ...shared), { amount: 550 }));

    console.log(`\nAll ${count} Firestore security checks passed (local emulator).\n`);
  } finally {
    await testEnv.cleanup();
  }
}
main().catch(error => {
  console.error('Firestore security tests FAILED:', error);
  process.exitCode = 1;
});
