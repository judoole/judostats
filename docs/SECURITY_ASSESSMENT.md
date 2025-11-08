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

## Conclusion

The application has several security vulnerabilities that should be addressed before production deployment. The most critical issues are the unprotected crawl endpoints and SSRF vulnerability. Implementing the recommended fixes will significantly improve the security posture of the application.

**Overall Security Rating:** 6/10

**Recommendation:** Address high-priority issues before public deployment.

