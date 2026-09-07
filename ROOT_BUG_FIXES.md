Emreh root bug fixes and audit notes from 2026-09-08.

The authoritative application tree is the repository root. The duplicate nested application tree was removed from the fixed package.

P0 integrity fixes include complete persistence coverage for backup/restore, safer storage error propagation, improved import identity/deduplication, Google Fit merge behavior, removal of fabricated factual health/screentime values, and local calendar-date handling.

Build verification was limited by dependency installation timing in the previous environment; source/syntax validation was completed, but a clean production Electron build was not completed there.
