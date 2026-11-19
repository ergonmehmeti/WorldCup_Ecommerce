#!/usr/bin/env node
/**
 * OSC/Recharge SOAP Test Script
 * 
 * Tests connectivity and a single gift request against the Recharge platform.
 * Run from the server (🔒 OSC IP — internal host must be reachable).
 *
 * Usage:
 *   node backend/scripts/testOscRecharge.js                          # uses test number 44123456
 *   node backend/scripts/testOscRecharge.js 44123456                 # custom number
 *   node backend/scripts/testOscRecharge.js 44123456 --dry           # show XML without sending
 *   node backend/scripts/testOscRecharge.js 45123456                 # different number
 *   node backend/scripts/testOscRecharge.js 44123456 --pkg=business  # business package (WCBIZ STAN)
 *   node backend/scripts/testOscRecharge.js 44123456 --try-all       # try all hash modes
 *   node backend/scripts/testOscRecharge.js 044123456 --db           # look up customer in DB + update on success
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');

// ── Config from .env ──────────────────────────────────────────────
// 🔒 OSC IP CALL — internal Telekom SOAP endpoint & credentials hidden (set in .env)
const OSC_URL      = process.env.OSC_SOAP_URL;           // 🔒 OSC IP CALL — hidden
const USERNAME     = process.env.OSC_USERNAME;           // 🔒 OSC USERNAME — hidden
const PIN          = process.env.OSC_PIN       || '';
const PIN_SALT     = process.env.OSC_PIN_SALT  || '';    // 🔒 OSC AUTH SALT — hidden
const TERMINAL_ID  = process.env.OSC_TERMINAL_ID;        // 🔒 OSC TERMINAL ID — hidden
const NETWORK_OP   = process.env.OSC_NETWORK_OPERATOR_ID;
const SEQ_NUMBER   = process.env.OSC_SEQUENCE_NUMBER;
const AMOUNT       = process.env.OSC_AMOUNT;             // 🔒 OSC AMOUNT — hidden
const ORDER_ID     = process.env.OSC_ORDER_ID;           // 🔒 OSC ORDER ID — hidden

// ── CLI args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const tryAll = args.includes('--try-all');
const useDb = args.includes('--db');
const hashArg = args.find(a => a.startsWith('--hash='));
const hashMode = hashArg ? hashArg.split('=')[1] : 'md5salted'; // md5salted (default), plain, md5, sha256
const pkgArg = args.find(a => a.startsWith('--pkg='));
const packageType = pkgArg ? pkgArg.split('=')[1] : 'personal'; // personal (default) or business
const testPhone = args.find(a => !a.startsWith('--')) || '44123456';

// ── DB helpers (only used with --db) ────────────────────────────
let dbPool = null;

function getDb() {
  if (!dbPool) {
    dbPool = new Pool({
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }
  return dbPool;
}

async function lookupCustomer(phone) {
  const normalized = normalizePhone(phone);
  // Match against stored phone in any format: 044xxx, 44xxx, +38344xxx
  const { rows } = await getDb().query(
    `SELECT id, first_name, last_name, email, phone, payment_status, payment_amount,
            biz_payment_status, biz_payment_amount, ott_provisioned, biz_ott_provisioned,
            osc_gift_attempted, osc_transaction_id, osc_gift_error,
            osc_biz_gift_attempted, osc_biz_transaction_id, osc_biz_gift_error,
            valaboterori_gift, valaboterori_biz_gift
     FROM users
     WHERE REGEXP_REPLACE(phone, '^(\\+383|383|0)', '') = $1`,
    [normalized]
  );
  return rows[0] || null;
}

async function markOscSuccess(userId, transactionId, isBusiness) {
  const now = new Date();
  if (isBusiness) {
    await getDb().query(
      `UPDATE users SET
         osc_biz_gift_attempted     = TRUE,
         osc_biz_gift_attempted_at  = $1,
         osc_biz_transaction_id     = $2,
         osc_biz_gift_error         = NULL,
         valaboterori_biz_gift      = TRUE,
         valaboterori_biz_gift_at   = $1,
         updated_at                 = $1
       WHERE id = $3`,
      [now, transactionId, userId]
    );
  } else {
    await getDb().query(
      `UPDATE users SET
         osc_gift_attempted     = TRUE,
         osc_gift_attempted_at  = $1,
         osc_transaction_id     = $2,
         osc_gift_error         = NULL,
         valaboterori_gift      = TRUE,
         valaboterori_gift_at   = $1,
         updated_at             = $1
       WHERE id = $3`,
      [now, transactionId, userId]
    );
  }
}

async function markOscFailed(userId, errorMsg, isBusiness) {
  const now = new Date();
  if (isBusiness) {
    await getDb().query(
      `UPDATE users SET
         osc_biz_gift_attempted    = TRUE,
         osc_biz_gift_attempted_at = $1,
         osc_biz_gift_error        = $2,
         updated_at                = $1
       WHERE id = $3`,
      [now, errorMsg, userId]
    );
  } else {
    await getDb().query(
      `UPDATE users SET
         osc_gift_attempted     = TRUE,
         osc_gift_attempted_at  = $1,
         osc_gift_error         = $2,
         updated_at             = $1
       WHERE id = $3`,
      [now, errorMsg, userId]
    );
  }
}

// ── Hash PIN based on mode ────────────────────────────────────────
function hashPin(pin, mode) {
  if (mode === 'md5salted') return crypto.createHash('md5').update(pin + PIN_SALT).digest('hex'); // 🔒 OSC AUTH SCHEME — salt hidden
  if (mode === 'md5') return crypto.createHash('md5').update(pin).digest('hex');
  if (mode === 'sha1') return crypto.createHash('sha1').update(pin).digest('hex');
  if (mode === 'sha256') return crypto.createHash('sha256').update(pin).digest('hex');
  if (mode === 'sha512') return crypto.createHash('sha512').update(pin).digest('hex');
  return pin; // plain
}

// ── Generate STAN — WC order reference format ────────────────────
function generateSTAN(packageType) {
  const prefix = packageType === 'business' ? 'WCBIZ' : 'WC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ── Normalize phone: strip leading 0 or +383, keep 8 digits ──────
function normalizePhone(phone) {
  let p = phone.replace(/\s+/g, '');
  if (p.startsWith('+383')) p = p.slice(4);
  if (p.startsWith('383'))  p = p.slice(3);
  if (p.startsWith('0'))    p = p.slice(1);
  return p; // e.g. "44123456"
}

// ── Build SOAP XML ────────────────────────────────────────────────
function buildSoapEnvelope(phone, pinValue, packageType) {
  const stan = generateSTAN(packageType);
  const normalizedPhone = normalizePhone(phone);

  return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <!-- 🔒 OSC SOAP CALL — vendor-specific request body hidden.
         Real body contains: identity (username + hashed PIN), terminal ID,
         phone number, STAN (order reference), order ID and amount. -->
  </soap:Body>
</soap:Envelope>`;
}

// ── Send SOAP request ─────────────────────────────────────────────
function sendSoapRequest(xmlBody) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(OSC_URL);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': process.env.OSC_SOAP_ACTION || '', // 🔒 OSC SOAP ACTION — hidden
        'Content-Length': Buffer.byteLength(xmlBody),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out (15s)')); });
    req.write(xmlBody);
    req.end();
  });
}

// ── Parse key fields from response ────────────────────────────────
function parseResponse(xml) {
  const extract = (tag) => {
    const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)<`));
    return match ? match[1] : null;
  };

  // Check for SOAP Fault
  const faultString = extract('faultstring');
  if (faultString) {
    // Prefer the short Albanian/English message from ServiceException over the full Java stack trace
    const shortMessage = extract('a:Message') || faultString.split('\n')[0].substring(0, 200);
    return { success: false, error: shortMessage, raw: xml };
  }

  return {
    success: true,
    transactionID: extract('TransactionID'),
    buyer: extract('Buyer'),
    salesAmount: extract('SalesAmount'),
    salesTime: extract('SalesTime'),
    networkOperator: extract('NetworkOperator'),
    expiryDate: extract('ExpiryDate'),
    salesAgent: extract('SalesAgent'),
    raw: xml,
  };
}

// ── Run a single test with given hash mode ────────────────────────
async function runTest(mode, customer) {
  const pinValue = hashPin(PIN, mode);
  const xml = buildSoapEnvelope(testPhone, pinValue, packageType);

  console.log(`\n── [${mode.toUpperCase()}] PIN: ${pinValue.slice(0, 6)}... ──────────────`);
  console.log('Sending SOAP request...\n');

  try {
    const response = await sendSoapRequest(xml);
    console.log(`── RESPONSE ── HTTP ${response.statusCode} ──────────────────`);
    console.log(response.body);
    console.log('─────────────────────────────────────────────────\n');

    if (response.statusCode === 200) {
      const parsed = parseResponse(response.body);
      console.log('── PARSED ──────────────────────────────────────');
      if (parsed.success) {
        console.log(`✅ SUCCESS with ${mode.toUpperCase()}`);
        console.log(`   TransactionID:  ${parsed.transactionID}`);
        console.log(`   Buyer:          ${parsed.buyer}`);
        console.log(`   SalesAmount:    ${parsed.salesAmount}`);
        console.log(`   SalesTime:      ${parsed.salesTime}`);
        console.log(`   Operator:       ${parsed.networkOperator}`);
        console.log(`   ExpiryDate:     ${parsed.expiryDate}`);
        if (useDb && customer) {
          const isBiz = packageType === 'business';
          await markOscSuccess(customer.id, parsed.transactionID, isBiz);
          const col = isBiz ? 'valaboterori_biz_gift' : 'valaboterori_gift';
          console.log(`   💾 DB updated → osc_${isBiz ? 'biz_' : ''}gift_attempted=true, ${col}=true, transaction_id=${parsed.transactionID}`);
        }
        return { success: true, transactionID: parsed.transactionID };
      } else {
        console.log(`❌ SOAP FAULT [${mode.toUpperCase()}]`);
        console.log(`   Error: ${parsed.error}`);
        if (useDb && customer) {
          await markOscFailed(customer.id, parsed.error, packageType === 'business');
          console.log(`   💾 DB updated → osc_gift_attempted=true, error recorded`);
        }
      }
    } else {
      console.log(`❌ HTTP ${response.statusCode} [${mode.toUpperCase()}]`);
      const parsed = parseResponse(response.body);
      const errMsg = parsed.error ? parsed.error.slice(0, 120) : `HTTP ${response.statusCode}`;
      if (parsed.error) console.log(`   Error: ${errMsg}`);
      if (useDb && customer) {
        await markOscFailed(customer.id, errMsg, packageType === 'business');
        console.log(`   💾 DB updated → osc_gift_attempted=true, error recorded`);
      }
    }
  } catch (err) {
    console.error(`❌ Request failed [${mode.toUpperCase()}]:`, err.message);
    if (useDb && customer) {
      await markOscFailed(customer.id, err.message, packageType === 'business');
    }
  }
  return { success: false };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  OSC/Recharge SOAP Test');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Endpoint:    ${OSC_URL}`);
  console.log(`  Username:    ${USERNAME}`);
  console.log(`  TerminalID:  ${TERMINAL_ID}`);
  console.log(`  Phone:       ${testPhone} → ${normalizePhone(testPhone)}`);
  console.log(`  OrderID:     ${ORDER_ID}`);
  console.log(`  Amount:      ${AMOUNT}`);
  console.log(`  PIN:         ${PIN ? '***' + PIN.slice(-2) : '⚠️  MISSING — set OSC_PIN in .env'}`);
  console.log(`  Package:     ${packageType}`);
  console.log(`  STAN format: ${packageType === 'business' ? 'WCBIZ' : 'WC'}-<timestamp>-<random>`);
  console.log(`  Mode:        ${tryAll ? 'TRY ALL (md5salted, plain, md5, sha1, sha256, sha512)' : hashMode}`);
  console.log(`  DB update:   ${useDb ? 'YES (--db)' : 'NO (dry/test only)'}`);
  console.log('═══════════════════════════════════════════════════');

  // ── DB: look up customer ────────────────────────────────────────
  let customer = null;
  if (useDb) {
    try {
      customer = await lookupCustomer(testPhone);
      if (customer) {
        const isBiz = packageType === 'business';
        const alreadyDone = isBiz ? customer.osc_biz_gift_attempted : customer.osc_gift_attempted;
        const giftDone    = isBiz ? customer.valaboterori_biz_gift  : customer.valaboterori_gift;
        console.log('── CUSTOMER FOUND ──────────────────────────────────');
        console.log(`   ID:            ${customer.id}`);
        console.log(`   Name:          ${customer.first_name} ${customer.last_name}`);
        console.log(`   Email:         ${customer.email}`);
        console.log(`   Phone (DB):    ${customer.phone}`);
        console.log(`   Payment:       ${customer.payment_status}${customer.payment_amount ? ` (€${(customer.payment_amount / 100).toFixed(2)})` : ''}`);
        console.log(`   Biz Payment:   ${customer.biz_payment_status}${customer.biz_payment_amount ? ` (€${(customer.biz_payment_amount / 100).toFixed(2)})` : ''}`);
        console.log(`   OTT:           ${customer.ott_provisioned ? '✅ provisioned' : '⏳ not provisioned'} | Biz: ${customer.biz_ott_provisioned ? '✅' : '⏳'}`);
        console.log(`   OSC gift:      ${alreadyDone ? (giftDone ? '✅ already done' : '❌ attempted but failed') : '⏳ not yet attempted'}`);
        if (customer.osc_transaction_id) console.log(`   OSC txn ID:    ${customer.osc_transaction_id}`);
        if (customer.osc_gift_error)      console.log(`   OSC error:     ${customer.osc_gift_error}`);
        console.log('────────────────────────────────────────────────────');
        if (alreadyDone && giftDone) {
          console.log('⚠️  OSC gift already marked as SUCCESS in DB. Proceeding anyway (re-test).');
        }
      } else {
        console.log(`⚠️  No customer found in DB for phone: ${testPhone} (normalized: ${normalizePhone(testPhone)})`);
        console.log('    Proceeding with SOAP test only (no DB update will happen).');
      }
    } catch (err) {
      console.error('❌ DB lookup failed:', err.message);
      console.log('   Proceeding without DB update.');
      customer = null;
    }
  }

  if (!PIN) {
    console.error('❌ OSC_PIN is not set. Add it to backend/.env');
    process.exit(1);
  }

  if (dryRun) {
    const pinValue = hashPin(PIN, hashMode);
    const xml = buildSoapEnvelope(testPhone, pinValue, packageType);
    console.log('── REQUEST XML ──────────────────────────────────');
    console.log(xml);
    console.log('─────────────────────────────────────────────────');
    process.exit(0);
  }

  if (tryAll) {
    for (const mode of ['md5salted', 'plain', 'md5', 'sha1', 'sha256', 'sha512']) {
      const result = await runTest(mode, customer);
      if (result.success) {
        console.log(`\n🎉 Hash mode "${mode}" works! Use --hash=${mode} or update the service.`);
        break;
      }
    }
  } else {
    await runTest(hashMode, customer);
  }

  if (dbPool) await dbPool.end();
}

main();
