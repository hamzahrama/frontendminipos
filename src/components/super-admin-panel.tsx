"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
    <div className="super-admin-panel">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">SUPER ADMIN</span>
          <h3>Kelola Platform & Multi-Tenant</h3>
          <p>Pantau metrik seluruh toko, transaksi 30 hari, serta kelola status aktif/suspend tenant.</p>
        </div>
        <span className="product-count">{tenants.length} Toko Terdaftar</span>
      </div>

      {error && <p className="feedback error" role="alert">{error}</p>}
      {message && <p className="feedback success" role="status">{message}</p>}

      {summary && (
        <section className="catalog-panel">
          <div className="section-title">
            <h4>Metrik Platform Global</h4>
            <button className="button button-secondary" onClick={() => void loadData()} type="button">
              Muat Ulang
            </button>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Toko</span>
              <strong className="kpi-value">{summary.tenants}</strong>
              <small className="field-hint">{summary.activeTenants} aktif · {summary.suspendedTenants} suspended</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Pengguna Terdaftar</span>
              <strong className="kpi-value">{summary.users}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Transaksi (30 Hari)</span>
              <strong className="kpi-value">{summary.transactions30d.toLocaleString("id-ID")}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Omzet Global (30 Hari)</span>
              <strong className="kpi-value">Rp {summary.revenue30d.toLocaleString("id-ID")}</strong>
            </div>
          </div>
        </section>
      )}

      <section className="catalog-panel">
        <div className="section-title">
          <h4>Daftar Toko & Metrik Penggunaan</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              aria-label="Cari nama atau slug tenant"
              className="search-input"
              placeholder="Cari toko / slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter status tenant"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--line)" }}
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
                <th>Transaksi (30h)</th>
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
                      <strong>{t.name}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>/{t.slug} {isSelf ? "(Toko Anda)" : ""}</small>
                    </td>
                    <td>
                      <span className={isSuspended ? "status-inactive" : "status-active"}>
                        {isSuspended ? "Ditangguhkan" : "Aktif"}
                      </span>
                      {isSuspended && t.suspendReason && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          {t.suspendReason}
                        </div>
                      )}
                    </td>
                    <td>{t.usage.users}</td>
                    <td>{t.usage.products}</td>
                    <td>{t.usage.customers}</td>
                    <td>{t.usage.transactions30d}</td>
                    <td>Rp {t.usage.revenue30d.toLocaleString("id-ID")}</td>
                    <td>{formatBytes(t.usage.estimatedDbBytes)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="row-action"
                          onClick={() => void openDetail(t.id)}
                          type="button"
                        >
                          Detail
                        </button>
                        {isSuspended ? (
                          <button
                            className="row-action"
                            disabled={busy}
                            onClick={() => void toggleStatus(t, "ACTIVE")}
                            type="button"
                          >
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
                    Tidak ada tenant yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {suspendModalTenant && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "16px",
              maxWidth: "480px",
              width: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h4>Tangguhkan Toko &quot;{suspendModalTenant.name}&quot;</h4>
            <p className="field-hint" style={{ marginTop: "8px" }}>
              Toko yang ditangguhkan tidak akan dapat login atau melakukan transaksi. Semua sesi aktif akan dicabut.
            </p>
            <label style={{ display: "block", marginTop: "16px" }}>
              Alasan Penangguhan:
              <textarea
                required
                rows={3}
                style={{ width: "100%", marginTop: "6px", padding: "8px" }}
                placeholder="Contoh: Terjadi pelanggaran ketentuan layanan atau tagihan tertunggak."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <button
                className="button button-secondary"
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
                className="button danger-action"
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

      {selectedTenant && (
        <section className="catalog-panel">
          <div className="section-title">
            <h4>Detail Toko: {selectedTenant.name} ({selectedTenant.slug})</h4>
            <button className="text-button" onClick={() => setSelectedTenant(null)} type="button">
              Tutup
            </button>
          </div>
          <div className="detail-grid">
            <span>Status: <strong>{selectedTenant.status}</strong></span>
            <span>Dibuat: <strong>{new Date(selectedTenant.createdAt).toLocaleDateString("id-ID")}</strong></span>
            {selectedTenant.suspendedAt && (
              <span>Waktu Suspend: <strong>{new Date(selectedTenant.suspendedAt).toLocaleString("id-ID")}</strong></span>
            )}
            {selectedTenant.suspendReason && (
              <span>Alasan: <strong>{selectedTenant.suspendReason}</strong></span>
            )}
          </div>

          <h5 style={{ marginTop: "20px", marginBottom: "8px" }}>Anggota & Peran ({selectedTenant.memberships.length})</h5>
          <div className="product-table-wrap">
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
                    <td>{m.user.name}</td>
                    <td>{m.user.email}</td>
                    <td><span className="category-chip">{m.role.code}</span></td>
                    <td>{new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h5 style={{ marginTop: "20px", marginBottom: "8px" }}>Log Audit Terakhir ({selectedTenant.recentAudit.length})</h5>
          <div className="product-table-wrap">
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
                    <td><code>{a.action}</code></td>
                    <td>{a.resource}</td>
                  </tr>
                ))}
                {!selectedTenant.recentAudit.length && (
                  <tr>
                    <td className="empty-table" colSpan={3}>Belum ada log audit untuk tenant ini.</td>
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
