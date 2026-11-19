/**
 * API Client
 * Handles all HTTP requests to the backend
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('wctv_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('wctv_token', token);
    } else {
      localStorage.removeItem('wctv_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();

    if (response.status === 401) {
      // Token expired or invalid — clear it and notify the app
      this.setToken(null);
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      throw new Error(data.error || 'Your session has expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  }

  // ─── Auth ────────────────────────────────────
  async signup(userData) {
    const data = await this.request('POST', '/auth/signup', userData);
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  async verifyEmail(code) {
    return this.request('POST', '/auth/verify-email', { code });
  }

  async resendCode() {
    return this.request('POST', '/auth/resend-code');
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  async forgotPassword(email) {
    return this.request('POST', '/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.request('POST', '/auth/reset-password', { token, newPassword });
  }

  // ─── Payment ─────────────────────────────────
  async acceptAgreement(packageType = 'premium') {
    return this.request('POST', '/agreements/accept', { packageType });
  }

  async createPayment(packageType = 'personal', mobilePackage = null) {
    return this.request('POST', '/payment/create', { packageType, mobilePackage });
  }

  async getPaymentStatus() {
    return this.request('GET', '/payment/status');
  }

  async resetPendingPayment() {
    return this.request('POST', '/payment/reset-pending');
  }

  // ─── Admin ───────────────────────────────────
  async getAdminUsers() {
    return this.request('GET', '/admin/users');
  }

  async getAdminStats() {
    return this.request('GET', '/admin/stats');
  }

  async getOperators() {
    return this.request('GET', '/admin/operators');
  }

  async createOperator(data) {
    return this.request('POST', '/admin/operators', data);
  }

  async deleteOperator(id) {
    return this.request('DELETE', `/admin/operators/${id}`);
  }

  async demoteOperator(id) {
    return this.request('PUT', `/admin/operators/${id}/demote`);
  }

  async promoteToOperator(id) {
    return this.request('PUT', `/admin/users/${id}/promote`);
  }

  async promoteOperatorToAdmin(id) {
    return this.request('PUT', `/admin/operators/${id}/promote-admin`);
  }

  async manualProvisionOtt(id, packageType = 'personal') {
    return this.request('POST', `/admin/users/${id}/provision-ott`, { packageType });
  }

  async updateUserPhone(id, phone) {
    return this.request('PATCH', `/admin/users/${id}/phone`, { phone });
  }

  async sendGift(id, packageType) {
    return this.request('POST', `/admin/users/${id}/send-gift`, { packageType });
  }

  async retryOscGift(id, packageType) {
    return this.request('POST', `/admin/users/${id}/retry-osc-gift`, { packageType });
  }

  async resendFailedValaEmails() {
    return this.request('POST', '/admin/vala-gifts/resend-all-failed');
  }

  async downloadPaymentsCsv(from = null, to = null) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const url = `${API_BASE}/admin/payments/export${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw new Error('Failed to export payments');
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+?)"/);
    const filename = match ? match[1] : 'payments.csv';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ─── Utility ─────────────────────────────────
  logout() {
    this.setToken(null);
  }
}

const api = new ApiClient();
export default api;
