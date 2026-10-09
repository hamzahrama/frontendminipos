"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  Coins,
  TrendingUp,
  HardDrive,
  RotateCcw,
  Search,
  Eye,
  Ban,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
} from "lucide-react";

type Session = {
  accessToken: string;
  user: {
    tenant: { id: string; name: string; slug: string };
    roles: string[];
  };
};

type AdminSummary = {
  tenants: number;
  activeTenants: number;
  suspendedTenants: number;
  users: number;
  transactions30d: number;
  revenue30d: number;
};

type TenantUsage = {
  users: number;
  products: number;
  customers: number;
  transactions: number;
  images: number;
  transactions30d: number;
  revenue30d: number;
  lastTransactionAt: string | null;
  estimatedDbBytes: number;
};

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  suspendedAt: string | null;
  suspendReason: string | null;
  createdAt: string;
  publicCatalogEnabled: boolean;
  usage: TenantUsage;
};

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  suspendedAt: string | null;
  suspendReason: string | null;
  createdAt: string;
  memberships: Array<{
    createdAt: string;
    role: { code: string };
    user: { id: string; name: string; email: string };
  }>;
  recentAudit: Array<{
    action: string;
    resource: string;
    createdAt: string;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SuperAdminPanel({ session }: { session: Session }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [suspendModalTenant, setSuspendModalTenant] = useState<TenantItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.user.tenant.id,
      "Content-Type": "application/json",
    }),
    [session.accessToken, session.user.tenant.id]
  );

  const loadData = useCallback(async () => {
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (statusFilter) query.set("status", statusFilter);

      const [sumRes, listRes] = await Promise.all([
        fetch(`${API_URL}/admin/summary`, { headers }),
        fetch(`${API_URL}/admin/tenants?${query.toString()}`, { headers }),
      ]);

      const [sumBody, listBody] = await Promise.all([sumRes.json(), listRes.json()]);

      if (!sumRes.ok) throw new Error(sumBody.message ?? "Gagal memuat ringkasan admin.");
      if (!listRes.ok) throw new Error(listBody.message ?? "Gagal memuat daftar tenant.");

      setSummary(sumBody as AdminSummary);
      setTenants(listBody as TenantItem[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data super admin.");
    }
  }, [headers, search, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function openDetail(id: string) {
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Gagal memuat detail tenant.");
      setSelectedTenant(data as TenantDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat detail tenant.");
    }
  }

  async function toggleStatus(tenant: TenantItem, toStatus: "ACTIVE" | "SUSPENDED", reason?: string) {
    if (tenant.id === session.user.tenant.id && toStatus === "SUSPENDED") {
      setError("Anda tidak dapat menangguhkan tenant Anda sendiri.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenant.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: toStatus,
          ...(reason ? { reason } : {}),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message ?? "Gagal mengubah status tenant.");
      }

      setMessage(
        toStatus === "ACTIVE"
          ? `Tenant "${tenant.name}" berhasil diaktifkan kembali.`
          : `Tenant "${tenant.name}" berhasil ditangguhkan.`
      );
      setSuspendModalTenant(null);
      setSuspendReason("");
      await loadData();
      if (selectedTenant?.id === tenant.id) {
        await openDetail(tenant.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Terjadi kesalahan saat mengubah status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="super-admin-panel space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label text-amber-700">PLATFORM ADMIN KONSOL</span>
          <h3>Kelola Multi-Tenant & Platform</h3>
          <p>Pantau metrik seluruh toko, omzet global 30 hari, dan kelola status aktif/suspend tenant.</p>
        </div>
        <span className="product-count bg-amber-50 text-amber-800 border border-amber-300">
          <Building2 className="h-3.5 w-3.5" />
          {tenants.length} Toko Terdaftar
        </span>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="feedback success" role="status">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Metrik Global */}
      {summary && (
        <section className="catalog-panel border-amber-200">
          <div className="section-title">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              <h4>Metrik Platform Global</h4>
            </div>
            <button
              className="button button-secondary text-xs"
              onClick={() => void loadData()}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
              Muat Ulang
            </button>
          </div>

          <div className="report-kpis grid grid-cols-2 md:grid-cols-4 gap-4">
            <article>
              <div className="flex items-center justify-between">
                <span>Total Toko</span>
                <Building2 className="h-4 w-4 text-amber-600" />
              </div>
              <strong className="text-2xl text-slate-900">{summary.tenants}</strong>
              <small className="text-[11px] text-slate-500">
                {summary.activeTenants} aktif · {summary.suspendedTenants} suspended
              </small>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Pengguna Terdaftar</span>
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <strong className="text-2xl text-slate-900">{summary.users}</strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Transaksi (30 Hari)</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <strong className="text-2xl text-emerald-700">
                {summary.transactions30d.toLocaleString("id-ID")}
              </strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Omzet Global (30h)</span>
                <Coins className="h-4 w-4 text-amber-600" />
              </div>
              <strong className="text-2xl text-amber-700">
                Rp {summary.revenue30d.toLocaleString("id-ID")}
              </strong>
            </article>
          </div>
        </section>
      )}

      {/* Tabel Tenant */}
      <section className="catalog-panel">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-700" />
            <h4>Daftar Toko & Metrik Penggunaan</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                aria-label="Cari nama atau slug tenant"
                className="search-input pl-9"
                placeholder="Cari toko / slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter status tenant"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="SUSPENDED">Ditangguhkan</option>
            </select>
          </div>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Nama Toko / Slug</th>
                <th>Status</th>
                <th>Pengguna</th>
                <th>Produk</th>
                <th>Customer</th>
                <th>Trx (30h)</th>
                <th>Omzet (30h)</th>
                <th>Est. DB</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const isSelf = t.id === session.user.tenant.id;
                const isSuspended = t.status === "SUSPENDED";

                return (
                  <tr key={t.id}>
                    <td>
                      <strong className="text-slate-900 block">{t.name}</strong>
                      <small className="text-slate-500 font-mono">
                        /{t.slug} {isSelf ? "(Toko Anda)" : ""}
                      </small>
                    </td>
                    <td>
                      <span className={isSuspended ? "status-inactive bg-red-50 text-red-700" : "status-active"}>
                        {isSuspended ? "Ditangguhkan" : "Aktif"}
                      </span>
                      {isSuspended && t.suspendReason && (
                        <div className="text-[10px] text-red-600 mt-1 max-w-xs">{t.suspendReason}</div>
                      )}
                    </td>
                    <td>{t.usage.users}</td>
                    <td>{t.usage.products}</td>
                    <td>{t.usage.customers}</td>
                    <td className="font-semibold">{t.usage.transactions30d}</td>
                    <td className="font-bold text-slate-900">
                      Rp {t.usage.revenue30d.toLocaleString("id-ID")}
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-500">
                        {formatBytes(t.usage.estimatedDbBytes)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="row-action"
                          onClick={() => void openDetail(t.id)}
                          type="button"
                          title="Lihat Detail Tenant"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          Detail
                        </button>
                        {isSuspended ? (
                          <button
                            className="row-action text-emerald-700 hover:bg-emerald-50"
                            disabled={busy}
                            onClick={() => void toggleStatus(t, "ACTIVE")}
                            type="button"
                          >
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />
                            Aktifkan
                          </button>
                        ) : (
                          <button
                            className="row-action danger-action"
                            disabled={busy || isSelf}
                            onClick={() => setSuspendModalTenant(t)}
                            title={isSelf ? "Tidak dapat menangguhkan toko sendiri" : "Tangguhkan toko"}
                            type="button"
                          >
                            <Ban className="h-3 w-3 inline mr-1" />
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tenants.length && (
                <tr>
                  <td className="empty-table" colSpan={9}>
                    Tidak ada tenant yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Suspend Tenant */}
      {suspendModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border">
            <div className="flex items-center gap-2 text-red-700 font-bold text-base mb-2">
              <Ban className="h-5 w-5" />
              <h4>Tangguhkan Toko &quot;{suspendModalTenant.name}&quot;</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Toko yang ditangguhkan tidak akan dapat login atau melakukan transaksi penjualan. Semua sesi aktif kasir akan segera dicabut.
            </p>
            <label className="block mt-4 text-xs font-bold text-slate-800">
              Alasan Penangguhan:
              <textarea
                required
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                placeholder="Contoh: Pelanggaran ketentuan operasional atau verifikasi dokumen..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="button button-secondary text-xs"
                disabled={busy}
                onClick={() => {
                  setSuspendModalTenant(null);
                  setSuspendReason("");
                }}
                type="button"
              >
                Batal
              </button>
              <button
                className="button button-primary bg-red-700 hover:bg-red-800 border-red-700 text-xs"
                disabled={busy || !suspendReason.trim()}
                onClick={() => void toggleStatus(suspendModalTenant, "SUSPENDED", suspendReason)}
                type="button"
              >
                {busy ? "Memproses…" : "Ya, Tangguhkan Toko"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Tenant */}
      {selectedTenant && (
        <section className="catalog-panel border-amber-200 bg-amber-50/10">
          <div className="section-title">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-700" />
              <h4>Detail Toko: {selectedTenant.name} ({selectedTenant.slug})</h4>
            </div>
            <button className="text-button text-xs" onClick={() => setSelectedTenant(null)} type="button">
              <X className="h-4 w-4 inline mr-1" />
              Tutup
            </button>
          </div>

          <div className="detail-grid">
            <span>
              Status: <strong>{selectedTenant.status}</strong>
            </span>
            <span>
              Dibuat: <strong>{new Date(selectedTenant.createdAt).toLocaleDateString("id-ID")}</strong>
            </span>
            {selectedTenant.suspendedAt && (
              <span>
                Waktu Suspend: <strong>{new Date(selectedTenant.suspendedAt).toLocaleString("id-ID")}</strong>
              </span>
            )}
            {selectedTenant.suspendReason && (
              <span>
                Alasan: <strong>{selectedTenant.suspendReason}</strong>
              </span>
            )}
          </div>

          <h5 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            Anggota & Peran ({selectedTenant.memberships.length})
          </h5>
          <div className="product-table-wrap bg-white">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Peran</th>
                  <th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {selectedTenant.memberships.map((m, i) => (
                  <tr key={i}>
                    <td className="font-bold text-slate-800">{m.user.name}</td>
                    <td>{m.user.email}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {m.role.code}
                      </span>
                    </td>
                    <td>{new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h5 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            Log Audit Terakhir ({selectedTenant.recentAudit.length})
          </h5>
          <div className="product-table-wrap bg-white">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Resource</th>
                </tr>
              </thead>
              <tbody>
                {selectedTenant.recentAudit.map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.createdAt).toLocaleString("id-ID")}</td>
                    <td>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                        {a.action}
                      </code>
                    </td>
                    <td>{a.resource}</td>
                  </tr>
                ))}
                {!selectedTenant.recentAudit.length && (
                  <tr>
                    <td className="empty-table" colSpan={3}>
                      Belum ada log audit untuk tenant ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
