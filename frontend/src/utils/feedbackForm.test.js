import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackPayload } from './feedbackForm.js';

test('trims the message and drops a blank email', () => {
  assert.deepEqual(buildFeedbackPayload({ message: '  Map is great  ', email: '   ' }), {
    message: 'Map is great',
    email: null,
  });
});

test('keeps a valid email', () => {
  const result = buildFeedbackPayload({ message: 'hi', email: ' tester@scarletmail.rutgers.edu ' });
  assert.equal(result.email, 'tester@scarletmail.rutgers.edu');
});

test('rejects an empty message', () => {
  assert.ok(buildFeedbackPayload({ message: '   ', email: '' }).error);
  assert.ok(buildFeedbackPayload({ email: '' }).error);
});

test('rejects a message over 4000 characters', () => {
  assert.ok(buildFeedbackPayload({ message: 'a'.repeat(4001), email: '' }).error);
});

test('rejects a malformed email', () => {
  assert.ok(buildFeedbackPayload({ message: 'hi', email: 'nope' }).error);
});
