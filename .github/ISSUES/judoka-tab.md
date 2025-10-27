# Feature: Judoka Statistics Tab

## Description
Create a new tab/page for viewing judoka statistics, specifically the breakdown of favorite waza (techniques) for each judoka.

## Requirements
- Display judoka statistics showing:
  - Breakdown of favorite waza (techniques) for each judoka
  - Number of uses of each waza
  - Percentage or scoring of waza usage
  - Filter/search functionality to find specific judoka

## Acceptance Criteria
- [ ] New API endpoint exists to fetch judoka statistics
- [ ] New page/section displays judoka search and statistics
- [ ] Each judoka can be viewed with their technique breakdown
- [ ] Statistics show waza names, count of uses, and percentage of total techniques
- [ ] Search functionality allows finding specific judoka
- [ ] Visual display is clean and follows existing design patterns

## Technical Notes
- Use existing data in `data/techniques.json` which contains `competitor_id`, `competitor_name`, and `technique_name`
- Add method to `lib/storage.ts` to aggregate techniques by judoka
- Create API route `/api/judoka` or similar
- Add navigation link in `app/layout.tsx`
- Follow existing patterns from Dashboard and Techniques pages

## Priority
Medium

## Labels
enhancement, feature

