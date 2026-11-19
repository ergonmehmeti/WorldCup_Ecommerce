/**
 * TEB NestPay Bank Service
 * 3D Pay Hosting integration — bank hosts the card input page.
 * Hash Version 3 (SHA-512)
 */
const crypto = require('crypto');
const https = require('https');

const TEB_CLIENT_ID = process.env.TEB_CLIENT_ID;
const TEB_STORE_KEY = process.env.TEB_STORE_KEY;
const TEB_3D_GATE_URL = process.env.TEB_3D_GATE_URL;
const TEB_API_URL = process.env.TEB_API_URL;
const TEB_STORE_TYPE = process.env.TEB_STORE_TYPE || '3D_PAY_HOSTING';
const TEB_CURRENCY = process.env.TEB_CURRENCY || '978'; // EUR
const TEB_API_USERNAME = process.env.TEB_API_USERNAME;
const TEB_API_PASSWORD = process.env.TEB_API_PASSWORD;

/**
 * Escape special characters for Hash v3
 */
function escapeForHash(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

/**
 * Generate Hash v3 (SHA-512) for a set of form parameters.
 * Sorts params alphabetically, concatenates escaped values with "|", appends storekey.
 */
function generateHashV3(params) {
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  let hashVal = '';
  for (const key of sortedKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'hash' || lowerKey === 'encoding') continue;
    hashVal += escapeForHash(params[key] ?? '') + '|';
  }
  hashVal += escapeForHash(TEB_STORE_KEY);

  const sha512 = crypto.createHash('sha512').update(hashVal).digest('hex');
  return Buffer.from(sha512, 'hex').toString('base64');
}

/**
 * Build the form parameters for 3D Pay Hosting redirect.
 * Returns { gatewayUrl, formParams } — frontend auto-submits the form.
 */
function buildPaymentForm(orderData) {
  const { orderReference, amount, okUrl, failUrl, callbackUrl, userEmail, userName } = orderData;

  const rnd = Date.now().toString();
  // Amount in decimal format (e.g. "19.99")
  const amountStr = (amount / 100).toFixed(2);

  const formParams = {
    clientid: TEB_CLIENT_ID,
    storetype: TEB_STORE_TYPE,
    hashAlgorithm: 'ver3',
    TranType: 'Auth',
    Instalment: '',
    amount: amountStr,
    currency: TEB_CURRENCY,
    oid: orderReference,
    okurl: okUrl,
    failUrl,
    callbackUrl,
    lang: 'en',
    rnd,
    BillToName: userName || '',
    email: userEmail || '',
    refreshtime: '5',
  };

  // Generate Hash v3
  formParams.HASH = generateHashV3(formParams);

  console.log('\n🏦 ══════════════════════════════════════');
  console.log('🏦  TEB NestPay — Payment Form Generated');
  console.log(`🏦  Order: ${orderReference}`);
  console.log(`🏦  Amount: €${amountStr}`);
  console.log(`🏦  Gateway: ${TEB_3D_GATE_URL}`);
  console.log('🏦 ══════════════════════════════════════\n');

  return {
    gatewayUrl: TEB_3D_GATE_URL,
    formParams,
  };
}

/**
 * Verify a TEB NestPay response hash (Hash v3).
 * Bank POSTs back all params including HASH — we recalculate and compare.
 */
function verifyResponseHash(postParams) {
  const receivedHash = postParams.HASH;
  if (!receivedHash) {
    console.error('🏦 No HASH in bank response');
    return false;
  }

  const sortedKeys = Object.keys(postParams).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  let hashVal = '';
  for (const key of sortedKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'hash' || lowerKey === 'encoding') continue;
    hashVal += escapeForHash(postParams[key] ?? '') + '|';
  }
  hashVal += escapeForHash(TEB_STORE_KEY);

  const sha512 = crypto.createHash('sha512').update(hashVal).digest('hex');
  const calculatedHash = Buffer.from(sha512, 'hex').toString('base64');

  const isValid = receivedHash === calculatedHash;
  console.log(`🏦 Hash verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  return isValid;
}

/**
 * Parse the TEB response to determine payment outcome.
 * Returns { success, transactionId, authCode, errorMessage, rawResponse }
 */
function parsePaymentResponse(postParams) {
  const mdStatus = postParams.mdStatus;
  const response = postParams.Response;
  const procReturnCode = postParams.ProcReturnCode;

  // mdStatus 1,2,3,4 = 3D auth success
  const is3DSuccess = ['1', '2', '3', '4'].includes(mdStatus);
  const isApproved = response === 'Approved';
  const success = is3DSuccess && isApproved;

  return {
    success,
    transactionId: postParams.TransId || '',
    authCode: postParams.AuthCode || '',
    hostRefNum: postParams.HostRefNum || '',
    orderId: postParams.oid || '',
    errorMessage: postParams.ErrMsg || '',
    mdStatus,
    procReturnCode,
    response,
    rawResponse: postParams,
  };
}

/**
 * Query order status via TEB API (XML)
 * Useful for admin dashboard / reconciliation
 */
function queryOrderStatus(orderId) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `DATA=<?xml version="1.0" encoding="ISO-8859-9"?>
<CC5Request>
  <Name>${TEB_API_USERNAME}</Name>
  <Password>${TEB_API_PASSWORD}</Password>
  <ClientId>${TEB_CLIENT_ID}</ClientId>
  <OrderId>${orderId}</OrderId>
  <Mode>P</Mode>
  <Extra><ORDERSTATUS>QUERY</ORDERSTATUS></Extra>
</CC5Request>`;

    const url = new URL(TEB_API_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(xmlRequest),
      },
      rejectUnauthorized: true,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });

    req.on('error', (error) => reject(error));
    req.write(xmlRequest);
    req.end();
  });
}

module.exports = {
  buildPaymentForm,
  verifyResponseHash,
  parsePaymentResponse,
  queryOrderStatus,
};
