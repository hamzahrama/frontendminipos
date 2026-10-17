"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  DollarSign,
  Plus,
} from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string } } };
type Pnl = {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpense: number;
  netProfit: number;
  missingCostMovementCount: number;
  expenseCategories: Array<{ category: string; amount: number }>;
};
type Expense = { id: string; date: string; category: string; description: string | null; amount: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const money = (amount: number) => `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

export default function ProfitLossPanel({ session }: { session: Session }) {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<Pnl | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expense, setExpense] = useState({ date: today(), category: "Operasional", description: "", amount: "" });
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Permintaan laporan gagal.");
      return result;
    },
    [session.accessToken, session.user.tenant.id]
  );

  const fetchData = useCallback(async () => {
    const query = new URLSearchParams({ from, to });
    const [pnl, expenseRows] = await Promise.all([
      api(`/reports/profit-loss?${query}`),
      api(`/expenses?${query}`),
    ]);
    return { pnl: pnl as Pnl, expenseRows: expenseRows as Expense[] };
  }, [api, from, to]);

  // Dipakai tombol dan aksi lain (tetap menampilkan indikator busy)
  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const { pnl, expenseRows } = await fetchData();
      setReport(pnl);
      setExpenses(expenseRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Laporan gagal dimuat.");
    } finally {
      setBusy(false);
    }
  }, [fetchData]);

  // Muat otomatis saat tanggal berubah; state hanya diubah setelah data datang
  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then(({ pnl, expenseRows }) => {
        if (cancelled) return;
        setReport(pnl);
        setExpenses(expenseRows);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Laporan gagal dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify({ ...expense, amount: Number(expense.amount) }),
      });
      setExpense((current) => ({ ...current, description: "", amount: "" }));
      await load();
      setMessage("Pengeluaran operasional berhasil dicatat.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pengeluaran gagal disimpan.");
    }
  }

  async function removeExpense(item: Expense) {
    if (!window.confirm(`Hapus pengeluaran ${item.category} sebesar ${money(Number(item.amount))}?`)) return;
    try {
      await api(`/expenses/${item.id}`, { method: "DELETE" });
      await load();
      setMessage("Pengeluaran berhasil dihapus.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pengeluaran gagal dihapus.");
    }
  }

  function exportExcel() {
    if (!report) return;
    const rows = [
      ["Laporan", "Nilai"],
      ["Periode", `${from} - ${to}`],
      ["Omzet", report.revenue],
      ["HPP", report.costOfGoods],
      ["Laba kotor", report.grossProfit],
      ["Pengeluaran operasional", report.operatingExpense],
      ["Laba bersih", report.netProfit],
      ["Pergerakan stok tanpa HPP", report.missingCostMovementCount],
      ["Kategori pengeluaran", "Jumlah"],
      ...report.expenseCategories.map((row) => [row.category, row.amount]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Laba Rugi");
    XLSX.writeFile(workbook, `laba-rugi-${from}-${to}.xlsx`);
  }

  return (
    <div className="profit-loss-panel space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">LAPORAN KEUANGAN</span>
          <h3>Laba Rugi Toko (P&L)</h3>
          <p>HPP dihitung akurat dari harga pokok batch yang keluar pada setiap transaksi POS.</p>
        </div>
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

      {/* Filter and Action Bar */}
      <section className="catalog-panel pnl-screen-only">
        <form
          className="report-filter flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <label>
            Dari Tanggal
            <input type="date" required value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            Sampai Tanggal
            <input type="date" required value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button className="button button-primary" disabled={busy} type="submit">
            Perbarui
          </button>
          {report && (
            <>
              <button className="button button-secondary" onClick={exportExcel} type="button">
                <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                Unduh Excel (.xlsx)
              </button>
              <button className="button button-secondary" onClick={() => window.print()} type="button">
                <Printer className="h-4 w-4 inline mr-1" />
                Cetak / PDF
              </button>
            </>
          )}
        </form>
      </section>

      {/* Ringkasan Laba Rugi */}
      {report && (
        <section id="pnl-printable" className="space-y-6">
          <div className="catalog-panel">
            <div className="section-title">
              <h4>Ringkasan Finansial: {from} sampai {to}</h4>
            </div>

            <div className="report-kpis grid grid-cols-2 md:grid-cols-5 gap-3">
              <article>
                <span>Total Omzet</span>
                <strong className="text-slate-900">{money(report.revenue)}</strong>
              </article>
              <article>
                <span>HPP Batch</span>
                <strong className="text-slate-700">{money(report.costOfGoods)}</strong>
              </article>
              <article>
                <span>Laba Kotor</span>
                <strong className="text-emerald-700">{money(report.grossProfit)}</strong>
              </article>
              <article>
                <span>Biaya Operasional</span>
                <strong className="text-red-700">{money(report.operatingExpense)}</strong>
              </article>
              <article className="border-emerald-300 bg-emerald-50/50">
                <span className="text-emerald-800 font-bold">Laba Bersih</span>
                <strong className={`text-xl ${report.netProfit >= 0 ? "text-emerald-800" : "text-red-700"}`}>
                  {money(report.netProfit)}
                </strong>
              </article>
            </div>

            {report.missingCostMovementCount > 0 && (
              <p className="feedback error mt-4">
                <AlertTriangle className="h-4 w-4 mr-1 inline" />
                Ada {report.missingCostMovementCount} pergerakan stok keluar tanpa harga pokok batch; HPP dan laba bisa lebih rendah dari nilai sebenarnya.
              </p>
            )}
          </div>

          <div className="catalog-panel">
            <h4 className="mb-3 font-bold text-slate-800">Rincian Pengeluaran per Kategori</h4>
            <div className="product-table-wrap">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Kategori Pengeluaran</th>
                    <th>Nominal Pengeluaran</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseCategories.map((row) => (
                    <tr key={row.category}>
                      <td className="font-semibold text-slate-800">{row.category}</td>
                      <td className="font-bold text-slate-900">{money(row.amount)}</td>
                    </tr>
                  ))}
                  {!report.expenseCategories.length && (
                    <tr>
                      <td className="empty-table" colSpan={2}>
                        Belum ada pengeluaran operasional tercatat pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Form Catat Pengeluaran Operasional */}
      <section className="catalog-panel pnl-screen-only border-slate-200">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Plus className="h-4 w-4 text-emerald-700" />
          <h4>Catat Pengeluaran Operasional Baru</h4>
        </div>

        <form className="customer-form" onSubmit={createExpense}>
          <label>
            Tanggal
            <input
              required
              type="date"
              value={expense.date}
              onChange={(event) => setExpense({ ...expense, date: event.target.value })}
            />
          </label>
          <label>
            Kategori
            <input
              required
              maxLength={80}
              placeholder="Contoh: Listrik, Sewa, Gaji"
              value={expense.category}
              onChange={(event) => setExpense({ ...expense, category: event.target.value })}
            />
          </label>
          <label>
            Nominal (Rp)
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              placeholder="Nominal rupiah"
              value={expense.amount}
              onChange={(event) => setExpense({ ...expense, amount: event.target.value })}
            />
          </label>
          <label className="wide-field md:col-span-2">
            Catatan / Deskripsi
            <input
              maxLength={500}
              placeholder="Keterangan pengeluaran..."
              value={expense.description}
              onChange={(event) => setExpense({ ...expense, description: event.target.value })}
            />
          </label>
          <div className="form-actions md:col-span-3">
            <button className="button button-primary" type="submit">
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </section>

      {/* Tabel Daftar Pengeluaran */}
      <section className="catalog-panel pnl-screen-only">
        <h4 className="mb-3 font-bold text-slate-800">Daftar Pengeluaran ({expenses.length})</h4>
        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Catatan</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td>{item.date.slice(0, 10)}</td>
                  <td>
                    <span className="font-semibold text-slate-800">{item.category}</span>
                  </td>
                  <td>{item.description ?? "—"}</td>
                  <td className="font-bold text-slate-900">{money(Number(item.amount))}</td>
                  <td>
                    <button
                      className="row-action danger-action"
                      onClick={() => void removeExpense(item)}
                      type="button"
                      title="Hapus pengeluaran"
                    >
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {!expenses.length && (
                <tr>
                  <td className="empty-table" colSpan={5}>
                    Tidak ada pengeluaran untuk rentang tanggal ini.
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
