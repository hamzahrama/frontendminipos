"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Coins, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { PLANS, Plan } from "@/lib/plans";

type BillingStatus = {
  planCode: string;
  plan: Plan;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  lastPaymentAt: string | null;
};

type Session = {
  accessToken: string;
  user: {
    email: string;
    tenant: { id: string; name: string; slug: string };
  };
};

export default function BillingPanel({ session, apiUrl }: { session: Session; apiUrl: string }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/billing/status`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok) throw new Error("Gagal memuat status");
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        setError(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, [session.accessToken, apiUrl]);

  const handleUpgrade = async (planCode: string) => {
    if (status?.planCode === planCode) return;
    setCharging(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/billing/charge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planCode, email: session.user.email }),
      });
      if (!res.ok) throw new Error("Charge gagal");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setCharging(false);
        return;
      }

      // Midtrans Snap client key (ganti dengan key asli)
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "Set-MIDTRANS-Client-Key";
      if (data.token && typeof window !== "undefined" && (window as any).snap) {
        (window as any).snap.pay(data.token, {
          onSuccess: () => {
            alert("Pembayaran berhasil!");
            setTimeout(() => window.location.reload(), 1000);
          },
          onPending: () => alert("Pembayaran sedang diproses..."),
          onError: () => {
            setError("Pembayaran dibatalkan");
            setCharging(false);
          },
          onClose: () => setCharging(false),
        });
      } else {
        // Fallback: redirect ke Midtrans (untuk demo)
        if (data.redirectUrl) window.open(data.redirectUrl, "_blank");
        setCharging(false);
      }
    } catch (e) {
      setError(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
      setCharging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat status langganan...</span>
        </div>
      </div>
    );
  }

  const currentPlan = status?.plan || PLANS.FREE;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Langganan & Billing</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold">Paket saat ini:</span>
            <span className="text-2xl font-bold text-blue-600">{currentPlan.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            {status?.nextBillingDate && (
              <p>
                Perpanjangan:
                {new Date(status.nextBillingDate).toLocaleDateString("id-ID")}
              </p>
            )}
            {status?.lastPaymentAt && (
              <p>
                Pembayaran terakhir:
                {new Date(status.lastPaymentAt).toLocaleDateString("id-ID")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([code, plan]) => (
          <div
            key={plan.code}
            className={`border rounded-lg p-4 transition ${
              status?.planCode === code ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{plan.name}</h3>
              {status?.planCode === code && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="mb-3">
              <div className="text-2xl font-bold text-gray-900">
                {plan.priceRp === 0 ? "Gratis" : `Rp ${plan.priceRp.toLocaleString("id-ID")}`}
              </div>
              <p className="text-xs text-gray-500">/bulan</p>
            </div>

            <ul className="space-y-2 mb-4 text-sm">
              <li className="flex items-center gap-2">
                <span className={plan.features.whatsapp ? "text-green-600" : "text-gray-400"}>✓</span>
                <span>Gateway WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={plan.features.reports ? "text-green-600" : "text-gray-400"}>✓</span>
                <span>Laporan Lengkap</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={plan.features.publicCatalog ? "text-green-600" : "text-gray-400"}>✓</span>
                <span>Katalog Publik</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={plan.features.bonusSimulator ? "text-green-600" : "text-gray-400"}>✓</span>
                <span>Simulator Komisi</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={plan.features.offlineSync ? "text-green-600" : "text-gray-400"}>✓</span>
                <span>Sinkronisasi Offline</span>
              </li>
            </ul>

            <button
              onClick={() => handleUpgrade(code)}
              disabled={status?.planCode === code || charging}
              className={`w-full py-2 px-3 rounded font-medium transition ${
                status?.planCode === code
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              }`}
            >
              {charging ? <Loader2 className="w-4 h-4 inline animate-spin" /> : status?.planCode === code ? "Paket Aktif" : "Pilih"}
            </button>
          </div>
        ))}
      </div>

      {/* Midtrans Snap Script */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
    </div>
  );
}
