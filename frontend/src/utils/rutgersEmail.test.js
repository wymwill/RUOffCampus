import test from 'node:test';
import assert from 'node:assert/strict';
import { isRutgersEmail } from './rutgersEmail.js';

test('Rutgers emails and subdomains are Rutgers', () => {
  for (const email of ['ay559@scarletmail.rutgers.edu', 'first.last@rutgers.edu', ' Doc@RWJMS.Rutgers.edu ']) {
    assert.equal(isRutgersEmail(email), true, email);
  }
});

test('other emails are not Rutgers', () => {
  for (const email of ['someone@gmail.com', 'x@rutgers.edu.evil.com', 'x@notrutgers.edu', '@rutgers.edu', '', null]) {
    assert.equal(isRutgersEmail(email), false, String(email));
  }
});
