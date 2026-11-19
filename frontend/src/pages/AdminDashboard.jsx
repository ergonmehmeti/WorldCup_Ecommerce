import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Users, BarChart2, ShieldCheck, Trash2, Plus, Eye, EyeOff, RefreshCw, UserCog, Wifi,
  Search, ChevronLeft, ChevronRight, Gift, Pencil, Check, X, Mail, Download,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────
function Badge({ label, color }) {
  const colors = {
    green: 'bg-green-500/20 text-green-300',
    yellow: 'bg-yellow-500/20 text-yellow-300',
    red: 'bg-red-500/20 text-red-300',
    blue: 'bg-blue-500/20 text-blue-300',
    gray: 'bg-white/10 text-white/50',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <p className="text-white/50 text-sm">{label}</p>
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        ) : (
          <div className="text-white">{value}</div>
        )}
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Create Operator Modal ────────────────────────────────
function CreateOperatorModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'admin_operator' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Fjalëkalimi duhet të ketë të paktën 8 karaktere.');
      return;
    }
    setLoading(true);
    try {
      await api.createOperator(form);
      toast.success(`${form.role === 'admin' ? 'Admin' : 'Operator'} ${form.email} u krijua.`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-4">Create Admin Account</h2>
        <form onSubmit={handle} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="First name"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Last name"
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <input
            type="email"
            className="input-field w-full"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            type="tel"
            className="input-field w-full"
            placeholder="Phone number"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            type="password"
            className="input-field w-full"
            placeholder="Password (min 6 chars)"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <select
            className="input-field w-full"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="admin_operator">Admin Operator</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-gradient py-2 rounded-xl text-white font-semibold disabled:opacity-50">
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── VALA number check (mirrors backend regex) ───────────
const VALA_PHONE_REGEX = /^(\+383|0)?(44|45|46)\d{6}$/;
function isValaNumber(phone) {
  return phone && VALA_PHONE_REGEX.test(phone.replace(/[\s-]/g, ''));
}

// ─── Main Component ───────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [activeTab, setActiveTab] = useState('customers');
  const [provisioningId, setProvisioningId] = useState(null);
  const [sendingGiftId, setSendingGiftId] = useState(null);
  const [retryingOscId, setRetryingOscId] = useState(null);
  const [editingPhoneId, setEditingPhoneId] = useState(null);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [resendingVala, setResendingVala] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFrom, setCsvFrom] = useState('');
  const [csvTo, setCsvTo] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);

  // ─── Search & Pagination ─────────────────────
  const PAGE_SIZE = 15;

  // Returns page numbers (and '…' separators) for a window of up to 20 pages
  const getPageRange = (current, total, windowSize = 20) => {
    if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    const pages = [];
    if (start > 1) pages.push('…');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total) pages.push('…');
    return pages;
  };
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [operatorPage, setOperatorPage] = useState(1);

  const filteredCustomers = customers
    .filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(customerSearch.toLowerCase()))
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  const customerPageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const pagedCustomers = filteredCustomers.slice((customerPage - 1) * PAGE_SIZE, customerPage * PAGE_SIZE);

  const filteredOperators = operators
    .filter((o) => `${o.first_name} ${o.last_name} ${o.email}`.toLowerCase().includes(operatorSearch.toLowerCase()))
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  const operatorPageCount = Math.max(1, Math.ceil(filteredOperators.length / PAGE_SIZE));
  const pagedOperators = filteredOperators.slice((operatorPage - 1) * PAGE_SIZE, operatorPage * PAGE_SIZE);

  const fetchAll = useCallback(async (signal) => {
    setLoadingData(true);
    try {
      const [statsData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
      ]);
      if (signal?.aborted) return;
      setStats(statsData.stats);
      setCustomers(usersData.users);

      if (isAdmin) {
        const opsData = await api.getOperators();
        if (signal?.aborted) return;
        setOperators(opsData.operators);
      }
    } catch (err) {
      if (signal?.aborted) return;
      toast.error('Dështoi ngarkimi i të dhënave: ' + err.message);
    } finally {
      if (!signal?.aborted) setLoadingData(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  const handleManualProvisionOtt = async (c, packageType) => {
    const pkgLabel = packageType === 'business' ? 'BIZ' : 'Personal';
    if (!confirm(`Activate OTT (${pkgLabel}) for ${c.first_name} ${c.last_name} (${c.email})?`)) return;
    setProvisioningId(`${c.id}-${packageType}`);
    try {
      const result = await api.manualProvisionOtt(c.id, packageType);
      toast.success(`OTT (${pkgLabel}) u aktivizua! Përdoruesi: ${result.username}`);
      fetchAll();
    } catch (err) {
      toast.error(`Aktivizimi OTT (${pkgLabel}) dështoi: ` + err.message);
    } finally {
      setProvisioningId(null);
    }
  };

  const handleUpdatePhone = async (userId) => {
    const phone = editPhoneValue.trim();
    if (!phone) { toast.error('Numri i telefonit nuk mund të jetë bosh.'); return; }
    try {
      await api.updateUserPhone(userId, phone);
      toast.success('Numri u përditësua me sukses!');
      setEditingPhoneId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRetryOscGift = async (c, packageType) => {
    const pkgLabel = packageType === 'business' ? 'BIZ' : 'Personal';
    if (!confirm(`Retry OSC gift (${pkgLabel}) for ${c.first_name} ${c.last_name} (${c.phone})?`)) return;
    setRetryingOscId(`${c.id}-${packageType}`);
    try {
      const result = await api.retryOscGift(c.id, packageType);
      toast.success(`OSC gift (${pkgLabel}) u dërgua! TxnID: ${result.transactionId}`);
      fetchAll();
    } catch (err) {
      toast.error(`OSC retry (${pkgLabel}) dështoi: ` + err.message);
      fetchAll();
    } finally {
      setRetryingOscId(null);
    }
  };

  const handleSendGift = async (c, packageType) => {
    const pkgLabel = packageType === 'business' ? 'BIZ' : 'Personal';
    if (!confirm(`Send VALA gift (${pkgLabel}) to ${c.first_name} ${c.last_name} (${c.phone})?`)) return;
    setSendingGiftId(`${c.id}-${packageType}`);
    try {
      await api.sendGift(c.id, packageType);
      toast.success(`VALA gift (${pkgLabel}) u dërgua me sukses!`);
      fetchAll();
    } catch (err) {
      toast.error(`Dhurata (${pkgLabel}) dështoi: ` + err.message);
    } finally {
      setSendingGiftId(null);
    }
  };

  const handleResendFailedValaEmails = async () => {
    if (!confirm('Resend ALL failed/unsent VALA numbers to customer care?')) return;
    setResendingVala(true);
    try {
      const result = await api.resendFailedValaEmails();
      toast.success(result.message || `${result.count} numra u dërguan me sukses.`);
      fetchAll();
    } catch (err) {
      toast.error('Dërgimi dështoi: ' + err.message);
    } finally {
      setResendingVala(false);
    }
  };

  const handlePromoteToOperator = async (c) => {
    if (!confirm(`Promote ${c.email} to Admin Operator?`)) return;
    try {
      await api.promoteToOperator(c.id);
      toast.success(`${c.email} u promovua në Admin Operator.`);
      setCustomers((prev) => prev.filter((u) => u.id !== c.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePromoteOperatorToAdmin = async (op) => {
    if (!confirm(`Promote ${op.email} to full Admin?`)) return;
    try {
      await api.promoteOperatorToAdmin(op.id);
      toast.success(`${op.email} u promovua në Admin.`);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteOperator = async (op) => {
    if (!confirm(`Demote ${op.email} to customer?`)) return;
    try {
      await api.demoteOperator(op.id);
      toast.success(`${op.email} u kthye në klient.`);
      setOperators((prev) => prev.filter((o) => o.id !== op.id));
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const togglePassword = (id) =>
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (ts) =>
    ts ? new Date(ts).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{isAdmin ? 'Admin Dashboard' : 'Operator'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && customers.some(c => isValaNumber(c.phone) && ((c.payment_status === 'paid' && !c.vala_email_sent) || (c.biz_payment_status === 'paid' && !c.vala_biz_email_sent))) && (
            <button
              onClick={handleResendFailedValaEmails}
              disabled={resendingVala}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition text-sm disabled:opacity-50"
            >
              {resendingVala ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
              Resend Failed CSV
            </button>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'customers'
              ? 'bg-purple-600 text-white'
              : 'border border-white/20 text-white/60 hover:bg-white/10'
          }`}
        >
          <Users size={14} className="inline mr-2" />
          Customers ({customers.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('operators')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'operators'
                ? 'bg-purple-600 text-white'
                : 'border border-white/20 text-white/60 hover:bg-white/10'
            }`}
          >
            <ShieldCheck size={14} className="inline mr-2" />
            Admin Accounts ({operators.length})
          </button>
        )}
        <button
          onClick={() => setShowStats((s) => !s)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/20 text-white/60 hover:bg-white/10 transition"
        >
          <BarChart2 size={14} />
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/20 text-white/60 hover:bg-white/10 transition"
          >
            <Download size={14} />
            Download CSV
          </button>
        )}
      </div>

      {/* CSV Export Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-white mb-4">Download Payments CSV</h2>
            <div className="flex flex-col gap-4">
              <button
                disabled={csvLoading}
                onClick={async () => {
                  setCsvLoading(true);
                  try { await api.downloadPaymentsCsv(); setShowCsvModal(false); }
                  catch (e) { toast.error('Export failed: ' + e.message); }
                  finally { setCsvLoading(false); }
                }}
                className="btn-primary py-2 text-sm"
              >
                {csvLoading ? 'Exporting...' : 'All Payments'}
              </button>
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/50 text-xs mb-3">Date range:</p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className="text-white/40 text-xs mb-1 block">From</label>
                    <input type="date" className="input-field py-2 text-sm w-full" value={csvFrom} onChange={(e) => setCsvFrom(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-white/40 text-xs mb-1 block">To</label>
                    <input type="date" className="input-field py-2 text-sm w-full" value={csvTo} onChange={(e) => setCsvTo(e.target.value)} />
                  </div>
                </div>
                <button
                  disabled={csvLoading || !csvFrom || !csvTo}
                  onClick={async () => {
                    setCsvLoading(true);
                    try { await api.downloadPaymentsCsv(csvFrom, csvTo); setShowCsvModal(false); }
                    catch (e) { toast.error('Export failed: ' + e.message); }
                    finally { setCsvLoading(false); }
                  }}
                  className="btn-primary py-2 text-sm w-full disabled:opacity-40"
                >
                  {csvLoading ? 'Exporting...' : 'Download by Date Range'}
                </button>
              </div>
              <button onClick={() => setShowCsvModal(false)} className="text-white/40 text-sm hover:text-white/70 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats — collapsible */}
      {showStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Users} label="Total Customers" value={stats?.total_customers} />
          <StatCard 
            icon={ShieldCheck} 
            label="Provisioned by Package" 
            value={
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-1">
                <span className="text-sm font-semibold text-blue-300">BIZ: {stats?.provisionedByPackage?.BIZ ?? 0}</span>
                <span className="text-sm font-semibold text-purple-300">PlayOFF: {stats?.provisionedByPackage?.PlayOFF ?? 0}</span>
                <span className="text-sm font-semibold text-purple-300">FazaFinale: {stats?.provisionedByPackage?.FazaFinale ?? 0}</span>
                <span className="text-sm font-semibold text-pink-300">Personal: {stats?.provisionedByPackage?.Personal ?? 0}</span>
                <span className="text-sm font-semibold text-green-300">XXL: {stats?.provisionedByPackage?.XXL ?? 0}</span>
                <span className="text-sm font-semibold text-green-300">XL: {stats?.provisionedByPackage?.XL ?? 0}</span>
                <span className="text-sm font-semibold text-green-300">L: {stats?.provisionedByPackage?.L ?? 0}</span>
                <span className="text-sm font-semibold text-green-300">M: {stats?.provisionedByPackage?.M ?? 0}</span>
                <span className="text-sm font-semibold text-green-300">S: {stats?.provisionedByPackage?.S ?? 0}</span>
              </div>
            }
          />
          <StatCard
            icon={BarChart2}
            label="Paid, No Credentials"
            value={`${stats?.paid_not_provisioned_personal ?? 0} / ${stats?.paid_not_provisioned_business ?? 0}`}
            sub="Personal / BIZ"
          />
        </div>
      )}

      {/* ── Customers Table ── */}
      {activeTab === 'customers' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                className="input-field pl-8 py-2 text-sm w-full"
                placeholder="Kërko sipas emrit..."
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setCustomerPage(1); }}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-left">
                  <th className="px-4 py-3 font-medium">Emri</th>
                  <th className="px-4 py-3 font-medium">Emaili</th>
                  <th className="px-4 py-3 font-medium">Telefoni</th>
                  <th className="px-4 py-3 font-medium">E Verifikuar</th>
                  <th className="px-4 py-3 font-medium">OTT ValaBoterori</th>
                  <th className="px-4 py-3 font-medium">OTT ValaBoterori BIZ</th>
                  <th className="px-4 py-3 font-medium">104GB Dhuratë</th>
                  <th className="px-4 py-3 font-medium">Paketa e Paguar</th>
                  <th className="px-4 py-3 font-medium">OSC e Konfirmuar</th>
                  <th className="px-4 py-3 font-medium min-w-[160px]">OSC Recharge</th>
                  <th className="px-4 py-3 font-medium min-w-[180px]">Email Drejt CRM - 104GB Dhuratë</th>
                  <th className="px-2 py-3 font-medium">Veprime</th>
                  <th className="px-4 py-3 font-medium">Data e Regjistrimit</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-white/30">
                      No customers yet.
                    </td>
                  </tr>
                ) : (
                  pagedCustomers.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-4 py-3 text-white/70">{c.email}</td>
                      <td className="px-4 py-3 text-white/70">
                        {editingPhoneId === c.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="input-field py-1 px-2 text-sm w-28"
                              value={editPhoneValue}
                              onChange={(e) => setEditPhoneValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdatePhone(c.id);
                                if (e.key === 'Escape') setEditingPhoneId(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => handleUpdatePhone(c.id)} className="text-green-400 hover:text-green-300 p-0.5"><Check size={14} /></button>
                            <button onClick={() => setEditingPhoneId(null)} className="text-red-400 hover:text-red-300 p-0.5"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{c.phone}</span>
                            {isAdmin && (
                              <button
                                onClick={() => { setEditingPhoneId(c.id); setEditPhoneValue(c.phone || ''); }}
                                title="Ndrysho numrin"
                                className="text-white/30 hover:text-white/70 transition p-0.5"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={c.email_verified ? 'PO' : 'JO'}
                          color={c.email_verified ? 'green' : 'yellow'}
                        />
                      </td>
                      {/* Personal package column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge
                            label={c.payment_status === 'paid' ? 'E paguar' : c.payment_status === 'failed' ? 'E dështuar' : 'E pa paguar'}
                            color={c.payment_status === 'paid' ? 'green' : c.payment_status === 'failed' ? 'red' : 'yellow'}
                          />
                          {c.ott_username && (
                            <div className="text-white font-mono text-sm font-semibold mt-1">{c.ott_username}</div>
                          )}
                          {c.ott_password && (
                            <div className="text-white font-mono text-sm font-semibold mt-0.5">{c.ott_password}</div>
                          )}
                        </div>
                      </td>
                      {/* BIZ package column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge
                            label={c.biz_payment_status === 'paid' ? 'E paguar' : c.biz_payment_status === 'failed' ? 'E dështuar' : 'E pa paguar'}
                            color={c.biz_payment_status === 'paid' ? 'green' : c.biz_payment_status === 'failed' ? 'red' : 'yellow'}
                          />
                          {c.biz_ott_username && (
                            <div className="text-white font-mono text-sm font-semibold mt-1">{c.biz_ott_username}</div>
                          )}
                          {c.biz_ott_password && (
                            <div className="text-white font-mono text-sm font-semibold mt-0.5">{c.biz_ott_password}</div>
                          )}
                        </div>
                      </td>
                      {/* VALA Gift column */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {/* Personal gift */}
                          {c.payment_status === 'paid' ? (
                            c.valaboterori_gift ? (
                              <Badge label="✅ valaboterori 104GB" color="green" />
                            ) : isValaNumber(c.phone) ? (
                              <span className="text-white/20 text-xs">—</span>
                            ) : (
                              <Badge label="Not a Vala Number" color="gray" />
                            )
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                          {/* BIZ gift */}
                          {c.biz_payment_status === 'paid' ? (
                            c.valaboterori_biz_gift ? (
                              <Badge label="✅ valaboterori_biz 104GB" color="green" />
                            ) : isValaNumber(c.phone) ? (
                              <span className="text-white/20 text-xs">—</span>
                            ) : (
                              <Badge label="Not a Vala Number" color="gray" />
                            )
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      {/* Paketa e Paguar (from payments table - what was ordered) */}
                      <td className="px-4 py-3">
                        {c.payment_mobile_package ? (
                          <Badge label={c.payment_mobile_package} color="yellow" />
                        ) : c.payment_status === 'paid' ? (
                          <span className="text-white/20 text-xs">—</span>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* OSC e Konfirmuar (from users table - what OSC delivered) */}
                      <td className="px-4 py-3">
                        {c.mobile_package ? (
                          <Badge label={`✅ ${c.mobile_package}`} color="green" />
                        ) : c.payment_mobile_package ? (
                          <Badge label="⏳ Pending" color="blue" />
                        ) : c.payment_status === 'paid' ? (
                          <span className="text-white/20 text-xs">—</span>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* OSC Recharge column */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {/* Personal OSC */}
                          {c.payment_status === 'paid' && isValaNumber(c.phone) ? (
                            c.valaboterori_gift ? (
                              c.osc_transaction_id?.startsWith('MOCK-')
                                ? <Badge label="Mock" color="gray" />
                                : <Badge label="✅ OSC OK" color="green" />
                            ) : c.osc_gift_attempted ? (
                              <div className="flex flex-col gap-1">
                                <Badge label="❌ OSC Failed" color="red" />
                                {c.osc_gift_error && (
                                  <span className="text-white/40 text-xs leading-tight" title={c.osc_gift_error}>
                                    {c.osc_gift_error.substring(0, 40)}{c.osc_gift_error.length > 40 ? '…' : ''}
                                  </span>
                                )}
                                {!c.osc_gift_error?.startsWith('[OSC]') && (
                                  <button
                                    onClick={() => handleRetryOscGift(c, 'personal')}
                                    disabled={retryingOscId === `${c.id}-personal`}
                                    className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {retryingOscId === `${c.id}-personal` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                    Retry
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge label="⏳ Pending" color="yellow" />
                                <button
                                  onClick={() => handleRetryOscGift(c, 'personal')}
                                  disabled={retryingOscId === `${c.id}-personal`}
                                  className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {retryingOscId === `${c.id}-personal` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                  Send
                                </button>
                              </div>
                            )
                          ) : c.payment_status === 'paid' ? (
                            <Badge label="N/A" color="gray" />
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                          {/* BIZ OSC */}
                          {c.biz_payment_status === 'paid' && isValaNumber(c.phone) ? (
                            c.valaboterori_biz_gift ? (
                              c.osc_biz_transaction_id?.startsWith('MOCK-')
                                ? <Badge label="BIZ Mock" color="gray" />
                                : <Badge label="✅ BIZ OSC OK" color="green" />
                            ) : c.osc_biz_gift_attempted ? (
                              <div className="flex flex-col gap-1">
                                <Badge label="❌ BIZ OSC Failed" color="red" />
                                {c.osc_biz_gift_error && (
                                  <span className="text-white/40 text-xs leading-tight" title={c.osc_biz_gift_error}>
                                    {c.osc_biz_gift_error.substring(0, 40)}{c.osc_biz_gift_error.length > 40 ? '…' : ''}
                                  </span>
                                )}
                                {!c.osc_biz_gift_error?.startsWith('[OSC]') && (
                                  <button
                                    onClick={() => handleRetryOscGift(c, 'business')}
                                    disabled={retryingOscId === `${c.id}-business`}
                                    className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {retryingOscId === `${c.id}-business` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                    Retry BIZ
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge label="⏳ BIZ Pending" color="yellow" />
                                <button
                                  onClick={() => handleRetryOscGift(c, 'business')}
                                  disabled={retryingOscId === `${c.id}-business`}
                                  className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {retryingOscId === `${c.id}-business` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                  Send BIZ
                                </button>
                              </div>
                            )
                          ) : c.biz_payment_status === 'paid' ? (
                            <Badge label="BIZ N/A" color="gray" />
                          ) : null}
                        </div>
                      </td>
                      {/* Email Status column */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {/* Personal email status */}
                          {c.payment_status === 'paid' && isValaNumber(c.phone) ? (
                            c.valaboterori_gift ? (
                              <Badge label="✅ 104GB aktivizuar nga OSC" color="green" />
                            ) : c.vala_email_sent ? (
                              <Badge label="Emaili eshte derguar" color="green" />
                            ) : c.vala_email_failed ? (
                              <Badge label="Emaili ka deshtuar" color="red" />
                            ) : (
                              <Badge label="Ne pritje" color="yellow" />
                            )
                          ) : c.payment_status === 'paid' ? (
                            <Badge label="N/A" color="gray" />
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                          {/* BIZ email status */}
                          {c.biz_payment_status === 'paid' && isValaNumber(c.phone) ? (
                            c.valaboterori_biz_gift ? (
                              <Badge label="✅ BIZ 104GB aktivizuar nga OSC" color="green" />
                            ) : c.vala_biz_email_sent ? (
                              <Badge label="BIZ Emaili eshte derguar" color="green" />
                            ) : c.vala_biz_email_failed ? (
                              <Badge label="BIZ Emaili ka deshtuar" color="red" />
                            ) : (
                              <Badge label="BIZ Ne pritje" color="yellow" />
                            )
                          ) : c.biz_payment_status === 'paid' ? (
                            <Badge label="BIZ N/A" color="gray" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {c.payment_status === 'paid' && !c.ott_provisioned && (
                            <button
                              onClick={() => handleManualProvisionOtt(c, 'personal')}
                              disabled={provisioningId === `${c.id}-personal`}
                              title="Activate OTT Personal"
                              className="text-green-400 hover:text-green-300 transition p-1 rounded-lg hover:bg-green-400/10 disabled:opacity-50"
                            >
                              {provisioningId === `${c.id}-personal`
                                ? <RefreshCw size={15} className="animate-spin" />
                                : <Wifi size={15} />}
                            </button>
                          )}
                          {c.biz_payment_status === 'paid' && !c.biz_ott_provisioned && (
                            <button
                              onClick={() => handleManualProvisionOtt(c, 'business')}
                              disabled={provisioningId === `${c.id}-business`}
                              title="Activate OTT BIZ"
                              className="text-blue-400 hover:text-blue-300 transition p-1 rounded-lg hover:bg-blue-400/10 disabled:opacity-50"
                            >
                              {provisioningId === `${c.id}-business`
                                ? <RefreshCw size={15} className="animate-spin" />
                                : <Wifi size={15} />}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handlePromoteToOperator(c)}
                              title="Promote to Admin Operator"
                              className="text-purple-400 hover:text-purple-300 transition p-1 rounded-lg hover:bg-purple-400/10"
                            >
                              <UserCog size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {customerPageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                {filteredCustomers.length} result{filteredCustomers.length !== 1 ? 's' : ''} &mdash; faqja {customerPage} nga {customerPageCount}
              </p>
              <div className="flex gap-1 items-center">
                {/* « First */}
                <button
                  onClick={() => setCustomerPage(1)}
                  disabled={customerPage === 1}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition text-xs"
                  title="First page"
                >
                  «
                </button>
                {/* ‹ Prev */}
                <button
                  onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                  disabled={customerPage === 1}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {/* Page numbers (windowed) */}
                {getPageRange(customerPage, customerPageCount).map((n, idx) =>
                  n === '…' ? (
                    <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-white/30 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setCustomerPage(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                        n === customerPage ? 'bg-purple-600 text-white' : 'border border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                {/* › Next */}
                <button
                  onClick={() => setCustomerPage((p) => Math.min(customerPageCount, p + 1))}
                  disabled={customerPage === customerPageCount}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                {/* » Last */}
                <button
                  onClick={() => setCustomerPage(customerPageCount)}
                  disabled={customerPage === customerPageCount}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition text-xs"
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Operators Table (admin only) ── */}
      {activeTab === 'operators' && isAdmin && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-white/50 text-sm">Admin accounts can access this dashboard.</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  className="input-field pl-8 py-2 text-sm"
                  placeholder="Kërko sipas emrit..."
                  value={operatorSearch}
                  onChange={(e) => { setOperatorSearch(e.target.value); setOperatorPage(1); }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowOperatorModal(true)}
              className="btn-gradient flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            >
              <Plus size={14} />
              Add Admin Account
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">OTT Personal</th>
                  <th className="px-4 py-3 font-medium">OTT BIZ</th>
                  <th className="px-4 py-3 font-medium">104GB Dhuratë</th>
                  <th className="px-4 py-3 font-medium">Paketa e Paguar</th>
                  <th className="px-4 py-3 font-medium">OSC e Konfirmuar</th>
                  <th className="px-4 py-3 font-medium min-w-[160px]">OSC Recharge</th>
                  <th className="px-4 py-3 font-medium min-w-[180px]">Email Drejt CRM - 104GB Dhuratë</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-white/30">
                      No admin accounts yet.
                    </td>
                  </tr>
                ) : (
                  pagedOperators.map((op) => (
                    <tr key={op.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {op.first_name} {op.last_name}
                      </td>
                      <td className="px-4 py-3 text-white/70">{op.email}</td>
                      <td className="px-4 py-3 text-white/70">
                        {editingPhoneId === op.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="input-field py-1 px-2 text-sm w-28"
                              value={editPhoneValue}
                              onChange={(e) => setEditPhoneValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdatePhone(op.id);
                                if (e.key === 'Escape') setEditingPhoneId(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => handleUpdatePhone(op.id)} className="text-green-400 hover:text-green-300 p-0.5"><Check size={14} /></button>
                            <button onClick={() => setEditingPhoneId(null)} className="text-red-400 hover:text-red-300 p-0.5"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{op.phone || '—'}</span>
                            {isAdmin && (
                              <button
                                onClick={() => { setEditingPhoneId(op.id); setEditPhoneValue(op.phone || ''); }}
                                title="Ndrysho numrin"
                                className="text-white/30 hover:text-white/70 transition p-0.5"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={op.role === 'admin' ? 'Admin' : 'Operator'}
                          color={op.role === 'admin' ? 'blue' : 'gray'}
                        />
                      </td>
                      {/* Personal package */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge
                            label={op.payment_status === 'paid' ? 'E paguar' : op.payment_status === 'failed' ? 'E dështuar' : 'E pa paguar'}
                            color={op.payment_status === 'paid' ? 'green' : op.payment_status === 'failed' ? 'red' : 'yellow'}
                          />
                          {op.ott_username && <div className="text-white font-mono text-sm font-semibold mt-1">{op.ott_username}</div>}
                          {op.ott_password && <div className="text-white font-mono text-sm font-semibold mt-0.5">{op.ott_password}</div>}
                        </div>
                      </td>
                      {/* BIZ package */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge
                            label={op.biz_payment_status === 'paid' ? 'E paguar' : op.biz_payment_status === 'failed' ? 'E dështuar' : 'E pa paguar'}
                            color={op.biz_payment_status === 'paid' ? 'green' : op.biz_payment_status === 'failed' ? 'red' : 'yellow'}
                          />
                          {op.biz_ott_username && <div className="text-white font-mono text-sm font-semibold mt-1">{op.biz_ott_username}</div>}
                          {op.biz_ott_password && <div className="text-white font-mono text-sm font-semibold mt-0.5">{op.biz_ott_password}</div>}
                        </div>
                      </td>
                      {/* VALA Gift */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {op.payment_status === 'paid' ? (
                            op.valaboterori_gift ? (
                              <Badge label="✅ valaboterori 104GB" color="green" />
                            ) : <span className="text-white/20 text-xs">—</span>
                          ) : <span className="text-white/20 text-xs">—</span>}
                          {op.biz_payment_status === 'paid' ? (
                            op.valaboterori_biz_gift ? (
                              <Badge label="✅ valaboterori_biz 104GB" color="green" />
                            ) : <span className="text-white/20 text-xs">—</span>
                          ) : null}
                        </div>
                      </td>
                      {/* Paketa e Paguar (from payments table - what was ordered) */}
                      <td className="px-4 py-3">
                        {op.payment_mobile_package ? (
                          <Badge label={op.payment_mobile_package} color="yellow" />
                        ) : op.payment_status === 'paid' ? (
                          <span className="text-white/20 text-xs">—</span>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* OSC e Konfirmuar (from users table - what OSC delivered) */}
                      <td className="px-4 py-3">
                        {op.mobile_package ? (
                          <Badge label={`✅ ${op.mobile_package}`} color="green" />
                        ) : op.payment_mobile_package ? (
                          <Badge label="⏳ Pending" color="blue" />
                        ) : op.payment_status === 'paid' ? (
                          <span className="text-white/20 text-xs">—</span>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {/* OSC Recharge */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {/* Personal OSC */}
                          {op.payment_status === 'paid' && isValaNumber(op.phone) ? (
                            op.valaboterori_gift ? (
                              op.osc_transaction_id?.startsWith('MOCK-')
                                ? <Badge label="Mock" color="gray" />
                                : <Badge label="✅ OSC OK" color="green" />
                            ) : op.osc_gift_attempted ? (
                              <div className="flex flex-col gap-1">
                                <Badge label="❌ OSC Failed" color="red" />
                                {op.osc_gift_error && (
                                  <span className="text-white/40 text-xs leading-tight" title={op.osc_gift_error}>
                                    {op.osc_gift_error.substring(0, 40)}{op.osc_gift_error.length > 40 ? '…' : ''}
                                  </span>
                                )}
                                {!op.osc_gift_error?.startsWith('[OSC]') && (
                                  <button
                                    onClick={() => handleRetryOscGift(op, 'personal')}
                                    disabled={retryingOscId === `${op.id}-personal`}
                                    className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {retryingOscId === `${op.id}-personal` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                    Retry
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge label="⏳ Pending" color="yellow" />
                                <button
                                  onClick={() => handleRetryOscGift(op, 'personal')}
                                  disabled={retryingOscId === `${op.id}-personal`}
                                  className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {retryingOscId === `${op.id}-personal` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                  Send
                                </button>
                              </div>
                            )
                          ) : op.payment_status === 'paid' ? (
                            <Badge label="N/A" color="gray" />
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                          {/* BIZ OSC */}
                          {op.biz_payment_status === 'paid' && isValaNumber(op.phone) ? (
                            op.valaboterori_biz_gift ? (
                              op.osc_biz_transaction_id?.startsWith('MOCK-')
                                ? <Badge label="BIZ Mock" color="gray" />
                                : <Badge label="✅ BIZ OSC OK" color="green" />
                            ) : op.osc_biz_gift_attempted ? (
                              <div className="flex flex-col gap-1">
                                <Badge label="❌ BIZ OSC Failed" color="red" />
                                {op.osc_biz_gift_error && (
                                  <span className="text-white/40 text-xs leading-tight" title={op.osc_biz_gift_error}>
                                    {op.osc_biz_gift_error.substring(0, 40)}{op.osc_biz_gift_error.length > 40 ? '…' : ''}
                                  </span>
                                )}
                                {!op.osc_biz_gift_error?.startsWith('[OSC]') && (
                                  <button
                                    onClick={() => handleRetryOscGift(op, 'business')}
                                    disabled={retryingOscId === `${op.id}-business`}
                                    className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {retryingOscId === `${op.id}-business` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                    Retry BIZ
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge label="⏳ BIZ Pending" color="yellow" />
                                <button
                                  onClick={() => handleRetryOscGift(op, 'business')}
                                  disabled={retryingOscId === `${op.id}-business`}
                                  className="text-xs text-orange-400 hover:text-orange-300 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {retryingOscId === `${op.id}-business` ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                  Send BIZ
                                </button>
                              </div>
                            )
                          ) : op.biz_payment_status === 'paid' ? (
                            <Badge label="BIZ N/A" color="gray" />
                          ) : null}
                        </div>
                      </td>
                      {/* Email Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {op.payment_status === 'paid' && isValaNumber(op.phone) ? (
                            op.vala_email_sent ? (
                              <Badge label="Emaili eshte derguar" color="green" />
                            ) : op.vala_email_failed ? (
                              <Badge label="Emaili ka deshtuar" color="red" />
                            ) : (
                              <Badge label="Ne pritje" color="yellow" />
                            )
                          ) : op.payment_status === 'paid' ? (
                            <Badge label="N/A" color="gray" />
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                          {op.biz_payment_status === 'paid' && isValaNumber(op.phone) ? (
                            op.vala_biz_email_sent ? (
                              <Badge label="BIZ Emaili eshte derguar" color="green" />
                            ) : op.vala_biz_email_failed ? (
                              <Badge label="BIZ Emaili ka deshtuar" color="red" />
                            ) : (
                              <Badge label="BIZ Ne pritje" color="yellow" />
                            )
                          ) : op.biz_payment_status === 'paid' ? (
                            <Badge label="BIZ N/A" color="gray" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{formatDate(op.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {op.payment_status === 'paid' && !op.ott_provisioned && (
                            <button
                              onClick={() => handleManualProvisionOtt(op, 'personal')}
                              disabled={provisioningId === `${op.id}-personal`}
                              title="Activate OTT Personal"
                              className="text-green-400 hover:text-green-300 transition p-1 rounded-lg hover:bg-green-400/10 disabled:opacity-50"
                            >
                              {provisioningId === `${op.id}-personal`
                                ? <RefreshCw size={15} className="animate-spin" />
                                : <Wifi size={15} />}
                            </button>
                          )}
                          {op.biz_payment_status === 'paid' && !op.biz_ott_provisioned && (
                            <button
                              onClick={() => handleManualProvisionOtt(op, 'business')}
                              disabled={provisioningId === `${op.id}-business`}
                              title="Activate OTT BIZ"
                              className="text-blue-400 hover:text-blue-300 transition p-1 rounded-lg hover:bg-blue-400/10 disabled:opacity-50"
                            >
                              {provisioningId === `${op.id}-business`
                                ? <RefreshCw size={15} className="animate-spin" />
                                : <Wifi size={15} />}
                            </button>
                          )}
                          {op.role === 'admin_operator' && (
                            <button
                              onClick={() => handlePromoteOperatorToAdmin(op)}
                              title="Promote to Admin"
                              className="text-blue-400 hover:text-blue-300 transition p-1 rounded-lg hover:bg-blue-400/10"
                            >
                              <ShieldCheck size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOperator(op)}
                            title="Demote to Customer"
                            className="text-red-400 hover:text-red-300 transition p-1 rounded-lg hover:bg-red-400/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>          {operatorPageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                {filteredOperators.length} result{filteredOperators.length !== 1 ? 's' : ''} &mdash; faqja {operatorPage} nga {operatorPageCount}
              </p>
              <div className="flex gap-1 items-center">
                {/* « First */}
                <button
                  onClick={() => setOperatorPage(1)}
                  disabled={operatorPage === 1}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition text-xs"
                  title="First page"
                >
                  «
                </button>
                {/* ‹ Prev */}
                <button
                  onClick={() => setOperatorPage((p) => Math.max(1, p - 1))}
                  disabled={operatorPage === 1}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {/* Page numbers (windowed) */}
                {getPageRange(operatorPage, operatorPageCount).map((n, idx) =>
                  n === '…' ? (
                    <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-white/30 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setOperatorPage(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                        n === operatorPage ? 'bg-purple-600 text-white' : 'border border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                {/* › Next */}
                <button
                  onClick={() => setOperatorPage((p) => Math.min(operatorPageCount, p + 1))}
                  disabled={operatorPage === operatorPageCount}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                {/* » Last */}
                <button
                  onClick={() => setOperatorPage(operatorPageCount)}
                  disabled={operatorPage === operatorPageCount}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/10 disabled:opacity-30 transition text-xs"
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          )}        </div>
      )}

      {showOperatorModal && (
        <CreateOperatorModal
          onClose={() => setShowOperatorModal(false)}
          onCreated={fetchAll}
        />
      )}
    </div>
  );
}
