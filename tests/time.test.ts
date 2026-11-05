import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, atSalon, canCancel, dateKey, overlaps } from '../src/lib/time.ts';

test('data salonului este corectă lângă miezul nopții, indiferent de fusul dispozitivului', () => {
  assert.equal(dateKey(new Date('2026-11-04T22:30:00Z')), '2026-11-05');
  assert.equal(dateKey(new Date('2026-06-04T21:30:00Z')), '2026-06-05');
});
test('programările folosesc offsetul corect vara, iarna și la schimbarea orei', () => {
  assert.equal(atSalon('2026-11-04', '09:00'), '2026-11-04T07:00:00.000Z');
  assert.equal(atSalon('2026-07-04', '09:00'), '2026-07-04T06:00:00.000Z');
  assert.equal(atSalon('2026-03-29', '09:00'), '2026-03-29T06:00:00.000Z');
  assert.equal(atSalon('2026-10-25', '09:00'), '2026-10-25T07:00:00.000Z');
});
test('intervalele alăturate sunt permise, suprapunerile parțiale și incluse sunt respinse', () => {
  const t = (s: string) => `2026-11-05T${s}:00Z`;
  assert.equal(overlaps(t('09:00'),t('10:00'),t('10:00'),t('10:30')),false);
  assert.equal(overlaps(t('09:00'),t('10:00'),t('09:30'),t('10:30')),true);
  assert.equal(overlaps(t('09:00'),t('10:00'),t('09:15'),t('09:45')),true);
});
test('limita de anulare este inclusivă și calculată în timp absolut', () => {
  const now = Date.parse('2026-11-04T10:00:00Z');
  assert.equal(canCancel('2026-11-04T12:00:00Z',2,now),true);
  assert.equal(canCancel('2026-11-04T11:59:59Z',2,now),false);
});
test('calendarul trece corect între luni și ani', () => {
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
});
