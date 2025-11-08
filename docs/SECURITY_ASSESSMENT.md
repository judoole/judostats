# Security Assessment Report

**Date:** January 2025  
**Repository:** https://github.com/judoole/judostats  
**Assessment Type:** Code Review & Security Analysis

## Executive Summary

This security assessment identifies several vulnerabilities and security concerns in the Judo Stats application. While the application is primarily read-only and uses public data, there are significant security risks that should be addressed, particularly around the data crawling endpoints and input validation.

**Risk Level:** Medium to High

---

## Critical Issues

### 1. Unprotected Data Crawling Endpoint ⚠️ HIGH

**Location:** `app/api/crawl/route.ts`, `app/api/crawl-single/route.ts`

**Issue:** The `/api/crawl` and `/api/crawl-single` endpoints are publicly accessible without authentication or rate limiting. Anyone can trigger expensive data crawling operations.

**Impact:**

- Resource exhaustion (DoS)
- Unauthorized data collection
- Server performance degradation
- Potential abuse of external API (IJF)

**Recommendation:**

```typescript
// Add authentication middleware
export async function POST(request: Request) {
  // Check for API key or authentication
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.CRAWL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Add rate limiting
  // ... rest of code
}
```

**Priority:** High - Implement immediately

---

### 2. Server-Side Request Forgery (SSRF) Vulnerability ⚠️ HIGH

**Location:** `app/api/test-ijf/route.ts`

**Issue:** The endpoint constructs URLs from user input without validation:

```typescript
const compId = searchParams.get('compId') || '3081';
const catUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=competition.categories_full&params%5Bid_competition%5D=${compId}`;
```

**Impact:**

- Attackers could make requests to internal services
- Potential data exfiltration
- Bypass firewall restrictions

**Recommendation:**

```typescript
// Validate compId is a number
const compId = searchParams.get('compId') || '3081';
const compIdNum = parseInt(compId);
if (isNaN(compIdNum) || compIdNum < 1 || compIdNum > 999999) {
  return NextResponse.json({ error: 'Invalid competition ID' }, { status: 400 });
}
```

**Priority:** High - Fix immediately

---

### 3. Missing Input Validation ⚠️ MEDIUM-HIGH

**Location:** Multiple API routes

**Issues:**

- No validation on query parameters (competitionId, year, limit, etc.)
- No sanitization of user inputs
- Potential for injection attacks through malformed data

**Examples:**

- `app/api/judoka/route.ts`: `judokaId` and `searchTerm` not validated
- `app/api/techniques/[name]/route.ts`: Technique name not validated
- `app/api/stats/route.ts`: All filter parameters unvalidated

**Impact:**

- Type confusion attacks
- Potential crashes from invalid data
- Data corruption

**Recommendation:**

```typescript
// Add input validation library (zod, joi, or yup)
import { z } from 'zod';

const judokaIdSchema = z.string().regex(/^\d+$/).transform(Number);
const searchTermSchema = z.string().max(100).optional();

// Validate before use
const validatedId = judokaIdSchema.parse(judokaId);
```

**Priority:** Medium-High - Implement validation layer

---

## Medium Priority Issues

### 4. Missing Security Headers ⚠️ MEDIUM

**Location:** `next.config.ts`

**Issue:** No security headers configured (CSP, HSTS, X-Frame-Options, etc.)

**Impact:**

- Vulnerable to XSS attacks
- Clickjacking risks
- Missing HTTPS enforcement

**Recommendation:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

**Priority:** Medium - Add security headers

---

### 5. No Rate Limiting ⚠️ MEDIUM

**Location:** All API routes

**Issue:** No rate limiting on any endpoints

**Impact:**

- API abuse
- Resource exhaustion
- Potential DoS attacks

**Recommendation:**

- Implement rate limiting using middleware or a library like `@upstash/ratelimit`
- Set appropriate limits per endpoint type
- Consider different limits for authenticated vs anonymous users

**Priority:** Medium - Implement rate limiting

---

### 6. Error Information Disclosure ⚠️ MEDIUM

**Location:** Multiple API routes

**Issue:** Error messages may leak sensitive information:

```typescript
catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

**Impact:**
- Stack traces exposed in production
- Internal system information leaked
- Potential path disclosure

**Recommendation:**

```typescript
catch (error: any) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'An error occurred' },
    { status: 500 }
  );
}
```

**Priority:** Medium - Sanitize error responses

---

### 7. Path Traversal Risk ⚠️ MEDIUM

**Location:** `lib/storage.ts`

**Issue:** File operations use `path.join()` but don't validate paths:

```typescript
const DATA_DIR = path.join(process.cwd(), 'data');
private competitionsPath = path.join(DATA_DIR, 'competitions.json');
```

**Impact:**

- While currently safe, future changes could introduce vulnerabilities
- No validation that files stay within DATA_DIR

**Recommendation:**

```typescript
import path from 'path';

function validatePath(filePath: string, baseDir: string): boolean {
  const resolved = path.resolve(baseDir, filePath);
  const base = path.resolve(baseDir);
  return resolved.startsWith(base);
}
```

