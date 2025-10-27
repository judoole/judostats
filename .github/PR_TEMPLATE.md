# Pull Request: Judoka Tab with Waza Statistics

## Description
This PR adds a new "Judoka" tab that enables users to view statistics for individual judoka, including their favorite waza (techniques), usage counts, and scoring breakdowns.

## Issue
Closes #1 - Add Judoka Tab for viewing judoka statistics

## Changes Made
- **Storage Layer** (`lib/storage.ts`):
  - Added `getJudokaList()` method to retrieve and search judoka by name
  - Added `getJudokaStats()` method to get detailed waza statistics for a specific judoka
  - Stats include waza count, percentage, average score, and breakdown by Ippon/Waza-ari/Yuko

- **API Layer** (`app/api/judoka/route.ts`):
  - New API endpoint for fetching judoka data
  - Supports search functionality by judoka name
  - Supports fetching detailed stats for a specific judoka by ID
  - Includes optional filtering support

- **UI Layer** (`app/judoka/page.tsx`):
  - New judoka page with search interface
  - Displays search results with judoka names and technique counts
  - Shows detailed statistics for selected judoka including:
    - Favorite waza (techniques) breakdown
    - Usage count for each waza
    - Percentage of total techniques
    - Average score per waza
    - Breakdown by score type (Ippon, Waza-ari, Yuko)
  - Visual progress bars showing waza usage percentage

- **Navigation** (`app/layout.tsxق`):
  - Added "Judoka" link to the main navigation

## Testing
- [ ] Can search for judoka by name
- [ ] Search returns appropriate results
- [ ] Can view detailed statistics for a selected judoka
- [ ] Waza breakdown displays correctly with counts and percentages
- [ ] Score breakdown (Ippon/Waza-ari/Yuko) is accurate
- [ ] Navigation link works correctly

## Screenshots
(Add screenshots if available)

## Notes
- The implementation uses the existing `competitor_id` and `competitor_name` fields from the techniques data
- Search is case-insensitive and matches partial names
- Judoka list is sorted by total technique count (descending)
- Performance consideration: Initial judoka list is limited to first 100 results

