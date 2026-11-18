import assert from 'node:assert/strict';
import test from 'node:test';
import { commandFeedback } from '../src/lib/command-feedback.ts';
import { translations } from '../src/lib/translations.ts';

test('confirmed actions use outcome-specific feedback, including payment language', () => {
  assert.deepEqual(commandFeedback({path: '/requests/r1/claim', role: 'guest'}), {
    kind: 'success', message: 'Your request is in the queue. The transfer is not verified.',
  });
  assert.equal(commandFeedback({path: '/musician/profile', method: 'PATCH'})?.message, 'Profile updated');
  assert.equal(commandFeedback({path: '/musician/shows/s1', method: 'PATCH', body: {capacity: 9}})?.message, 'Show capacity updated');
  assert.equal(commandFeedback({path: '/musician/songs/s1', method: 'PATCH', body: {title: 'Song', enabled: true}})?.message, 'Song updated');
  assert.equal(commandFeedback({path: '/musician/songs/s1', method: 'PATCH', body: {enabled: false}})?.message, 'Song unavailable');
  assert.equal(commandFeedback({path: '/musician/shows/s1/action', body: {action: 'pause'}})?.message, 'Requests paused');
  assert.equal(commandFeedback({path: '/musician/shows/s1/action', body: {action: 'unknown'}}), null);
});

test('all command messages have copy in every supported locale', () => {
  const actions = [
    {path:'/musician/profile',method:'PATCH'}, {path:'/musician/songs'},
    {path:'/musician/songs/s1',method:'PATCH',body:{title:'A'}},
    {path:'/musician/songs/s1',method:'PATCH',body:{enabled:true}},
    {path:'/musician/songs/s1',method:'PATCH',body:{enabled:false}},
    {path:'/musician/songs/import/preview'}, {path:'/musician/songs/import'},
    {path:'/musician/folders'}, {path:'/musician/folders/f1',method:'PATCH'},
    {path:'/musician/folders/f1',method:'DELETE'}, {path:'/musician/shows'},
    {path:'/musician/shows/s1',method:'PATCH',body:{title:'A'}},
    {path:'/musician/shows/s1',method:'PATCH',body:{capacity:10}},
    {path:'/musician/shows/s1/queue'},
    ...['open','pause','resume','finish'].map(action=>({path:'/musician/shows/s1/action',body:{action}})),
    ...['playing','played','not_performed'].map(status=>({path:'/musician/requests/r1/performance',body:{status}})),
    {path:'/requests/r1/receipt'}, {path:'/requests/r1/claim'}, {path:'/requests/r1/cancel'},
  ];
  for (const action of actions) {
    const message = commandFeedback(action)?.message;
    assert.ok(message, JSON.stringify(action));
    for (const [locale, copy] of Object.entries(translations)) assert.ok(copy[message], `${locale}: ${message}`);
  }
  const directMessages = [
    'Notifications', 'Dismiss notification', 'Your song is reserved. Transfer to join the queue.',
    'Your dedication is reserved. Transfer to join the queue.', 'Payment detail copied',
    'Print card downloaded', 'Account created. Set up your musician profile.',
    'Musician profile created', 'Signed in', 'Signed out', 'Account status refreshed',
  ];
  for (const message of directMessages) for (const [locale, copy] of Object.entries(translations)) {
    assert.ok(copy[message], `${locale}: ${message}`);
  }
});
