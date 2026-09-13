import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleFitTakeout } from '../src/utils/googleFitParser';
import { keepNoteToNoteObject, parseKeepJsonObject, parseKeepFiles } from '../src/utils/keepImporter';
import { parsePinterestCsv, parsePinterestJson } from '../src/utils/pinterestSync';
import { parseScreentimeFiles, computeScreentimeFromTimeline } from '../src/utils/screentimeCalculator';
import type { TimelineItem } from '../src/types';

const asFile = (content: string, name: string, type = 'application/json'): File =>
  new File([content], name, { type });

void test('Google Fit All Data fixture preserves metric values and provenance', async () => {
  const file = asFile(JSON.stringify({
    'Data Source': 'derived:com.google.step_count.delta:sample',
    'Data Points': [
      {
        startTimeNanos: '1735732800000000000',
        endTimeNanos: '1735732860000000000',
        fitValue: [{ value: { intVal: 1234 } }],
        originDataSourceId: 'derived:steps',
      },
    ],
  }), 'Google Fit/All Data/derived_com.google.step_count.delta.json');

  const result = await parseGoogleFitTakeout(file);

  assert.equal(result.filesScanned, 1);
  assert.equal(result.filesRecognized, 1);
  assert.equal(result.parseErrors.length, 0);
  assert.equal(result.measurements.length, 1);
  assert.equal(result.measurements[0].metric, 'steps');
  assert.equal(result.measurements[0].value, 1234);
  assert.equal(result.measurements[0].unit, 'count');
  assert.equal(result.measurements[0].provenance.dataset, 'all_data');
  assert.equal(result.measurements[0].provenance.originDataSourceId, 'derived:steps');
});

void test('Google Fit sessions fixture calculates duration and nested aggregates', async () => {
  const file = asFile(JSON.stringify({
    fitnessActivity: 'running',
    startTime: '2025-01-01T10:00:00Z',
    endTime: '2025-01-01T10:45:00Z',
    segment: [{ fitnessActivity: 'running', startTime: '2025-01-01T10:05:00Z', endTime: '2025-01-01T10:40:00Z' }],
    aggregate: [
      { metricName: 'com.google.step_count.delta', intValue: 4500 },
      { metricName: 'com.google.calories.expended', floatValue: 320.5 },
    ],
  }), 'Google Fit/All Sessions/Running.json');

  const result = await parseGoogleFitTakeout(file);

  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].activityType, 'running');
  assert.equal(result.sessions[0].durationSeconds, 2700);
  assert.deepEqual(result.sessions[0].aggregates, {
    'com.google.step_count.delta': 4500,
    'com.google.calories.expended': 320.5,
  });
  assert.equal(result.sessions[0].segments.length, 1);
});

void test('Google Fit Fitbit steps fixture creates measurements and a daily summary', async () => {
  const file = asFile(JSON.stringify([
    { dateTime: '2025-02-03T08:00:00Z', value: 1000 },
    { dateTime: '2025-02-03T18:00:00Z', value: 2500 },
  ]), 'Fitbit/steps-2025-02-03.json');

  const result = await parseGoogleFitTakeout(file);

  assert.equal(result.measurements.length, 2);
  assert.equal(result.measurements[0].metric, 'steps');
  assert.equal(result.measurements[1].value, 2500);
  assert.equal(result.dailySummaries.length, 1);
  assert.equal(result.dailySummaries[0].values.steps, 3500);
});

void test('Google Fit rejects malformed sessions without inventing dates', async () => {
  const file = asFile('{"fitnessActivity":"running"}', 'Google Fit/All Sessions/broken.json');

  const result = await parseGoogleFitTakeout(file);

  assert.equal(result.sessions.length, 0);
  assert.equal(result.parseErrors.length, 1);
  assert.equal(result.parseErrors[0].reason, 'formatMismatch');
});

void test('Google Keep JSON fixture maps checklist state, labels, color and timestamps', () => {
  const note = parseKeepJsonObject({
    id: 'keep-1',
    title: 'Trip plan',
    textContent: 'Book train',
    color: 'YELLOW',
    labels: [{ name: 'Travel' }, { name: 'Travel' }],
    isPinned: true,
    createdTimestampUsec: '1735819200000000',
    userEditedTimestampUsec: '1735905600000000',
    listContent: [
      { text: 'Passport', isChecked: true },
      { text: 'Tickets', isChecked: false },
    ],
  });

  assert.ok(note);
  assert.equal(note.id, 'keep-1');
  assert.equal(note.title, 'Trip plan');
  assert.equal(note.color, 'sand');
  assert.deepEqual(note.labels, ['Travel']);
  assert.equal(note.isPinned, true);
  assert.equal(note.isChecklist, true);
  assert.deepEqual(note.checklistItems.map(item => ({ text: item.text, completed: item.completed })), [
    { text: 'Passport', completed: true },
    { text: 'Tickets', completed: false },
  ]);
  assert.equal(note.createdAt, '2025-01-02T12:00:00.000Z');
  assert.equal(note.updatedAt, '2025-01-03T12:00:00.000Z');
});