**Priority:** Medium - Add path validation

---

### 8. No CORS Configuration ⚠️ LOW-MEDIUM

**Location:** `next.config.ts`

**Issue:** No explicit CORS policy configured

**Impact:**

- Unclear cross-origin access policy
- Potential for unintended API access

**Recommendation:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
        ],
      },
    ];
  },
};
```

**Priority:** Low-Medium - Configure CORS explicitly

---

## Low Priority Issues

### 9. Missing Request Size Limits ⚠️ LOW

**Location:** POST endpoints

**Issue:** No explicit limits on request body size

**Impact:**

- Potential memory exhaustion from large requests

**Recommendation:**

- Configure body size limits in Next.js
- Add validation for maximum request size

**Priority:** Low - Add request size limits

---

### 10. Test Endpoint in Production ⚠️ LOW

**Location:** `app/api/test-ijf/route.ts`

**Issue:** Test/debug endpoint is accessible in production

**Impact:**

- Information disclosure
- Unnecessary attack surface

**Recommendation:**

- Remove or protect with authentication
- Only enable in development mode

**Priority:** Low - Remove or protect test endpoints

---

### 11. Dependency Vulnerabilities ⚠️ LOW

**Location:** `package.json`

**Issue:** No automated dependency scanning

**Impact:**

- Potential vulnerabilities in dependencies

**Recommendation:**

- Run `npm audit` regularly
- Use Dependabot or similar for automated updates
- Consider using `npm audit fix` for known vulnerabilities

**Priority:** Low - Set up dependency scanning

---

## Positive Security Practices ✅

1. **Environment Variables:** `.env*` files are properly gitignored
2. **No Hardcoded Secrets:** No API keys or secrets found in code
3. **No XSS Vectors:** No use of `dangerouslySetInnerHTML` or `eval()`
4. **Data Directory Protection:** `/data` directory is gitignored
5. **TypeScript:** Type safety helps prevent some classes of errors
6. **Error Handling:** Most endpoints have try-catch blocks

---

## Recommendations Summary

### Immediate Actions (High Priority)
1. ✅ Add authentication to crawl endpoints
2. ✅ Fix SSRF vulnerability in test-ijf endpoint
3. ✅ Add input validation to all API routes
4. ✅ Implement rate limiting

### Short-term Actions (Medium Priority)
5. ✅ Add security headers
6. ✅ Sanitize error messages
7. ✅ Add path validation
8. ✅ Configure CORS explicitly

### Long-term Actions (Low Priority)
9. ✅ Add request size limits
10. ✅ Remove/protect test endpoints
11. ✅ Set up dependency scanning

---

## Security Checklist

- [ ] Authentication on sensitive endpoints
- [ ] Rate limiting implemented
- [ ] Input validation on all user inputs
- [ ] Security headers configured
- [ ] Error messages sanitized
- [ ] CORS policy defined
- [ ] SSRF vulnerabilities fixed
- [ ] Path traversal protections
- [ ] Request size limits
- [ ] Dependency scanning enabled
- [ ] Test endpoints removed/protected
- [ ] Security monitoring/logging

---

## Additional Security Considerations

### For Production Deployment

1. **Environment Variables:**
   - Ensure all sensitive configs use environment variables
   - Use secret management (Vercel Secrets, AWS Secrets Manager, etc.)

2. **Monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Monitor API usage patterns
   - Alert on suspicious activity

3. **Backup & Recovery:**
   - Regular backups of data files
   - Disaster recovery plan

4. **Compliance:**
   - Review IJF data usage terms
   - Ensure GDPR compliance if handling EU data
   - Privacy policy for data collection

---

## Vercel Deployment Considerations

**Deployment Target:** Vercel Hobby Account

### Vercel-Specific Security Features ✅

1. **Automatic HTTPS:** Vercel provides HTTPS by default - no additional configuration needed
2. **DDoS Protection:** Built-in DDoS protection at the edge
3. **Automatic Security Headers:** Some headers are added automatically (varies by plan)
4. **Edge Network:** Content served from global CDN with security benefits

### Vercel Hobby Account Limitations & Security Impact

#### 1. Function Execution Time Limits ⚠️ HIGH PRIORITY

**Issue:** Serverless functions on Hobby plan have a **10-second execution timeout**

**Impact on Security:**
- The `/api/crawl` endpoint is particularly vulnerable - it can be abused to exhaust function execution time
- Long-running operations will be terminated, but can still cause resource exhaustion
- Multiple concurrent requests can exhaust function concurrency limits

**Recommendation:**
```typescript
// Add timeout handling and break work into smaller chunks
export async function POST(request: Request) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 8000; // 8 seconds to allow cleanup
  
  // Process in batches with time checks
  for (const comp of limited) {
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      // Return partial results or queue for continuation
      break;
    }
    // ... process competition
  }
}
```

**Updated Priority:** **CRITICAL** - Crawl endpoint abuse can exhaust Vercel function limits

---

#### 2. Request Body Size Limits ⚠️ MEDIUM

**Issue:** Vercel serverless functions have a **4.5MB request body limit** (Hobby plan)

**Impact:**
- Large POST requests to `/api/crawl` will be rejected
- This actually provides some protection, but should be documented

**Recommendation:**
- Add explicit validation for request body size
- Document limits in API documentation
- Consider breaking large operations into smaller requests

**Updated Priority:** Medium - Add explicit validation

---

#### 3. Environment Variables Management ⚠️ MEDIUM

**Issue:** Vercel handles environment variables differently than local development

**Impact:**
- Need to configure secrets in Vercel dashboard
- `NEXT_PUBLIC_*` variables are exposed to client-side
- Regular environment variables are server-side only

**Recommendation:**
- Use Vercel dashboard for sensitive variables (CRAWL_API_KEY, etc.)
- Never use `NEXT_PUBLIC_` prefix for secrets
- Document required environment variables in README

**Updated Priority:** Medium - Ensure proper secret management

---

#### 4. Rate Limiting & Function Concurrency ⚠️ HIGH

**Issue:** Vercel Hobby plan has function concurrency limits

**Impact:**
- No built-in rate limiting per endpoint
- Abuse can exhaust function concurrency
- Can cause legitimate users to experience timeouts

**Recommendation:**
- Implement application-level rate limiting (critical for crawl endpoints)
- Consider using Vercel Edge Middleware for rate limiting
- Monitor function execution metrics in Vercel dashboard

**Updated Priority:** **HIGH** - Essential for Vercel deployment

---

#### 5. File System Limitations ⚠️ MEDIUM

**Issue:** Vercel serverless functions have **read-only file system** (except `/tmp`)

**Impact:**
- The current `lib/storage.ts` writes to `data/` directory - **this will fail on Vercel**
- JSON files cannot be written to the file system in production

**Recommendation:**
```typescript
// Option 1: Use Vercel KV or external database
import { kv } from '@vercel/kv';

