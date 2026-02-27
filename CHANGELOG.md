# Changelog

All notable changes to the RAG Dashboard project.

## [Unreleased] - 2026-02-27

### Added

- **API Status Endpoint** (`/api/status`)
  - New serverless function for live pipeline health monitoring
  - Returns structured JSON with system status, pipeline data, and infrastructure health
  - Calculates trading board rankings (BEST/MIDDLE/WORST) dynamically
  - Automatic fallback to local JSON when external sources unavailable
  - CORS-enabled for cross-origin requests
  - Response includes metadata: generation time, data source, API version

- **Trading Board Section**
  - Comparative pipeline performance visualization
  - **BEST**: Fixed position showing top performer with detailed stats
  - **WORST**: Fixed position showing bottom performer with gap analysis
  - **MIDDLE**: Rolling placeholders for intermediate performers
  - Trend indicators: stable/recovering/at-risk
  - Summary stats: passing/at-risk/critical pipeline counts
  - Responsive 3-column layout (stacks on mobile)

- **Fallback Data System**
  - Local `fallback-status.json` for offline operation
  - Graceful degradation when backend/external sources unavailable
  - UI indicator showing when fallback data is active
  - Dashboard remains functional without external connectivity

### Changed

- Updated `vercel.json` with API route rewrite rules and CORS headers
- Enhanced error handling in data loading functions
- Root `index.html` now includes trading board and fallback support

### Technical Details

- API endpoint: `GET /api/status`
- Refresh interval: 30 seconds
- Fallback data location: `api/fallback-status.json`
- Trading board auto-calculates rankings from pipeline accuracy data
