/**
 * OTT Service
 * Handles OTT API integration for subscriber provisioning
 * Uses real API in production, mock in development
 */
const https = require('https');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const OTT_API_URL = process.env.OTT_API_URL; // 🔒 OTT API CALL — internal Telekom endpoint hidden (set in .env)
const OTT_USERNAME = process.env.OTT_USERNAME;
const OTT_PASSWORD = process.env.OTT_PASSWORD;
// 🔒 OTT PACKAGE IDS — real Telekom package IDs hidden (set in .env as comma-separated lists)
const parseIds = (v) => (v || '').split(',').map((s) => Number(s.trim())).filter(Boolean);
const PACKAGE_IDS = {
  personal: parseIds(process.env.OTT_PACKAGE_IDS_PERSONAL),
  business: parseIds(process.env.OTT_PACKAGE_IDS_BUSINESS),
};

/**
 * Make HTTPS request to OTT API with Basic Auth
 */
function ottApiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullUrl = `${OTT_API_URL}/${cleanPath}`;
    const url = new URL(fullUrl);
    const auth = Buffer.from(`${OTT_USERNAME}:${OTT_PASSWORD}`).toString('base64');

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      rejectUnauthorized: false, // Accept self-signed certificates
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: data ? JSON.parse(data) : null, statusCode: res.statusCode });
        } else {
          reject(new Error(`OTT API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('OTT API request timed out after 10s'));
    });
    req.on('error', (error) => reject(error));

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Get all subscribers from OTT API
 */
async function getAllSubscribers() {
  const response = await ottApiRequest('GET', '/subscribers');
  
  // Response format: {"status":"ok","data":[...subscribers...]}
  let subscribers = response.data?.data || response.data;
  
  // If still not an array, return empty array
  if (!Array.isArray(subscribers)) {
    console.log('⚠️ Unexpected GET subscribers response format:', typeof subscribers);
    return [];
  }
  
  return subscribers;
}

/**
 * Check if username exists in OTT system
 */
async function checkUsernameExists(username) {
  try {
    const subscribers = await getAllSubscribers();
    return subscribers.some((sub) => sub.uid === username);
  } catch (error) {
    console.error('Error checking username:', error.message);
    throw error;
  }
}

/**
 * Normalize Albanian special characters for OTT usernames
 * ç → c, ë → e, š → s
 */
function normalizeAlbanian(str) {
  return str
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ë/g, 'e').replace(/Ë/g, 'e')
    .replace(/š/g, 's').replace(/Š/g, 's');
}

/**
 * Check if username exists in our own DB
 */
async function checkUsernameExistsInDB(username) {
  const db = require('../config/db');
  const result = await db.query(
    'SELECT 1 FROM users WHERE ott_username = $1 OR biz_ott_username = $1 LIMIT 1',
    [username]
  );
  return result.rows.length > 0;
}

/**
 * Generate unique username: first initial + lastname + VB + number
 * Example: John Doe → jdoe1VB, jdoe2VB, etc.
 * Same convention for both personal and business packages.
 */
async function generateUniqueUsername(firstName, lastName, packageType = 'personal') {
  const normFirst = normalizeAlbanian(firstName);
  const normLast  = normalizeAlbanian(lastName).replace(/\s+/g, '');
  const base = `${normFirst[0].toLowerCase()}${normLast.toLowerCase()}`;

  // Try numbered variations (1-65): jdoe1VB, jdoe2VB, etc.
  for (let i = 1; i <= 65; i++) {
    const username = `${base}${i}VB`;

    // Step 1: Check OTT API (covers all sources — our users + external)
    const existsInOtt = await checkUsernameExists(username);
    if (existsInOtt) continue;

    // Step 2: OTT says free — double-check our own DB to catch OTT cache issues
    const existsInDb = await checkUsernameExistsInDB(username);
    if (existsInDb) continue;

    return username;
  }

  throw new Error('Unable to generate unique username after 65 attempts');
}

/**
 * Create subscriber on OTT system
 */
async function createSubscriber(userData, username, password) {
  const payload = {
    uid: username,
    type: 'POSTPAID',
    first_name: userData.firstName,
    last_name: userData.lastName,
    external_uid: '',
    password: password,
    status: 'ACTIVE',
    region_id: 1,
    operator_id: 1,
  };

  const response = await ottApiRequest('POST', '/subscribers', payload);
  return response.data;
}

/**
 * Assign package to subscriber with retry logic
 */
async function assignPackage(subscriberId, packageId, retries = 5) {
  const activeFrom = new Date().toISOString();
  const activeTo = new Date('2026-07-25T23:59:59.000Z').toISOString(); // World Cup 2026 end date

  const payload = {
    package_id: packageId,
    subscriber_id: subscriberId,
    active_from: activeFrom,
    active_to: activeTo,
    renewable: false,
    renew_period_format: 'MONTH',
    renew_period_duration: 1,
    operator_id: 1,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ottApiRequest('POST', '/subscriber_packages', payload);
      console.log(`✅ Package ${packageId} assigned successfully (attempt ${attempt})`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Failed to assign package ${packageId} (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        return { success: false, error: error.message };
      }
      // Wait 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Assign all packages to subscriber
 */
async function assignAllPackages(subscriberId, packageType = 'personal') {
  const ids = PACKAGE_IDS[packageType] || PACKAGE_IDS.personal;
  const results = [];
  
  for (const packageId of ids) {
    const result = await assignPackage(subscriberId, packageId, 5);
    results.push({ packageId, ...result });
  }

  const failedPackages = results.filter((r) => !r.success);
  if (failedPackages.length > 0) {
    console.error(`⚠️ Failed to assign ${failedPackages.length} package(s):`, failedPackages);
  }

  return {
    allAssigned: failedPackages.length === 0,
    results,
  };
}

/**
 * Generate 6-digit random password for TV remote
 */
function generate6DigitPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Provision OTT credentials for a user
 * In production: Real OTT API
 * In development: Mock
 */
async function provisionCredentials(userData, packageType = 'personal') {
  // Temporary flag to simulate OTT failure (for testing)
  if (process.env.DISABLE_OTT === 'true') {
    console.log('⚠️ OTT provisioning disabled (DISABLE_OTT=true)');
    return { success: false, error: 'OTT provisioning disabled for testing' };
  }

  if (!IS_PRODUCTION) {
    // MOCK MODE for development
    console.log('\n📺 ══════════════════════════════════════');
    console.log(`📺  MOCK OTT API — Provisioning Credentials (${packageType})`);
    console.log('📺 ══════════════════════════════════════');
    console.log(`📺  For: ${userData.firstName} ${userData.lastName}`);
    console.log(`📺  Email: ${userData.email}`);

    await new Promise((resolve) => setTimeout(resolve, 4000)); // Simulate real OTT latency

    const suffix = packageType === 'business' ? 'FIFAbiz' : 'FIFA';
    const username = `test${normalizeAlbanian(userData.firstName).toLowerCase()}${normalizeAlbanian(userData.lastName).toLowerCase()}${suffix}`;
    const password = generate6DigitPassword();

    console.log(`📺  Generated Username: ${username}`);
    console.log(`📺  Generated Password: ${password}`);
    console.log('📺 ══════════════════════════════════════\n');

    return {
      success: true,
      credentials: { username, password },
      subscriberId: 999, // Mock subscriber ID
    };
  }

  // PRODUCTION MODE - Real OTT API
  try {
    console.log('\n📺 ══════════════════════════════════════');
    console.log(`📺  OTT API — Provisioning Credentials (${packageType})`);
    console.log('📺 ══════════════════════════════════════');
    console.log(`📺  For: ${userData.firstName} ${userData.lastName}`);
    console.log(`📺  Email: ${userData.email}`);

    // Step 1: Generate unique username
    console.log('📺  Step 1: Generating unique username...');
    const username = await generateUniqueUsername(userData.firstName, userData.lastName, packageType);
    console.log(`📺  Username: ${username}`);

    // Step 2: Generate password
    const password = generate6DigitPassword();
    console.log(`📺  Password: ${password}`);

    // Step 3: Create subscriber
    console.log('📺  Step 2: Creating subscriber...');
    const subscriber = await createSubscriber(userData, username, password);
    
    // Extract subscriber ID from response: {"status":"ok","data":{"id":12345}}
    const subscriberId = subscriber?.data?.id || subscriber?.id || subscriber?.subscriber_id;
    
    if (!subscriberId) {
      console.error('📺  Unexpected response format:', JSON.stringify(subscriber));
      throw new Error('Could not retrieve subscriber_id from OTT API response');
    }
    
    console.log(`📺  Subscriber created with ID: ${subscriberId}`);

    // Step 4: Assign packages
    console.log('📺  Step 3: Assigning packages...');
    const packagesResult = await assignAllPackages(subscriberId, packageType);
    
    if (packagesResult.allAssigned) {
      console.log('📺  ✅ All packages assigned successfully');
    } else {
      console.log('📺  ⚠️ Some packages failed to assign (credentials still valid)');
    }

    console.log('📺 ══════════════════════════════════════\n');

    return {
      success: true,
      credentials: { username, password },
      subscriberId: subscriberId,
      packagesAssigned: packagesResult.allAssigned,
    };
  } catch (error) {
    console.error('📺  ❌ OTT Provisioning Failed:', error.message);
    console.log('📺 ══════════════════════════════════════\n');
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Deactivate OTT credentials (for future use)
 */
async function deactivateCredentials(username) {
  console.log(`📺 Deactivating credentials for: ${username}`);
  // TODO: Implement if OTT API provides deactivation endpoint
  return { success: true };
}

module.exports = { provisionCredentials, deactivateCredentials };
