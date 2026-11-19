#!/usr/bin/env node
/**
 * OSC Mobile Package Test Script
 * 
 * Tests both standard 104GB gift and mobile package gifts (XXL, XL, L, M, S)
 * 
 * Usage:
 *   node backend/scripts/testOscMobilePackages.js 44123456               # Test standard 104GB
 *   node backend/scripts/testOscMobilePackages.js 44123456 XL            # Test XL package
 *   node backend/scripts/testOscMobilePackages.js 44123456 XXL           # Test XXL package
 *   node backend/scripts/testOscMobilePackages.js 44123456 L             # Test L package
 *   node backend/scripts/testOscMobilePackages.js 44123456 --dry         # Show XML without sending
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const url = require('url');
const crypto = require('crypto');

// ── Config from .env ──────────────────────────────────────────────
// 🔒 OSC IP CALL — internal Telekom SOAP endpoint & credentials hidden (set in .env)
const OSC_URL      = process.env.OSC_SOAP_URL;                  // 🔒 OSC IP CALL — hidden
const USERNAME     = process.env.OSC_USERNAME;                  // 🔒 OSC USERNAME — hidden
const PIN          = process.env.OSC_PIN                  || '';
const PIN_SALT     = process.env.OSC_PIN_SALT             || ''; // 🔒 OSC AUTH SALT — hidden
const TERMINAL_ID  = process.env.OSC_TERMINAL_ID;               // 🔒 OSC TERMINAL ID — hidden
const NETWORK_OP   = process.env.OSC_NETWORK_OPERATOR_ID;
const SEQ_NUMBER   = process.env.OSC_SEQUENCE_NUMBER;

// ── Package Configuration ─────────────────────────────────────────
// 🔒 OSC PRODUCT CODES — real order IDs / amounts hidden (placeholders)
const PACKAGES = {
  standard: { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  XXL:      { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  XL:       { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  L:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  M:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  S:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
};

// ── CLI args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const testPhone = args.find(a => !a.startsWith('--') && !PACKAGES[a]) || '44123456';
const packageArg = args.find(a => PACKAGES[a]) || 'standard';
const packageConfig = PACKAGES[packageArg];

// ── Helpers ───────────────────────────────────────────────────────

function buildHashedPin() {
  return crypto.createHash('md5').update(PIN + PIN_SALT).digest('hex'); // 🔒 OSC AUTH SCHEME — salt hidden
}

function normalizePhone(phone) {
  let p = phone.replace(/\s+/g, '');
  if (p.startsWith('+383')) p = p.slice(4);
  if (p.startsWith('383'))  p = p.slice(3);
  if (p.startsWith('0'))    p = p.slice(1);
  return p;
}

function generateSTAN() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WC-${timestamp}-${random}`;
}

function buildSoapEnvelope(normalizedPhone, hashedPin, stan, amount, orderId) {
  return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <!-- 🔒 OSC SOAP CALL — vendor-specific request body hidden.
         Real body contains: identity (username + hashed PIN), terminal ID,
         phone number, STAN (order reference), order ID and amount. -->
  </soap:Body>
</soap:Envelope>`;
}

function sendSoapRequest(xmlBody) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(OSC_URL);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || 80,
      path:     parsed.path,
      method:   'POST',
      headers: {
        'Content-Type':   'text/xml; charset=utf-8',
        'SOAPAction':     process.env.OSC_SOAP_ACTION || '', // 🔒 OSC SOAP ACTION — hidden
        'Content-Length': Buffer.byteLength(xmlBody),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out (15s)'));
    });
    req.write(xmlBody);
    req.end();
  });
}

function parseResponse(xml) {
  const extract = (tag) => {
    const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)<`));
    return match ? match[1] : null;
  };

  const faultString = extract('faultstring');
  if (faultString) {
    const shortMessage = extract('a:Message') || faultString.split('\n')[0].substring(0, 200);
    return { success: false, error: shortMessage };
  }

  const transactionId = extract('TransactionID');
  if (!transactionId) {
    return { success: false, error: 'No TransactionID in response' };
  }

  return {
    success: true,
    transactionID: transactionId,
    buyer: extract('Buyer'),
    salesAmount: extract('SalesAmount'),
    salesTime: extract('SalesTime'),
    networkOperator: extract('NetworkOperator'),
    expiryDate: extract('ExpiryDate'),
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const normalizedPhone = normalizePhone(testPhone);
  const packageLabel = packageArg === 'standard' ? '104GB Free Gift' : `Mobile Package ${packageArg}`;

  console.log('═══════════════════════════════════════════════════');
  console.log('  OSC Mobile Package Test');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Package:     ${packageLabel}`);
  console.log(`  Amount:      €${packageConfig.amount}`);
  console.log(`  OrderID:     ${packageConfig.orderId}`);
  console.log(`  Phone:       ${testPhone} → ${normalizedPhone}`);
  console.log(`  Endpoint:    ${OSC_URL}`);
  console.log(`  Username:    ${USERNAME}`);
  console.log(`  TerminalID:  ${TERMINAL_ID}`);
  console.log(`  PIN:         ${PIN ? '***' + PIN.slice(-2) : '⚠️  MISSING'}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (!PIN) {
    console.error('❌ OSC_PIN is not set. Add it to backend/.env');
    process.exit(1);
  }

  const hashedPin = buildHashedPin();
  const stan = generateSTAN();
  const xml = buildSoapEnvelope(normalizedPhone, hashedPin, stan, packageConfig.amount, packageConfig.orderId);

  if (dryRun) {
    console.log('── REQUEST XML ──────────────────────────────────');
    console.log(xml);
    console.log('─────────────────────────────────────────────────');
    process.exit(0);
  }

  console.log(`📤 Sending SOAP request for ${packageLabel}...\n`);

  try {
    const response = await sendSoapRequest(xml);
    
    console.log(`── RESPONSE ── HTTP ${response.statusCode} ──────────────────`);
    console.log(response.body);
    console.log('─────────────────────────────────────────────────\n');

    if (response.statusCode === 200) {
      const parsed = parseResponse(response.body);
      
      console.log('── PARSED RESULT ───────────────────────────────');
      if (parsed.success) {
        console.log(`✅ SUCCESS - ${packageLabel} sent!`);
        console.log(`   TransactionID:  ${parsed.transactionID}`);
        console.log(`   Buyer:          ${parsed.buyer}`);
        console.log(`   SalesAmount:    ${parsed.salesAmount}`);
        console.log(`   SalesTime:      ${parsed.salesTime}`);
        console.log(`   Operator:       ${parsed.networkOperator}`);
        console.log(`   ExpiryDate:     ${parsed.expiryDate}`);
        console.log(`   STAN:           ${stan}`);
        console.log('────────────────────────────────────────────────');
      } else {
        console.log(`❌ SOAP FAULT`);
        console.log(`   Error: ${parsed.error}`);
        console.log('────────────────────────────────────────────────');
      }
    } else {
      console.log(`❌ HTTP ${response.statusCode}`);
      const parsed = parseResponse(response.body);
      if (parsed.error) {
        console.log(`   Error: ${parsed.error}`);
      }
    }
  } catch (err) {
    console.error(`❌ Request failed:`, err.message);
  }
}

main();
