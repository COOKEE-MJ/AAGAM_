// Unit tests for business rules: photo 70% rule, shelter status, official source check, SOS transitions, and clusters.
// Run with: node --test tests/rules.test.mjs or npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideAiStatus,
  shelterAutoStatus,
  isOfficialSource,
  canTransition,
  markClusters,
  distanceMeters,
  decideAlertAction
} from '../src/rules.js';
import { HAZARD_LIST } from '../src/hazards.js';

test('1. decideAiStatus: returns ai_verified when confidence >= 0.70 and label matches', () => {
  const result = decideAiStatus({ type: 'flooding', label: 'flood', confidence: 0.85 });
  assert.equal(result, 'ai_verified');
});

test('2. decideAiStatus: returns needs_review when confidence < 0.70', () => {
  const result = decideAiStatus({ type: 'flooding', label: 'flood', confidence: 0.65 });
  assert.equal(result, 'needs_review');
});

test('3. decideAiStatus: returns needs_review when label does not match type', () => {
  const result = decideAiStatus({ type: 'flooding', label: 'fire', confidence: 0.95 });
  assert.equal(result, 'needs_review');
});

test('4. decideAiStatus: returns needs_review when label is null or missing', () => {
  const result = decideAiStatus({ type: 'flooding', label: null, confidence: 0.90 });
  assert.equal(result, 'needs_review');
});

test('5. decideAiStatus: allows building_damage match with earthquake_damage', () => {
  const result = decideAiStatus({ type: 'building_damage', label: 'earthquake_damage', confidence: 0.75 });
  assert.equal(result, 'ai_verified');
});

test('6. shelterAutoStatus: returns open when below 80% occupancy', () => {
  assert.equal(shelterAutoStatus(100, 50), 'open');
  assert.equal(shelterAutoStatus(100, 79), 'open');
});

test('7. shelterAutoStatus: returns filling at exactly 80% occupancy', () => {
  assert.equal(shelterAutoStatus(100, 80), 'filling');
});

test('8. shelterAutoStatus: returns filling between 80% and 99% occupancy', () => {
  assert.equal(shelterAutoStatus(200, 180), 'filling');
});

test('9. shelterAutoStatus: returns full at 100% or greater occupancy', () => {
  assert.equal(shelterAutoStatus(100, 100), 'full');
  assert.equal(shelterAutoStatus(100, 120), 'full');
});

test('10. shelterAutoStatus: returns full when capacity is 0', () => {
  assert.equal(shelterAutoStatus(0, 0), 'full');
});

test('11. isOfficialSource: recognizes .gov.in domains as official', () => {
  assert.equal(isOfficialSource('https://mausam.imd.gov.in/warning'), true);
  assert.equal(isOfficialSource('https://ffs.india-water.gov.in/alerts'), true);
});

test('12. isOfficialSource: recognizes .nic.in domains as official', () => {
  assert.equal(isOfficialSource('https://sachet.ndma.nic.in/bulletin'), true);
});

test('13. isOfficialSource: rejects unofficial sources', () => {
  assert.equal(isOfficialSource('https://news.example.com/disaster'), false);
  assert.equal(isOfficialSource('not-a-valid-url'), false);
});

test('14. canTransition: allows valid transitions for new SOS', () => {
  assert.equal(canTransition('new', 'acknowledged'), true);
  assert.equal(canTransition('new', 'dispatched'), true);
  assert.equal(canTransition('acknowledged', 'resolved'), true);
});

test('15. canTransition: prevents invalid or backward transitions', () => {
  assert.equal(canTransition('resolved', 'new'), false);
  assert.equal(canTransition('cancelled', 'acknowledged'), false);
});

test('16. markClusters: marks items as isCluster when 3 or more are within 500m', () => {
  const baseLat = 28.6139;
  const baseLng = 77.2090;
  const items = [
    { id: 1, lat: baseLat, lng: baseLng },
    { id: 2, lat: baseLat + 0.0005, lng: baseLng + 0.0005 }, // ~75m
    { id: 3, lat: baseLat - 0.0005, lng: baseLng - 0.0005 }, // ~75m
    { id: 4, lat: baseLat + 0.05, lng: baseLng + 0.05 },     // ~7.5km (far)
  ];
  const clustered = markClusters(items, 500);
  assert.equal(clustered[0].isCluster, true);
  assert.equal(clustered[1].isCluster, true);
  assert.equal(clustered[2].isCluster, true);
  assert.equal(clustered[3].isCluster, false);
});

test('17. decideAlertAction: new alert returns action=created', () => {
  assert.equal(decideAlertAction({ msgType: 'alert' }).action, 'created');
});

test('18. decideAlertAction: update and cancel without match return action=no_match', () => {
  assert.equal(decideAlertAction({ msgType: 'update', exists: false }).action, 'no_match');
  assert.equal(decideAlertAction({ msgType: 'cancel', exists: false }).action, 'no_match');
});

test('19. decideAlertAction: official update returns updated, official cancel returns cancelled', () => {
  assert.equal(decideAlertAction({ msgType: 'update', exists: true, isOfficial: true }).action, 'updated');
  assert.equal(decideAlertAction({ msgType: 'cancel', exists: true, isOfficial: true }).action, 'cancelled');
});

test('20. decideAlertAction: unofficial returns needs_officer; withdrawn update is ignored', () => {
  assert.equal(decideAlertAction({ msgType: 'update', exists: true, isOfficial: false }).action, 'needs_officer');
  assert.equal(decideAlertAction({ msgType: 'cancel', exists: true, isOfficial: false }).action, 'needs_officer');
  assert.equal(decideAlertAction({ msgType: 'update', exists: true, isOfficial: true, isWithdrawn: true }).action, 'ignored');
});

