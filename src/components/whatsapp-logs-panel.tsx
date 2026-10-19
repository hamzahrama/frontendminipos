"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Clock,
  Radio,
} from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string } } };
type Log = {
  id: string;
  phone: string;
  template: string;
  provider: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  error: string | null;
  durationMs: number | null;
  createdAt: string;
  transaction: { invoiceNo: string } | null;
};
type Status = { provider: string; enabled: boolean; template: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const statusLabel = { SENT: "Terkirim", FAILED: "Gagal", SKIPPED: "Gateway Nonaktif" } as const;

export default function WhatsAppLogsPanel({ session }: { session: Session }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.user.tenant.id,
    };
    const [logResponse, statusResponse] = await Promise.all([
      fetch(`${API_URL}/whatsapp/logs?limit=100`, { headers }),
      fetch(`${API_URL}/whatsapp/status`, { headers }),
    ]);
    const [logBody, statusBody] = await Promise.all([logResponse.json(), statusResponse.json()]);
    if (!logResponse.ok) throw new Error(logBody.message ?? "Log WhatsApp gagal dimuat.");
    return {
      logs: logBody as Log[],
      status: statusResponse.ok ? (statusBody as Status) : null,
    };
  }, [session.accessToken, session.user.tenant.id]);

  // Dipakai tombol "Muat ulang"
  const load = useCallback(async () => {
    setError("");
    const data = await fetchLogs();
    setLogs(data.logs);
    if (data.status) setStatus(data.status);
  }, [fetchLogs]);

  // Muat otomatis saat panel dibuka; state hanya diubah setelah data datang
  useEffect(() => {
    let cancelled = false;
    fetchLogs()
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs);
        if (data.status) setStatus(data.status);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Log WhatsApp gagal dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLogs]);

  return (
    <div className="customers-panel space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">NOTIFIKASI NOTA DIGITAL</span>
          <h3>Log Pengiriman WhatsApp</h3>
          <p>Riwayat struk transaksi yang dikirim kasir melalui gateway integrasi WhatsApp.</p>
        </div>
        <span
          className={`product-count ${
            status?.enabled
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {status ? (status.enabled ? `Gateway Aktif: ${status.provider}` : "Gateway Belum Dikonfigurasi") : "Memeriksa status…"}
        </span>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {status && !status.enabled && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 leading-relaxed">
          <strong>Perhatian:</strong> Gateway WhatsApp belum aktif di server ini. Atur variabel lingkungan{" "}
          <code>WHATSAPP_PROVIDER</code> (fonnte/wablas) dan <code>WHATSAPP_TOKEN</code> pada backend server agar kasir dapat mengirim struk digital otomatis.
        </div>
      )}

      <section className="catalog-panel">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-700" />
            <h4>100 Pengiriman Struk Terakhir</h4>
          </div>
          <button
            className="button button-secondary text-xs"
            onClick={() => void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Log WhatsApp gagal dimuat."))}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
            Muat Ulang
          </button>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Waktu Pengiriman</th>
                <th>Nomor Invoice</th>
                <th>No. Penerima</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Durasi</th>
                <th>Keterangan / Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString("id-ID")}</td>
                  <td>
                    <span className="font-mono font-bold text-slate-800">
                      {log.transaction?.invoiceNo ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-slate-700">{log.phone}</span>
                  </td>
                  <td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                      {log.provider}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        log.status === "SENT"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : log.status === "FAILED"
                          ? "bg-red-50 text-red-800 border border-red-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {statusLabel[log.status] ?? log.status}
                    </span>
                  </td>
                  <td>{log.durationMs !== null ? `${(log.durationMs / 1000).toFixed(1)} dtk` : "—"}</td>
                  <td>
                    {log.error ? (
                      <span className="text-red-700 text-xs font-medium">{log.error}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td className="empty-table" colSpan={7}>
                    Belum ada riwayat pengiriman struk WhatsApp yang tercatat.
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