// Option 2: Use environment variables for small configs
// Option 3: Use external storage (S3, Supabase, etc.)
```

**Updated Priority:** **CRITICAL** - Current storage implementation won't work on Vercel

**Note:** This is a **blocking issue** - the application needs storage refactoring before Vercel deployment.

---

#### 6. Cold Starts & Security ⚠️ LOW

**Issue:** Serverless functions have cold start delays

**Impact:**
- Not directly a security issue, but can affect timeout-based attacks
- First request after inactivity may be slower

**Recommendation:**
- Monitor cold start times
- Consider keeping functions warm for critical endpoints

**Updated Priority:** Low - Performance consideration

---

### Vercel-Specific Security Recommendations

1. **Use Vercel Edge Middleware for Rate Limiting:**
   ```typescript
   // middleware.ts
   import { NextResponse } from 'next/server';
   import type { NextRequest } from 'next/server';
   
   export function middleware(request: NextRequest) {
     // Implement rate limiting logic
     // Check IP-based limits
     return NextResponse.next();
   }
   ```

2. **Configure Vercel Environment Variables:**
   - Set `CRAWL_API_KEY` in Vercel dashboard (not in code)
   - Use Vercel's secret management
   - Never commit `.env` files

3. **Enable Vercel Analytics:**
   - Monitor function execution times
   - Track error rates
   - Identify abuse patterns

4. **Use Vercel KV or External Database:**
   - Replace file-based storage with Vercel KV or external database
   - Required for production deployment

5. **Configure Vercel Security Headers:**
   - Use `vercel.json` or `next.config.ts` for custom headers
   - Vercel adds some headers automatically, but custom CSP may be needed

---

### Updated Priority List for Vercel Deployment

#### **BLOCKING ISSUES** (Must fix before deployment):
1. ⛔ **Storage Implementation** - File system writes won't work on Vercel
2. ⛔ **Crawl Endpoint Authentication** - Critical for preventing abuse
3. ⛔ **SSRF Fix** - Security vulnerability

#### **HIGH PRIORITY** (Fix before production):
4. ⚠️ **Rate Limiting** - Essential for Vercel function limits
5. ⚠️ **Input Validation** - Prevent crashes and abuse
6. ⚠️ **Error Sanitization** - Prevent information disclosure

#### **MEDIUM PRIORITY** (Can fix post-deployment):
7. ⚠️ **Security Headers** - Some provided by Vercel, customize as needed
8. ⚠️ **CORS Configuration** - Configure explicitly
9. ⚠️ **Request Size Validation** - Document and validate limits

#### **LOW PRIORITY** (Nice to have):
10. ⚠️ **Path Validation** - Less critical with read-only filesystem
11. ⚠️ **Test Endpoint Removal** - Remove or protect
12. ⚠️ **Dependency Scanning** - Set up automated scanning

---

## Conclusion

The application has several security vulnerabilities that should be addressed before production deployment. The most critical issues are the unprotected crawl endpoints and SSRF vulnerability. Implementing the recommended fixes will significantly improve the security posture of the application.

**Overall Security Rating:** 6/10

**Recommendation:** Address high-priority issues before public deployment.

