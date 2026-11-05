import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPublicUpdate, reconcileMenuResponse } from '../src/lib/public-menu-projection.ts';

const staleMenu = () => ({
  show: {id:'show-a',capacity:8,occupiedCount:7,status:'open'},
  songs: [{id:'song-a',available:true}],
  folders: [{id:'folder-a',name:'Rock'}],
  remaining:1,
});

test('a live capacity signal still wins over a delayed older menu response', () => {
  const update={revision:'later',showId:'show-a',capacity:8,occupiedCount:8,status:'open'};
  const patched=applyPublicUpdate(staleMenu(),update);
  assert.equal(patched.remaining,0);
  assert.equal(patched.songs[0].available,false);
  const delayedResponse=applyPublicUpdate(staleMenu(),update);
  assert.equal(delayedResponse.remaining,0);
  assert.equal(delayedResponse.show.occupiedCount,8);
});

test('successive capacity signals keep the latest guest availability', () => {
  const raised={revision:'one',showId:'show-a',capacity:9,occupiedCount:7,status:'open'};
  const filled={revision:'two',showId:'show-a',capacity:9,occupiedCount:9,status:'open'};
  const first=applyPublicUpdate(staleMenu(),raised);
  assert.equal(first.remaining,2);
  const second=applyPublicUpdate(first,filled);
  assert.equal(second.remaining,0);
  assert.equal(second.songs[0].available,false);
  assert.equal(applyPublicUpdate(staleMenu(),filled).remaining,0);
});

test('a show switch disables the old menu before the full new menu arrives', () => {
  const switched=applyPublicUpdate(staleMenu(),{revision:'next',showId:'show-b',capacity:10,occupiedCount:0,status:'open'});
  assert.equal(switched.show,null);
  assert.deepEqual(switched.songs,[]);
  assert.equal(switched.remaining,0);
  const newMenu={...staleMenu(),show:{id:'show-b',capacity:10,occupiedCount:0,status:'open'}};
  assert.equal(applyPublicUpdate(newMenu,{revision:'next',showId:'show-b',capacity:10,occupiedCount:0,status:'open'}).show.id,'show-b');
});

test('a newer REST read wins after an old signal or listener failure', () => {
  const oldSignal={update:{revision:'old',showId:'show-a',capacity:8,occupiedCount:8,status:'open'},receivedAt:1000};
  const newerMenu={...staleMenu(),show:{id:'show-b',capacity:10,occupiedCount:0,status:'open'},remaining:10};
  assert.equal(reconcileMenuResponse(newerMenu,oldSignal,8000).show.id,'show-b');
  assert.equal(reconcileMenuResponse(newerMenu,null,1100).show.id,'show-b');
  const inFlight={...staleMenu(),show:{id:'show-a',capacity:8,occupiedCount:7,status:'open'}};
  assert.equal(reconcileMenuResponse(inFlight,oldSignal,900).remaining,0);
});
