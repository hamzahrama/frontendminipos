"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Package,
  Coins,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string } } };
type Report = {
  totalRevenue: number;
  transactionCount: number;
  averageBasketSize: number;
  averageTransactionValue: number;
  hourly: Array<{ hour: number; label: string; transactions: number; revenue: number }>;
  categories: Array<{ categoryId: string | null; category: string; quantity: number; revenue: number }>;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const money = (value: number) => `Rp ${value.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const todayJakarta = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export default function ReportsPanel({ session }: { session: Session }) {
  const today = todayJakarta();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    const query = new URLSearchParams({ from, to });
    const response = await fetch(`${API_URL}/reports/summary?${query}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "x-tenant-id": session.user.tenant.id,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "Laporan tidak dapat dimuat.");
    return result as Report;
  }, [from, to, session.accessToken, session.user.tenant.id]);

  // Dipakai tombol "Terapkan Filter"
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await fetchReport());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Laporan tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchReport]);

  // Muat otomatis saat tanggal berubah; state hanya diubah setelah data datang
  useEffect(() => {
    let cancelled = false;
    fetchReport()
      .then((result) => {
        if (cancelled) return;
        setReport(result);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Laporan tidak dapat dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchReport]);

  return (
    <div className="reports-panel space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">ANALITIK TOKO</span>
          <h3>Laporan & Ringkasan Penjualan</h3>
          <p>Statistik transaksi, omzet harian, dan performa per jam mengikuti zona waktu Jakarta (WIB).</p>
        </div>
      </div>

      {/* Filter Tanggal */}
      <section className="catalog-panel">
        <form
          className="report-filter flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <label>
            Dari Tanggal
            <input
              required
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            Sampai Tanggal
            <input
              required
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button className="button button-primary" disabled={loading} type="submit">
            {loading ? "Memuat…" : "Terapkan Filter"}
          </button>
        </form>
      </section>

      {error && (
        <div className="feedback error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <>
          {/* KPI Cards */}
          <section className="report-kpis">
            <article>
              <div className="flex items-center justify-between">
                <span>Omzet Bersih</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <strong className="text-xl sm:text-2xl text-emerald-700">{money(report.totalRevenue)}</strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Total Transaksi</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <strong className="text-xl sm:text-2xl text-slate-800">
                {report.transactionCount.toLocaleString("id-ID")} kali
              </strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Rata-rata Item</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <strong className="text-xl sm:text-2xl text-slate-800">
                {report.averageBasketSize.toLocaleString("id-ID")} item
              </strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Rata-rata / Transaksi</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <strong className="text-xl sm:text-2xl text-emerald-700">
                {money(report.averageTransactionValue)}
              </strong>
            </article>
          </section>

          {/* Chart Penjualan per Jam */}
          <section className="catalog-panel report-chart">
            <div className="section-title">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-700" />
                  <h4>Penjualan per Jam (WIB)</h4>
                </div>
                <span className="field-hint">Pola omzet rupiah dan volume transaksi sepanjang jam operasional</span>
              </div>
            </div>
            <div className="chart-area mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" interval={2} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(value, name) => (name === "Omzet" ? money(Number(value)) : `${value} trx`)}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar yAxisId="left" dataKey="revenue" name="Omzet" fill="#15803d" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="transactions" name="Transaksi" fill="#86efac" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Penjualan per Kategori */}
          <section className="catalog-panel">
            <div className="section-title">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-700" />
                <h4>Performa Penjualan per Kategori</h4>
              </div>
            </div>
            <div className="product-table-wrap">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Kategori Produk</th>
                    <th>Jumlah Item Terjual</th>
                    <th>Total Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((category) => (
                    <tr key={category.categoryId ?? "uncategorized"}>
                      <td className="font-semibold text-slate-800">{category.category}</td>
                      <td>{category.quantity.toLocaleString("id-ID")} unit</td>
                      <td className="font-bold text-emerald-700">{money(category.revenue)}</td>
                    </tr>
                  ))}
                  {!report.categories.length && (
                    <tr>
                      <td className="empty-table" colSpan={3}>
                        Belum ada transaksi pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
