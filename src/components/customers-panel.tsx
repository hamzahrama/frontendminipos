"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Users,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Phone,
  CreditCard,
  MapPin,
  GitFork,
  Receipt,
  X,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  hniProfile: { hniId: string; uplineHniId: string | null } | null;
};
type CustomerProfile = Customer & {
  totalPv: number;
  transactions: Array<{ id: string; invoiceNo: string; total: string; totalPv: string; createdAt: string }>;
};
type Session = { accessToken: string; user: { tenant: { id: string } } };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const empty = { name: "", phone: "", hniId: "", uplineHniId: "", address: "" };

export default function CustomersPanel({ session }: { session: Session }) {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "x-tenant-id": session.user.tenant.id,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? "Permintaan customer gagal.");
      }
      return body;
    },
    [session.accessToken, session.user.tenant.id]
  );

  const fetchRows = useCallback(
    async () =>
      (await api(`/customers${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`)) as Customer[],
    [api, search]
  );

  // Dipakai tombol cari, tombol Enter, dan setelah menyimpan pelanggan
  const load = useCallback(async () => {
    setRows(await fetchRows());
  }, [fetchRows]);

  // Muat otomatis saat pencarian berubah; state hanya diubah setelah data datang
  useEffect(() => {
    let cancelled = false;
    fetchRows()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Customer gagal dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRows]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (form.hniId && !/^[a-z0-9-]{4,32}$/i.test(form.hniId)) {
      setError("ID HNI harus berisi 4–32 karakter alfanumerik atau tanda hubung.");
      setBusy(false);
      return;
    }
    try {
      await api(editing ? `/customers/${editing}` : "/customers", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          hniId: form.hniId || null,
          uplineHniId: form.uplineHniId || null,
          address: form.address || null,
        }),
      });
      await load();
      setForm(empty);
      setEditing(null);
      setMessage(editing ? "Data customer berhasil diperbarui." : "Customer baru berhasil ditambahkan.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Customer gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  function edit(customer: Customer) {
    setEditing(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      hniId: customer.hniProfile?.hniId ?? "",
      uplineHniId: customer.hniProfile?.uplineHniId ?? "",
      address: customer.address ?? "",
    });
    setProfile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function showProfile(id: string) {
    setError("");
    try {
      setProfile((await api(`/customers/${id}`)) as CustomerProfile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profil customer gagal dimuat.");
    }
  }

  async function remove(customer: Customer) {
    if (
      !window.confirm(
        `Hapus data customer ${customer.name}? Data transaksi historis tetap disimpan tanpa tautan customer.`
      )
    )
      return;
    setError("");
    setMessage("");
    try {
      await api(`/customers/${customer.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== customer.id));
      if (profile?.id === customer.id) setProfile(null);
      setMessage("Data customer berhasil dihapus.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Customer gagal dihapus.");
    }
  }

  return (
    <div className="customers-panel space-y-6">
      {/* Header Info */}
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">CRM & ANGGOTA</span>
          <h3>Pelanggan & Member HNI</h3>
          <p>Kelola profil pembeli, identitas ID HNI, upline jaringan, dan riwayat transaksi PV.</p>
        </div>
        <span className="product-count">
          <Users className="h-3.5 w-3.5" />
          {rows.length} Terdaftar
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

      {/* Form Tambah / Ubah Customer */}
      <section className="catalog-panel border-emerald-200">
        <div className="flex items-center justify-between pb-3 border-b mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-700" />
            <h4>{editing ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}</h4>
          </div>
          {editing && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
              Sedang mengedit
            </span>
          )}
        </div>

        <form className="customer-form" onSubmit={save}>
          <label>
            Nama lengkap
            <input
              required
              maxLength={120}
              placeholder="Contoh: Siti Aisyah"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            No. WhatsApp
            <input
              maxLength={32}
              placeholder="081234567890"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <label>
            ID Member HNI (Opsional)
            <input
              maxLength={32}
              placeholder="Contoh: 01234567"
              value={form.hniId}
              onChange={(event) => setForm({ ...form, hniId: event.target.value })}
            />
            <small className="text-[10px] text-slate-500">4–32 huruf, angka, atau tanda hubung.</small>
          </label>
          <label>
            ID Upline (Opsional)
            <input
              maxLength={32}
              placeholder="ID HNI Upline langsung"
              value={form.uplineHniId}
              onChange={(event) => setForm({ ...form, uplineHniId: event.target.value })}
            />
          </label>
          <label className="wide-field md:col-span-2">
            Alamat lengkap
            <input
              maxLength={500}
              placeholder="Jalan, kelurahan, kecamatan, kota..."
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </label>
          <div className="form-actions md:col-span-3">
            <button className="button button-primary" disabled={busy} type="submit">
              {busy ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Customer"}
            </button>
            {editing && (
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                }}
                type="button"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Tabel Daftar Pelanggan */}
      <section className="catalog-panel">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" />
            <h4>Daftar Pelanggan</h4>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="search-input pl-9"
                placeholder="Cari nama, telepon, atau ID HNI..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load().catch((caught) => setError(caught.message));
                }}
              />
            </div>
            <button
              className="button button-secondary text-xs"
              onClick={() => void load().catch((caught) => setError(caught.message))}
              type="button"
            >
              Cari
            </button>
          </div>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Nama Pelanggan</th>
                <th>Nomor WhatsApp</th>
                <th>Status HNI</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                        {customer.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-bold">{customer.name}</strong>
                        {customer.address && (
                          <small className="text-slate-400 truncate max-w-[200px] block">{customer.address}</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {customer.phone ? (
                      <span className="font-mono text-xs text-slate-700">{customer.phone}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    {customer.hniProfile?.hniId ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CreditCard className="h-3 w-3" />
                        HNI: {customer.hniProfile.hniId}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 font-medium">
                        Non-member
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="row-action"
                        onClick={() => void showProfile(customer.id)}
                        type="button"
                        title="Lihat Profil & Transaksi"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        Profil
                      </button>
                      <button
                        className="row-action"
                        onClick={() => edit(customer)}
                        type="button"
                        title="Ubah data"
                      >
                        <Edit3 className="h-3 w-3 inline mr-1" />
                        Ubah
                      </button>
                      <button
                        className="row-action danger-action"
                        onClick={() => void remove(customer)}
                        type="button"
                        title="Hapus customer"
                      >
                        <Trash2 className="h-3 w-3 inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="empty-table" colSpan={4}>
                    Customer belum tersedia atau tidak cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Profil Customer & Transaksi Terakhir */}
      {profile && (
        <section className="catalog-panel customer-profile border-emerald-200 bg-emerald-50/20">
          <div className="section-title">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-700" />
              <h4 className="text-emerald-950 font-bold">Profil & Histori: {profile.name}</h4>
            </div>
            <button className="text-button" onClick={() => setProfile(null)} type="button">
              <X className="h-4 w-4 inline mr-1" />
              Tutup Profil
            </button>
          </div>

          <div className="detail-grid">
            <span>
              ID HNI
              <strong>{profile.hniProfile?.hniId ?? "Non-member"}</strong>
            </span>
            <span>
              Total PV Terkumpul
              <strong className="text-emerald-700 font-bold text-base">
                {profile.totalPv.toLocaleString("id-ID")} PV
              </strong>
            </span>
            <span>
              Nomor Telepon
              <strong>{profile.phone ?? "—"}</strong>
            </span>
            <span>
              Alamat
              <strong>{profile.address ?? "—"}</strong>
            </span>
          </div>

          <h4 className="mt-5 mb-2 text-sm font-bold text-slate-800">Riwayat Transaksi Penjualan</h4>
          <div className="product-table-wrap bg-white">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Tanggal Transaksi</th>
                  <th>Total Belanja</th>
                  <th>PV Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {profile.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="font-mono font-bold text-slate-800">{transaction.invoiceNo}</td>
                    <td>{new Date(transaction.createdAt).toLocaleString("id-ID")}</td>
                    <td className="font-semibold text-slate-900">
                      Rp {Number(transaction.total).toLocaleString("id-ID")}
                    </td>
                    <td className="font-bold text-emerald-700">
                      {Number(transaction.totalPv).toLocaleString("id-ID")} PV
                    </td>
                  </tr>
                ))}
                {!profile.transactions.length && (
                  <tr>
                    <td className="empty-table" colSpan={4}>
                      Belum ada transaksi historis untuk customer ini.
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
