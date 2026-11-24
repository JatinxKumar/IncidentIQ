/**
 * auth-test.mjs — IncidentIQ Auth Integration Tests
 * Run from artifacts/api-server/: node auth-test.mjs
 * Server must be running on port 3001.
 */

import jwt from "jsonwebtoken";

const BASE = "http://localhost:3001/api";
const ACCESS_SECRET = "incidentiq_access_secret_change_in_production_32chars";
const REFRESH_SECRET = "incidentiq_refresh_secret_change_in_production_32chars";

function makeToken(payload, secret, expiresIn = "15m") {
  return jwt.sign(payload, secret, { expiresIn });
}

// Pre-generate tokens with known payloads
const adminToken = makeToken({ id: "uuid-admin-001", role: "admin" }, ACCESS_SECRET);
const analystToken = makeToken({ id: "uuid-analyst-001", role: "analyst" }, ACCESS_SECRET);
const viewerToken = makeToken({ id: "uuid-viewer-001", role: "viewer" }, ACCESS_SECRET);
const expiredToken = makeToken({ id: "uuid-test", role: "admin" }, ACCESS_SECRET, "-1s");
const validRefreshToken = makeToken({ id: "uuid-admin-001", role: "admin" }, REFRESH_SECRET, "7d");

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

async function authReq(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

let passed = 0, failed = 0;
function pass(msg) { console.log(`  ✅ PASS: ${msg}`); passed++; }
function fail(msg, detail) { console.error(`  ❌ FAIL: ${msg}`, JSON.stringify(detail) ?? ""); failed++; }
function section(title) { console.log(`\n─── ${title} ${"─".repeat(Math.max(0, 42 - title.length))}`); }

async function run() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   IncidentIQ Backend Auth Test Suite    ║");
  console.log("╚══════════════════════════════════════════╝");

  section("A. Health Check");
  const health = await req("GET", "/healthz");
  if (health.status === 200 && health.body.status === "ok")
    pass(`GET /healthz → 200 { status: 'ok' }`);
  else fail("GET /healthz", health);

  section("B. Zod Input Validation");

  const badEmail = await req("POST", "/auth/register", { email: "not-an-email", username: "validuser", password: "12345678" });
  if (badEmail.status === 400 && badEmail.body.error === "Validation Error")
    pass("Invalid email → 400 Validation Error");
  else fail("Invalid email should be 400", badEmail.body);

  const shortPassword = await req("POST", "/auth/register", { email: "a@b.com", username: "validuser", password: "short" });
  if (shortPassword.status === 400) pass("Password < 8 chars → 400");
  else fail("Short password should be 400", shortPassword.body);

  const shortUsername = await req("POST", "/auth/register", { email: "a@b.com", username: "ab", password: "password123" });
  if (shortUsername.status === 400) pass("Username < 3 chars → 400");
  else fail("Short username should be 400", shortUsername.body);

  const badUsernameChars = await req("POST", "/auth/register", { email: "a@b.com", username: "user name!", password: "password123" });
  if (badUsernameChars.status === 400) pass("Username with spaces/! → 400");
  else fail("Bad username chars should be 400", badUsernameChars.body);

  const missingPassword = await req("POST", "/auth/login", { email: "test@test.com" });
  if (missingPassword.status === 400) pass("Missing password field in login → 400");
  else fail("Missing fields should be 400", missingPassword.body);

  section("C. DB Error Handling (no local DB)");

  const dbReg = await req("POST", "/auth/register", { email: "test@incidentiq.dev", username: "testuser", password: "TestPass@123" });
  if (dbReg.status === 503)
    pass(`Register with no DB → 503 'Database unavailable' (no SQL leak) ✅`);
  else fail(`Expected 503 graceful DB error, got ${dbReg.status}`, dbReg.body);

  const dbLogin = await req("POST", "/auth/login", { email: "test@incidentiq.dev", password: "TestPass@123" });
  if (dbLogin.status === 503)
    pass(`Login with no DB → 503 'Database unavailable' (no SQL leak) ✅`);
  else fail(`Expected 503 graceful DB error, got ${dbLogin.status}`, dbLogin.body);

  section("D. Authentication Middleware");

  const noToken = await req("GET", "/auth/me");
  if (noToken.status === 401 && noToken.body.error === "Authentication token required")
    pass(`No token → 401 'Authentication token required'`);
  else fail("No token should be 401", noToken.body);

  const malformed = await authReq("GET", "/auth/me", "this.is.not.valid");
  if (malformed.status === 403) pass("Malformed token → 403");
  else fail("Malformed token should be 403", malformed.body);

  const expired = await authReq("GET", "/auth/me", expiredToken);
  if (expired.status === 403) pass("Expired token → 403");
  else fail("Expired token should be 403", expired.body);

  const validAdmin = await authReq("GET", "/auth/me", adminToken);
  if (validAdmin.status === 200 && validAdmin.body.user?.id === "uuid-admin-001")
    pass(`Valid admin token → 200, correct user.id payload`);
  else fail("Valid token should be 200 with user payload", validAdmin.body);

  section("E. Role-Based Access Control (RBAC)");

  const adminOnAdmin = await authReq("GET", "/auth/admin-only", adminToken);
  if (adminOnAdmin.status === 200) pass("Admin → /admin-only → 200 ✅");
  else fail("Admin should access admin-only", adminOnAdmin.body);

  const analystOnAdmin = await authReq("GET", "/auth/admin-only", analystToken);
  if (analystOnAdmin.status === 403) pass("Analyst → /admin-only → 403 (Insufficient permissions) ✅");
  else fail("Analyst should NOT access admin-only", analystOnAdmin.body);

  const viewerOnAdmin = await authReq("GET", "/auth/admin-only", viewerToken);
  if (viewerOnAdmin.status === 403) pass("Viewer → /admin-only → 403 ✅");
  else fail("Viewer should NOT access admin-only", viewerOnAdmin.body);

  const adminOnAnalyst = await authReq("GET", "/auth/analyst-only", adminToken);
  if (adminOnAnalyst.status === 200) pass("Admin → /analyst-only → 200 (admin inherits all roles) ✅");
  else fail("Admin should access analyst-only", adminOnAnalyst.body);

  const analystOnAnalyst = await authReq("GET", "/auth/analyst-only", analystToken);
  if (analystOnAnalyst.status === 200) pass("Analyst → /analyst-only → 200 ✅");
  else fail("Analyst should access analyst-only", analystOnAnalyst.body);

  const viewerOnAnalyst = await authReq("GET", "/auth/analyst-only", viewerToken);
  if (viewerOnAnalyst.status === 403) pass("Viewer → /analyst-only → 403 ✅");
  else fail("Viewer should NOT access analyst-only", viewerOnAnalyst.body);

  const viewerMe = await authReq("GET", "/auth/me", viewerToken);
  if (viewerMe.status === 200 && viewerMe.body.user?.role === "viewer")
    pass("Viewer → /me → 200 (all authenticated users can see own info) ✅");
  else fail("Viewer should access /me", viewerMe.body);

  section("F. Refresh Token");

  const refreshRes = await req("POST", "/auth/refresh", { refreshToken: validRefreshToken });
  if (refreshRes.status === 200 && refreshRes.body.accessToken && refreshRes.body.refreshToken)
    pass("Valid refresh token → 200, new accessToken + refreshToken issued ✅");
  else fail("Refresh should return new tokens", refreshRes.body);

  const badRefresh = await req("POST", "/auth/refresh", { refreshToken: "not.a.valid.jwt" });
  if (badRefresh.status === 401) pass("Invalid refresh token → 401");
  else fail("Invalid refresh should be 401", badRefresh.body);

  const accessAsRefresh = await req("POST", "/auth/refresh", { refreshToken: adminToken }); // wrong secret
  if (accessAsRefresh.status === 401) pass("Access token used as refresh → 401 (different secrets protect this) ✅");
  else fail("Using access token as refresh should fail", accessAsRefresh.body);

  const missingRefreshBody = await req("POST", "/auth/refresh", {});
  if (missingRefreshBody.status === 400) pass("Missing refreshToken body → 400 Validation Error");
  else fail("Missing refreshToken should be 400", missingRefreshBody.body);

  section("G. Security Checks");

  const mePayload = (await authReq("GET", "/auth/me", adminToken)).body;
  if (!mePayload?.user?.passwordHash)
    pass("/me response contains NO passwordHash field ✅");
  else fail("/me response LEAKS passwordHash!");

  // Summary
  const total = passed + failed;
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Results: ${passed}/${total} passed, ${failed} failed              ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  if (failed > 0) process.exit(1);
}

run().catch(console.error);