void test('Google Keep import fixture converts a JSON file into a rich note object', async () => {
  const notes = await parseKeepFiles([
    asFile(JSON.stringify({ title: 'Daily plan', textContent: 'Write\n- Ship\n## Review', labels: ['Work'] }), 'Daily plan.json'),
  ]);

  assert.equal(notes.length, 1);
  const note = keepNoteToNoteObject(notes[0]);
  assert.equal(note.title, 'Daily plan');
  assert.equal(note.icon, '💡');
  assert.deepEqual(note.tags, ['google-keep', 'Work']);
  assert.deepEqual(note.blocks.map(block => block.type), ['paragraph', 'bullet', 'h2']);
});

void test('Pinterest JSON fixture preserves source URL, board, description and image', () => {
  const result = parsePinterestJson(JSON.stringify([
    {
      id: 'pin-7',
      title: 'A recipe',
      description: 'Save this',
      board_name: 'Recipes',
      link: 'https://example.com/recipe',
      created_at: '2025-01-04T12:00:00Z',
      image_url: 'https://cdn.example.com/recipe.jpg',
    },
  ]));

  assert.equal(result.count, 1);
  assert.equal(result.items[0].title, 'A recipe');
  assert.equal(result.items[0].url, 'https://example.com/recipe');
  assert.equal(result.items[0].category, 'Recipes');
  assert.equal(result.items[0].platform, 'Pinterest');
  assert.equal(result.items[0].image_url, 'https://cdn.example.com/recipe.jpg');
  assert.equal(result.notes['https://example.com/recipe'], 'Save this');
  assert.deepEqual(result.tags['https://example.com/recipe'], ['Recipes', 'Pinterest']);
  assert.deepEqual(result.collections, ['Recipes']);
});

void test('Pinterest CSV fixture handles quoted commas and produces a stable item', () => {
  const result = parsePinterestCsv([
    'id,title,description,link,board,image,date',
    'pin-8,"Recipe, easy","A, B","https://example.com/a","Food","https://cdn.example.com/a.jpg","2025-01-05T12:00:00Z"',
  ].join('\n'));

  assert.equal(result.count, 1);
  assert.equal(result.items[0].title, 'Recipe, easy');
  assert.equal(result.items[0].subtitle, 'Food: A, B');
  assert.equal(result.items[0].url, 'https://example.com/a');
  assert.equal(result.items[0].category, 'Food');
});

void test('Screentime JSON fixture aggregates duration by date and category', async () => {
  const result = await parseScreentimeFiles([
    asFile(JSON.stringify([
      { date: '2025-01-06T08:00:00Z', appName: 'GitHub', durationMinutes: 30 },
      { date: '2025-01-06T09:00:00Z', appName: 'YouTube', durationMinutes: 20 },
      { date: '2025-01-06T10:00:00Z', appName: 'GitHub', durationMinutes: 15 },
    ]), 'screentime.json'),
  ]);

  assert.equal(result['2025-01-06'].totalMinutes, 65);
  assert.equal(result['2025-01-06'].categories.development, 45);
  assert.equal(result['2025-01-06'].categories.entertainment, 20);
  assert.equal(result['2025-01-06'].apps[0].name, 'GitHub');
  assert.equal(result['2025-01-06'].apps[0].durationMinutes, 45);
});

void test('Screentime CSV fixture converts seconds to minutes', async () => {
  const result = await parseScreentimeFiles([
    new File([
      'Date,App,Duration Seconds\n',
      '2025-01-07,Slack,120\n',
      '2025-01-07,Slack,180\n',
      '2025-01-07,YouTube,600\n',
    ].join(''),
    'screentime.csv',
    { type: 'text/csv' }),
  ]);

  assert.equal(result['2025-01-07'].totalMinutes, 15);
  assert.equal(result['2025-01-07'].apps[0].name, 'YouTube');
  assert.equal(result['2025-01-07'].apps[0].durationMinutes, 10);
  assert.equal(result['2025-01-07'].apps[1].name, 'Slack');
  assert.equal(result['2025-01-07'].apps[1].durationMinutes, 5);
});

void test('Screentime timeline computation separates sessions and app duration', () => {
  const makeItem = (ts: string, type: TimelineItem['type'], url?: string, msPlayed?: number): TimelineItem => ({
    id: `item-${ts}`,
    type,
    ts,
    dateObj: new Date(ts),
    title: type === 'spotify' ? 'Spotify' : 'Visit',
    subtitle: '',
    url,
    ms_played: msPlayed,
  });

  const day = computeScreentimeFromTimeline([
    makeItem('2025-01-08T08:00:00Z', 'browser', 'https://github.com'),
    makeItem('2025-01-08T08:05:00Z', 'browser', 'https://github.com'),
    makeItem('2025-01-08T09:00:00Z', 'spotify', undefined, 120_000),
  ], '2025-01-08');

  assert.equal(day.pickupsCount, 2);
  assert.equal(day.totalMinutes, 10);
  assert.equal(day.apps[0].name, 'GitHub');
  assert.equal(day.apps[0].durationMinutes, 8);
  assert.equal(day.apps[1].name, 'Spotify');
  assert.equal(day.apps[1].durationMinutes, 2);
});
