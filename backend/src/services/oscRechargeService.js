/**
 * OSC / Recharge SOAP Service
 *
 * Sends a prepaid data gift to a VALA number via the Recharge platform.
 * Authentication: PIN-based (hashed) — 🔒 OSC AUTH SCHEME hidden
 * Phone format:   strip leading 0 or +383, send 8 digits (e.g. "44123456")
 * STAN:           payment order_reference (e.g. "WC-LK2A3B-X8K4Q2")
 *
 * Returns: { success, transactionId?, error? }
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { writeOscLog } = require('./valaGiftEmailService');

// ── Config ───────────────────────────────────────────────────────
// 🔒 OSC IP CALL — internal Telekom SOAP endpoint & credentials hidden (set in .env)
const OSC_URL      = process.env.OSC_SOAP_URL;                  // 🔒 OSC IP CALL — hidden
const USERNAME     = process.env.OSC_USERNAME;                  // 🔒 OSC USERNAME — hidden
const PIN          = process.env.OSC_PIN                  || '';
const PIN_SALT     = process.env.OSC_PIN_SALT             || ''; // 🔒 OSC AUTH SALT — hidden
const TERMINAL_ID  = process.env.OSC_TERMINAL_ID;               // 🔒 OSC TERMINAL ID — hidden
const NETWORK_OP   = process.env.OSC_NETWORK_OPERATOR_ID;
const SEQ_NUMBER   = process.env.OSC_SEQUENCE_NUMBER;
const OSC_GIFT_ENABLED = process.env.OSC_GIFT_ENABLED === 'true';

// ── Package Configuration ─────────────────────────────────────────
// 🔒 OSC PRODUCT CODES — real order IDs / amounts hidden (placeholders)
const PACKAGE_CONFIG = {
  personal: { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  business: { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  XXL:      { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  XL:       { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  L:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  M:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
  S:        { amount: '0.00', orderId: 'ORDER_ID_HIDDEN' },
};

// ── Helpers ──────────────────────────────────────────────────────

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
    // Use short Albanian/English message from ServiceException — not the full Java stack trace
    // Prefix with [OSC] so callers can distinguish a definitive OSC response from a transient infra error
    const shortMessage = extract('a:Message') || faultString.split('\n')[0].substring(0, 200);
    return { success: false, error: `[OSC] ${shortMessage}` };
  }

  const transactionId = extract('TransactionID');
  if (!transactionId) {
    return { success: false, error: '[OSC] No TransactionID in response' };
  }

  return { success: true, transactionId };
}

// ── Public: send gift to one phone number ─────────────────────────
/**
 * @param {string} phone        - Raw phone number (any format)
 * @param {string} packageType  - 'personal' | 'business' | 'XXL' | 'XL' | 'L' | 'M' | 'S'
 * @param {string} orderReference - Payment order_reference used as STAN
 * @param {number} userId       - For logging only
 * @returns {Promise<{ success: boolean, transactionId?: string, error?: string }>}
 */
async function sendOscGift(phone, packageType, orderReference, userId) {
  // ── Mock mode (non-production) ────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const mockPhone = normalizePhone(phone);
    const mockTxnId = `MOCK-TXN-${Date.now()}`;
    
    // Check if this is a mobile package (XXL, XL, L, M, S) or standard package
    const isMobilePackage = ['XXL', 'XL', 'L', 'M', 'S'].includes(packageType);
    const packageLabel = isMobilePackage ? `Mobile Package ${packageType}` : `Standard Package (${packageType})`;
    
    console.log('\n🎁 ══════════════════════════════════════');
    console.log(`🎁  MOCK OSC RECHARGE`);
    console.log('🎁 ══════════════════════════════════════');
    console.log(`🎁  Phone: ${mockPhone}`);
    console.log(`🎁  Package: ${packageLabel}`);
    console.log(`🎁  Order Reference: ${orderReference}`);
    console.log(`🎁  Transaction ID: ${mockTxnId}`);
    console.log('🎁  Status: ✅ SUCCESS (MOCK)');
    console.log('🎁 ══════════════════════════════════════\n');
    
    writeOscLog(`OSC | MOCK-SUCCESS | ID: ${userId} | ${mockPhone} | ${packageType} | TransactionID: ${mockTxnId}`);
    return { success: true, transactionId: mockTxnId, mock: true };
  }

  if (!OSC_GIFT_ENABLED) {
    return { success: false, error: 'OSC_GIFT_ENABLED is false' };
  }

  if (!PIN) {
    writeOscLog(`OSC | CONFIG_ERROR | ID: ${userId} | ${phone} | OSC_PIN not configured`);
    return { success: false, error: 'OSC_PIN not configured' };
  }

  // Get package configuration (amount and orderId)
  const packageConfig = PACKAGE_CONFIG[packageType];
  if (!packageConfig) {
    writeOscLog(`OSC | CONFIG_ERROR | ID: ${userId} | ${phone} | Unknown package type: ${packageType}`);
    return { success: false, error: `Unknown package type: ${packageType}` };
  }

  const normalizedPhone = normalizePhone(phone);
  const hashedPin = buildHashedPin();
  const stan = orderReference;
  const xml = buildSoapEnvelope(normalizedPhone, hashedPin, stan, packageConfig.amount, packageConfig.orderId);

  writeOscLog(`OSC | SENDING | ID: ${userId} | ${normalizedPhone} | ${packageType} | STAN: ${stan} | OrderID: ${packageConfig.orderId} | Amount: ${packageConfig.amount}`);

  try {
    const response = await sendSoapRequest(xml);
    const parsed = parseResponse(response.body);

    if (parsed.success) {
      writeOscLog(`OSC | SUCCESS | ID: ${userId} | ${normalizedPhone} | ${packageType} | TransactionID: ${parsed.transactionId}`);
      return { success: true, transactionId: parsed.transactionId };
    } else {
      writeOscLog(`OSC | FAILED  | ID: ${userId} | ${normalizedPhone} | ${packageType} | ${parsed.error}`);
      return { success: false, error: parsed.error };
    }
  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    writeOscLog(`OSC | FAILED  | ID: ${userId} | ${normalizedPhone} | ${packageType} | ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

module.exports = { sendOscGift };
