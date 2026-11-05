import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, getBytes, uploadBytes } from 'firebase/storage';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-musica-non-prod',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await environment?.cleanup(); });

for (const identity of ['unauthenticated', 'guest', 'musician']) {
  test(`${identity} can read public show updates but cannot write them`, async () => {
    const context = identity === 'unauthenticated'
      ? environment.unauthenticatedContext()
      : environment.authenticatedContext(identity, { firebase: { sign_in_provider: identity === 'guest' ? 'anonymous' : 'password' } });
    const update = doc(context.firestore(), 'publicUpdates/jony');
    await assertSucceeds(getDoc(update));
    await assertFails(setDoc(update, {revision:'fake',capacity:999}));
  });
  test(`${identity} cannot bypass the REST API to access Firestore or private media`, async () => {
    const context = identity === 'unauthenticated'
      ? environment.unauthenticatedContext()
      : environment.authenticatedContext(identity, { firebase: { sign_in_provider: identity === 'guest' ? 'anonymous' : 'password' } });
    const document = doc(context.firestore(), 'musicians/musician/requests/private-request');
    await assertFails(getDoc(document));
    await assertFails(setDoc(document, { status: 'queued', dedication: 'Private' }));
    const receipt = ref(context.storage(), 'receipts/private-request/proof.jpg');
    await assertFails(getBytes(receipt));
    await assertFails(uploadBytes(receipt, new Uint8Array([1, 2, 3])));
  });
}
