import { createECDH, randomBytes } from 'node:crypto';
const key = createECDH('prime256v1');
key.generateKeys();
console.log('VAPID_PUBLIC_KEY=' + key.getPublicKey().toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + key.getPrivateKey().toString('base64url'));
console.log('PUSH_DISPATCH_SECRET=' + randomBytes(32).toString('hex'));
console.log('\nCheia publică poate fi folosită în VITE_VAPID_PUBLIC_KEY. Păstrează celelalte valori exclusiv în secretele backendului.');
