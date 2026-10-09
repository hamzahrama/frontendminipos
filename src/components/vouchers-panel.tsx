"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Ticket, Plus, AlertTriangle, CheckCircle2, Trash2, Calendar, Percent, Coins, Ban } from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string } } };
type Voucher = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  maxDiscount: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  endsAt: string | null;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function VouchersPanel({ session }: { session: Session }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED",
    value: "",
    minSubtotal: "0",
    maxDiscount: "",
    maxUses: "",
    endsAt: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Permintaan voucher gagal.");
      return result;
    },
    [session.accessToken, session.user.tenant.id]
  );

  const load = useCallback(async () => setVouchers((await api("/vouchers")) as Voucher[]), [api]);

  useEffect(() => {
    void load().catch((caught) =>
      setError(caught instanceof Error ? caught.message : "Voucher gagal dimuat.")
    );
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          value: Number(form.value),
          minSubtotal: Number(form.minSubtotal || 0),
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59+07:00`).toISOString() : undefined,
        }),
      });
      setForm({ code: "", discountType: "PERCENT", value: "", minSubtotal: "0", maxDiscount: "", maxUses: "", endsAt: "" });
      await load();
      setMessage("Voucher promo berhasil dibuat.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voucher gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string, code: string) {
    if (!window.confirm(`Nonaktifkan voucher ${code}?`)) return;
    setError("");
    try {
      await api(`/vouchers/${id}`, { method: "DELETE" });
      await load();
      setMessage(`Voucher ${code} berhasil dinonaktifkan.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voucher gagal dinonaktifkan.");
    }
  }

  return (
    <div className="customers-panel space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">PROMOSI & DISKON</span>
          <h3>Voucher Promo Toko</h3>
          <p>Buat kode voucher diskon persentase atau nominal rupiah untuk transaksi kasir POS.</p>
        </div>
        <span className="product-count">
          <Ticket className="h-3.5 w-3.5" />
          {vouchers.filter((voucher) => voucher.isActive).length} Voucher Aktif
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

      {/* Form Buat Voucher */}
      <section className="catalog-panel border-emerald-200">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Plus className="h-4 w-4 text-emerald-700" />
          <h4>Buat Voucher Baru</h4>
        </div>

        <form className="customer-form" onSubmit={create}>
          <label>
            Kode Voucher
            <input
              required
              pattern="[A-Za-z0-9_-]{3,32}"
              maxLength={32}
              placeholder="Contoh: BERKAH10"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Jenis Diskon
            <select
              value={form.discountType}
              onChange={(event) =>
                setForm({ ...form, discountType: event.target.value as "PERCENT" | "FIXED" })
              }
            >
              <option value="PERCENT">Persentase (%)</option>
              <option value="FIXED">Potongan Tetap (Rp)</option>
            </select>
          </label>
          <label>
            Nilai Diskon
            <input
              required
              min="0.01"
              step="0.01"
              max={form.discountType === "PERCENT" ? 100 : undefined}
              type="number"
              placeholder={form.discountType === "PERCENT" ? "Contoh: 10" : "Contoh: 15000"}
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
            />
          </label>
          <label>
            Minimum Belanja (Rp)
            <input
              min="0"
              step="100"
              type="number"
              placeholder="0 jika tanpa batas"
              value={form.minSubtotal}
              onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
            />
          </label>
          <label>
            Batas Maksimal Diskon (Opsional)
            <input
              min="0"
              step="100"
              type="number"
              placeholder="Maksimal potongan rupiah"
              value={form.maxDiscount}
              onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
            />
          </label>
          <label>
            Kuota Penggunaan (Opsional)
            <input
              min="1"
              step="1"
              type="number"
              placeholder="Batas kali pakai"
              value={form.maxUses}
              onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
            />
          </label>
          <label>
            Berlaku Sampai (Opsional)
            <input
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            />
          </label>
          <div className="form-actions md:col-span-3">
            <button className="button button-primary" disabled={busy} type="submit">
              {busy ? "Menyimpan…" : "Buat Voucher"}
            </button>
          </div>
        </form>
      </section>

      {/* Tabel Voucher */}
      <section className="catalog-panel">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-emerald-700" />
            <h4>Daftar Voucher Toko</h4>
          </div>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Kode Voucher</th>
                <th>Nilai Diskon</th>
                <th>Min. Belanja</th>
                <th>Pemakaian</th>
                <th>Masa Berlaku</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-2.5 py-1 font-mono font-bold text-emerald-900 text-xs">
                      <Ticket className="h-3 w-3 text-emerald-700" />
                      {voucher.code}
                    </span>
                  </td>
                  <td>
                    <span className="font-bold text-slate-800">
                      {voucher.discountType === "PERCENT"
                        ? `${Number(voucher.value)}%`
                        : `Rp ${Number(voucher.value).toLocaleString("id-ID")}`}
                    </span>
                    {voucher.maxDiscount && (
                      <small className="block text-slate-400">
                        Maks. Rp {Number(voucher.maxDiscount).toLocaleString("id-ID")}
                      </small>
                    )}
                  </td>
                  <td>Rp {Number(voucher.minSubtotal).toLocaleString("id-ID")}</td>
                  <td>
                    <span className="font-semibold text-slate-700">
                      {voucher.usedCount}
                      {voucher.maxUses ? ` / ${voucher.maxUses} kali` : " kali"}
                    </span>
                  </td>
                  <td>
                    {voucher.endsAt ? (
                      <span className="text-xs text-slate-600">
                        {new Date(voucher.endsAt).toLocaleDateString("id-ID")}
                      </span>
                    ) : (
                      <span className="text-slate-400">Tanpa batas</span>
                    )}
                  </td>
                  <td>
                    <span className={voucher.isActive ? "status-active" : "status-inactive"}>
                      {voucher.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    {voucher.isActive ? (
                      <button
                        className="row-action danger-action"
                        onClick={() => void deactivate(voucher.id, voucher.code)}
                        type="button"
                        title="Nonaktifkan voucher"
                      >
                        <Ban className="h-3 w-3 inline mr-1" />
                        Nonaktifkan
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!vouchers.length && (
                <tr>
                  <td className="empty-table" colSpan={7}>
                    Voucher belum tersedia. Silakan buat voucher di form atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
