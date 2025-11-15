# Why SQLite (sql.js) Doesn't Work

## The Problem

**sql.js** is a WebAssembly-based SQLite implementation designed for **browser environments**, not Node.js server environments with bundlers like webpack/Turbopack.

## Technical Issues

### 1. WebAssembly Bundling
- sql.js includes a `.wasm` file that webpack tries to bundle
- Webpack 5 requires explicit WASM configuration (`asyncWebAssembly: true`)
- Even with configuration, sql.js's WASM loader has complex dependencies that webpack can't resolve

### 2. Module Resolution Errors
```
Module not found: Can't resolve 'a'
```
- sql.js's WASM loader uses obfuscated/minified code
- Webpack tries to statically analyze this code during build
- The loader code has dependencies that don't exist in the bundle context

### 3. Next.js 16 + Turbopack
- Next.js 16 uses Turbopack by default
- Turbopack has different bundling behavior than webpack
- sql.js wasn't designed for these modern bundlers

### 4. Dynamic Import Limitations
- Even with `eval('import')` to prevent static analysis, webpack still processes the file
- The import statement in `sqlite-storage.ts` causes webpack to analyze sql.js
- Webpack can't properly externalize sql.js because it needs to process the WASM file

## Why This Happens

sql.js was designed for:
- ✅ Browser environments (load WASM as asset)
- ✅ Direct script tags (no bundling)
- ✅ Simple Node.js scripts (no bundling)

sql.js was NOT designed for:
- ❌ Next.js API routes (bundled server code)
- ❌ Webpack/Turbopack bundling
- ❌ Server-side rendering with bundlers

## Solutions

### Option 1: Use better-sqlite3 (Native)
**Pros:**
- Fastest and most reliable
- Designed for Node.js
- No WASM/bundling issues

**Cons:**
- Requires native compilation (Xcode/build tools)
- Failed earlier due to missing build tools

### Option 2: Use Prisma with SQLite
**Pros:**
- Works well with Next.js
- Type-safe queries
- Already installed in project

**Cons:**
- Requires schema definition
- More setup work
- Different API than current storage

### Option 3: Stick with JSON (Current)
**Pros:**
- ✅ Already working
- ✅ Race conditions fixed
- ✅ Simple and reliable
- ✅ No bundling issues

**Cons:**
- Slower for large datasets
- Higher memory usage

## Recommendation

**For now: Stick with JSON**
- It's working reliably
- Race conditions are fixed
- 31MB is manageable
- No bundling complexity

**For future: Consider Prisma + SQLite**
- Better Next.js integration
- Type safety
- Reliable and well-supported

## Conclusion

sql.js doesn't work because it's fundamentally incompatible with Next.js's bundling system. The WASM file and loader code can't be properly processed by webpack/Turbopack in a server-side context.

