"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Store,
  ExternalLink,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string; slug: string } } };
type Settings = {
  publicCatalogEnabled: boolean;
  whatsAppNumber: string | null;
  dailyReportEnabled: boolean;
  dailyReportHour: number;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function StorefrontPanel({ session }: { session: Session }) {
  const [enabled, setEnabled] = useState(false);
  const [number, setNumber] = useState("");
  const [dailyReportEnabled, setDailyReportEnabled] = useState(false);
  const [dailyReportHour, setDailyReportHour] = useState(8);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    "x-tenant-id": session.user.tenant.id,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    void fetch(`${apiUrl}/storefront/settings`, { headers })
      .then(async (response) => {
        const body = (await response.json()) as Settings & { message?: string };
        if (!response.ok) throw new Error(body.message ?? "Pengaturan katalog gagal dimuat.");
        setEnabled(body.publicCatalogEnabled);
        setNumber(body.whatsAppNumber ?? "");
        setDailyReportEnabled(body.dailyReportEnabled);
        setDailyReportHour(body.dailyReportHour);
        setLoaded(true);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Pengaturan katalog gagal dimuat.")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${apiUrl}/storefront/settings`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          publicCatalogEnabled: enabled,
          whatsAppNumber: number || null,
          dailyReportEnabled,
          dailyReportHour,
        }),
      });
      const body = (await response.json()) as Settings & { message?: string | string[] };
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? "Pengaturan gagal disimpan.");
      }
      setEnabled(body.publicCatalogEnabled);
      setNumber(body.whatsAppNumber ?? "");
      setDailyReportEnabled(body.dailyReportEnabled);
      setDailyReportHour(body.dailyReportHour);
      setNotice("Pengaturan toko dan katalog publik berhasil tersimpan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pengaturan gagal disimpan.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">TOKO ONLINE & INTEGRASI</span>
          <h3>Katalog Publik & WhatsApp</h3>
          <p>Buka etalase digital untuk pelanggan dan hubungkan tombol order langsung ke WhatsApp kasir toko.</p>
        </div>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="feedback success" role="status">
          <CheckCircle2 className="h-4 w-4" />
          <span>{notice}</span>
        </div>
      )}

      {loaded && (
        <form onSubmit={save} className="space-y-6">
          {/* Card Katalog Publik */}
          <section className="catalog-panel border-emerald-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-700" />
                  Katalog Publik Toko
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pengunjung dapat melihat daftar produk halal, ketersediaan stok, harga retail/member, dan mengirimkan pesan pesanan ke WhatsApp Anda.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {enabled && (
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-medium">Alamat URL Katalog Anda:</span>
                <a
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition"
                  href={`/katalog/${encodeURIComponent(session.user.tenant.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>/katalog/{session.user.tenant.slug}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </section>

          {/* Card WhatsApp */}
          <section className="catalog-panel">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-emerald-700" />
              Nomor WhatsApp Penerima Pesanan
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Nomor yang akan menerima template draft pesanan dari pengunjung katalog publik.
            </p>

            <label className="block text-xs font-bold text-slate-700">
              Nomor WhatsApp Toko
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                inputMode="tel"
                value={number}
                onChange={(event) => setNumber(event.target.value.replace(/[^0-9+]/g, ""))}
                placeholder="Contoh: 6281234567890"
              />
              <span className="mt-1.5 block text-[11px] text-slate-500 font-normal">
                Gunakan kode negara (contoh 62812… tanpa spasi atau tanda kurung).
              </span>
            </label>
          </section>

          {/* Card Email Laporan Harian */}
          <section className="catalog-panel">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-emerald-700" />
              Email Laporan Penjualan Harian
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Kirimkan ringkasan omzet dan transaksi harian secara otomatis ke alamat email pemilik toko.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-3 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  checked={dailyReportEnabled}
                  onChange={(event) => setDailyReportEnabled(event.target.checked)}
                />
                <span>Aktifkan pengiriman email rekap harian otomatis</span>
              </label>

              <label className="flex items-center gap-3 text-xs font-semibold text-slate-800">
                <span>Jam Pengiriman Laporan (WIB):</span>
                <input
                  className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-center"
                  type="number"
                  min={0}
                  max={23}
                  value={dailyReportHour}
                  onChange={(event) => setDailyReportHour(Number(event.target.value))}
                />
                <span className="text-slate-500 font-normal">WIB</span>
              </label>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border">
                Catatan: Memerlukan konfigurasi SMTP pada server. Laporan harian hanya dikirimkan kepada akun dengan peran Owner.
              </p>
            </div>
          </section>

          <button className="button button-primary px-6" type="submit">
            <Save className="h-4 w-4 inline mr-1" />
            Simpan Pengaturan
          </button>
        </form>
      )}
    </div>
  );
}
