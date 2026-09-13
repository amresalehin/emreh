# Subsystem Reliability Test Plan

## Objective

Turn the current type-check/build validation into a layered regression system that protects data integrity, persistence correctness, importer behavior, and critical user journeys.

## Phase 1 — executable regression gate

Status: implemented in this branch.

- Use Node's built-in test runner through the existing `tsx` dependency.
- Keep tests dependency-light so `bun install --frozen-lockfile` remains valid.
- Run tests on pull requests before the production build.
- Keep Pages deployment restricted to successful push validation on `main`/`master`.

Initial coverage:

- calendar/date normalization and coordinate validation
- timeline/map URL and polyline helpers
- note links, tags, flattening, and Markdown export
- Google Fit dataset merge/deduplication behavior

## Phase 2 — storage and persistence

Add integration tests against IndexedDB, covering:

- database creation and reopening
- read/write/delete/clear semantics
- localStorage migration and fallback behavior
- versioned compare-and-set writes
- version-conflict detection and retry behavior
- incremental updates and deduplication
- subscriber notification lifecycle
- hydration of all persisted state

Test failure cases explicitly, including transaction aborts and storage quota errors.

## Phase 3 — importer fixtures

Create small deterministic fixtures for each supported data source:

- Google Fit JSON, CSV, TCX, and GPX
- Google Keep
- Spotify
- YouTube
- Google Maps/Location History
- Google Photos
- browser history/bookmarks
- calendar
- screentime

For each importer verify valid input, empty input, malformed input, missing fields, duplicate records, timestamp normalization, unit conversion, and preservation of provenance.

## Phase 4 — canonical data integrity

Test the full transformation chain:

`source file -> parser -> normalized model -> canonical store -> reload -> derived/UI model`

Assertions should emphasize no unintended loss, duplicate creation, unit corruption, timestamp drift, or broken parent/child relationships.

Include adversarial merge cases for workouts, sessions, measurements, intervals, daily summaries, and partial imports.

## Phase 5 — application integration

Add tests for React integration boundaries:

- initial hydration before persistence subscriptions activate
- external persistence updates
- Google Fit update events
- settings persistence and legacy normalization
- modal/view state transitions
- import completion state
- error states and recovery paths

## Phase 6 — browser E2E smoke tests

Add a browser runner for the highest-value journeys:

1. first launch -> import -> reload -> verify data
2. import the same archive twice -> verify idempotency
3. edit persisted data -> reload -> verify the edit
4. navigate between major views with populated and empty datasets
5. verify production base-path routing on GitHub Pages

## Phase 7 — CI quality gates

After coverage is sufficiently broad:

- publish test and coverage summaries
- introduce conservative coverage thresholds
- keep type-check, tests, and production build mandatory for pull requests
- keep deployment dependent on successful validation
- add a small E2E smoke job for production-relevant changes

## Definition of done

A subsystem is considered covered only when its happy path, malformed input, empty state, boundary conditions, and persistence/reload behavior have explicit regression tests. Passing TypeScript compilation or a production build alone does not count as subsystem verification.
