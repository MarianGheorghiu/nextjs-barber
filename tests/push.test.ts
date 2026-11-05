import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedPushEndpoint } from '../supabase/functions/push-dispatch/validation.ts';
test('push accepts browser providers and rejects arbitrary URLs and internal-network targets', () => {
  for (const endpoint of ['https://fcm.googleapis.com/fcm/send/example','https://updates.push.services.mozilla.com/wpush/v2/example','https://web.push.apple.com/example','https://wns2.notify.windows.com/example']) assert.equal(allowedPushEndpoint(endpoint),true,endpoint);
  for (const endpoint of ['http://fcm.googleapis.com/example','https://fcm.googleapis.com.attacker.test/example','https://localhost/example','https://127.0.0.1/','https://169.254.169.254/','https://attacker.test/','https://fcm.googleapis.com:8080/','https://name:password@fcm.googleapis.com/','invalid']) assert.equal(allowedPushEndpoint(endpoint),false,endpoint);
});
