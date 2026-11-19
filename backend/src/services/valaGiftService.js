/**
 * VALA Gift Service
 * Handles sending mobile data gifts to VALA customers
 */

const VALA_PHONE_REGEX = /^(\+383|0)?(44|45|46)\d{6}$/;

/**
 * Check if phone number matches VALA format
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
function isValaNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, '');
  return VALA_PHONE_REGEX.test(cleaned);
}

/**
 * Send gift to VALA customer via Core API
 * @param {string} phone - Phone number
 * @param {string} packageType - 'personal' or 'business'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendValaGift(phone, packageType) {
  try {
    if (!isValaNumber(phone)) {
      return { success: false, error: 'Phone number is not a valid VALA number' };
    }

    const CORE_API_URL = process.env.VALA_CORE_API_URL;
    const CORE_API_KEY = process.env.VALA_CORE_API_KEY;

    if (!CORE_API_URL) {
      // Mock mode: simulate Core API confirming the gift
      console.log(`🎁 [MOCK CORE] Sending VALA gift to ${phone} (${packageType})`);
      console.log(`🎁 [MOCK CORE] Gift confirmed for ${phone}`);
      return { success: true };
    }

    // Real Core API call (uncomment when endpoint is provided)
    /*
    const response = await fetch(`${CORE_API_URL}/add-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORE_API_KEY}`
      },
      body: JSON.stringify({
        phone: phone,
        package: packageType
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    return { success: true };
    */

  } catch (error) {
    console.error('❌ VALA gift error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  isValaNumber,
  sendValaGift,
};
