# Storage Evaluation

## Current State (November 2025)

### Data Size
- **Total**: ~31MB
  - `competitions.json`: 17MB
  - `techniques.json`: 14MB
  - `judoka-profiles.json`: 277KB

### Current Architecture
- **Storage Type**: JSON files
- **Location**: `data/*.json`
- **Loading Pattern**: Every API route calls `storage.load()` on each request, loading all 31MB into memory
- **Write Pattern**: Batched saves with mutex lock (after race condition fix)

## Performance Analysis

### Current Issues (Fixed)
✅ **Race Condition**: Fixed with batched operations and save mutex
- Previously: Multiple parallel processes calling `save()` simultaneously
- Now: Batched saves with promise-based mutex lock

### Remaining Concerns

1. **Memory Usage**
   - 31MB loaded into memory on every API request
   - All routes load entire dataset even if only querying small subset
   - Memory usage scales linearly with data growth

2. **Load Time**
   - JSON parsing of 31MB takes time on every request
   - No caching between requests (each route creates new `JsonStorage` instance)
   - Cold start penalty on serverless platforms

3. **Query Performance**
   - All filtering done in-memory after loading entire dataset
   - No indexing - linear search through all techniques/competitions
   - Complex filters (height ranges, multiple criteria) require full scans

4. **Scalability**
   - As data grows (e.g., crawling 2015-2025), size will increase significantly
   - Current growth trajectory suggests 50-100MB+ in near future
   - JSON approach will become increasingly slow

## Recommendations

### Option A: Keep JSON (Quick Fix) ✅ **IMPLEMENTED**
**Status**: Race condition fixed, file locking added

**Pros:**
- ✅ Simple, no migration needed
- ✅ Easy backups (just copy files)
- ✅ Works for current size (31MB)
- ✅ No additional dependencies

**Cons:**
- ⚠️ Performance degrades as data grows
- ⚠️ High memory usage on every request
- ⚠️ No query optimization
- ⚠️ Will need migration eventually

**When to Migrate**: When data exceeds 50-100MB or performance becomes unacceptable

### Option B: Migrate to SQLite (Recommended for Long-term)

**Pros:**
- ✅ Handles concurrent writes safely (WAL mode)
- ✅ Fast queries with indexes
- ✅ Lower memory footprint (only loads queried data)
- ✅ Scales to hundreds of MBs easily
- ✅ Built-in data integrity
- ✅ Supports complex queries efficiently

**Cons:**
- ⚠️ Requires migration effort
- ⚠️ Slightly more complex setup
- ⚠️ Need to update all storage methods

**Migration Effort**: Medium
- Create SQLite schema
- Migrate existing data
- Update `JsonStorage` class to `SqliteStorage`
- Update all API routes (minimal changes needed)

**When to Migrate**: 
- Now: If planning to crawl significantly more data
- Later: When JSON performance becomes an issue (50-100MB+)

### Option C: Hybrid Approach

**Keep JSON for now, add caching:**
- Add in-memory cache with TTL
- Only reload JSON when cache expires
- Reduces load time for repeated requests

**Pros:**
- Quick improvement without migration
- Reduces load time significantly

**Cons:**
- Still loads all data into memory
- Cache invalidation complexity
- Doesn't solve query performance

## Decision Matrix

| Factor | JSON (Current) | SQLite | Hybrid (JSON + Cache) |
|--------|---------------|--------|----------------------|
| Setup Complexity | ✅ Low | ⚠️ Medium | ✅ Low |
| Current Performance | ✅ Acceptable | ✅ Better | ✅ Better |
| Future Scalability | ❌ Poor | ✅ Excellent | ⚠️ Limited |
| Query Performance | ❌ Linear | ✅ Indexed | ❌ Linear |
| Memory Usage | ❌ High (31MB) | ✅ Low | ⚠️ High (31MB) |
| Migration Effort | ✅ None | ⚠️ Medium | ✅ Low |

## Recommendation

**Short-term (Now)**: ✅ **Keep JSON with fixes applied**
- Race condition fixed
- File locking implemented
- Performance acceptable for current size

**Medium-term (3-6 months)**: ⚠️ **Monitor performance**
- Track API response times
- Monitor memory usage
- Watch data growth rate

**Long-term (When needed)**: ✅ **Migrate to SQLite**
- When data exceeds 50-100MB
- When API response times degrade
- When complex queries become common

## Implementation Notes

### Current Fixes Applied
1. ✅ Batched operations (`addTechniqueWithoutSave`, `addCompetitionWithoutSave`)
2. ✅ Save mutex lock (prevents concurrent writes)
3. ✅ Batch saves in crawl route (once per batch, not per item)

### Future SQLite Migration (If Needed)
1. Install `better-sqlite3` or `sql.js`
2. Create schema for competitions, techniques, judoka_profiles
3. Add indexes on frequently queried fields (competitionId, techniqueName, height, etc.)
4. Migrate existing JSON data
5. Update storage class interface (keep same public API)
6. Update all routes (minimal changes - same interface)

## Conclusion

**Current Status**: ✅ **JSON is acceptable with fixes applied**

The race condition has been fixed, and 31MB is manageable for JSON storage. However, as data grows (especially with crawling 2015-2025), SQLite migration should be considered when:
- Data exceeds 50-100MB
- API response times become slow (>500ms)
- Memory usage becomes a concern

For now, the fixed JSON approach is sufficient and allows focus on feature development rather than infrastructure migration.

