"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Trophy,
  Sparkles,
  Calculator,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";

type Session = { accessToken: string; user: { tenant: { id: string } } };
type Rank = {
  code: string;
  name: string;
  minOwnPv: number;
  minGroupPv: number;
  personalRate: number;
  generationRates: number[];
};
type Badge = { name: string; minPv: number };
type Scheme = {
  name: string;
  isExample: boolean;
  pvValue: number;
  ranks: Rank[];
  badges: Badge[];
  updatedAt: string | null;
};
type RankRef = { code: string; name: string } | null;
type LeaderRow = {
  position: number;
  customerId: string;
  name: string;
  hniId: string;
  ownPv: number;
  groupPv: number;
  rank: RankRef;
  badge: string | null;
};
type MemberBonus = {
  name: string;
  ownPv: number;
  groupPv: number;
  rank: RankRef;
  personalBonus: number;
  generationBonus: Array<{ generation: number; pv: number; rate: number; bonus: number }>;
  totalBonus: number;
};
type Simulation = {
  member: { before: MemberBonus; after: MemberBonus; difference: number };
  changes: Array<{
    customerId: string;
    name: string;
    fromPv: number;
    toPv: number;
    rankBefore: RankRef;
    rankAfter: RankRef;
  }>;
};
type Change = { customerId: string; mode: "rank" | "pv"; value: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const monthNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const percent = (rate: number) => `${Math.round(rate * 10000) / 100}%`;
const badgeClass: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-900 border border-amber-300",
  Silver: "bg-slate-200 text-slate-800 border border-slate-300",
  Gold: "bg-yellow-100 text-yellow-900 border border-yellow-300",
  Diamond: "bg-sky-100 text-sky-900 border border-sky-300",
};

function BonusBreakdown({
  title,
  bonus,
  pvValue,
}: {
  title: string;
  bonus: MemberBonus;
  pvValue: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b mb-2">
        <strong className="text-sm font-bold text-slate-900">{title}</strong>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {bonus.rank?.name ?? "Belum memenuhi syarat"}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-2">
        PV Pribadi: <b>{bonus.ownPv}</b> · PV Grup: <b>{bonus.groupPv}</b>
      </p>
      <ul className="text-xs space-y-1 text-slate-700">
        <li className="flex justify-between">
          <span>Bonus Pribadi:</span>
          <b>{money.format(bonus.personalBonus)}</b>
        </li>
        {bonus.generationBonus.map((item) => (
          <li key={item.generation} className="flex justify-between text-slate-600">
            <span>Gen {item.generation} ({item.pv} PV × {percent(item.rate)}):</span>
            <span>{money.format(item.bonus)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2 border-t flex justify-between items-center text-sm font-bold text-emerald-800">
        <span>Total Bonus:</span>
        <span>{money.format(bonus.totalBonus)}</span>
      </div>
    </div>
  );
}

export default function BonusPanel({ session }: { session: Session }) {
  const [month, setMonth] = useState(monthNow);
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [schemeText, setSchemeText] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [memberId, setMemberId] = useState("");
  const [changes, setChanges] = useState<Change[]>([{ customerId: "", mode: "rank", value: "" }]);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.user.tenant.id,
      "Content-Type": "application/json",
    }),
    [session.accessToken, session.user.tenant.id]
  );

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${path}`, { ...init, headers });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? "Permintaan gagal.");
      }
      return body;
    },
    [headers]
  );

  const load = useCallback(async () => {
    setError("");
    const [schemeBody, boardBody] = await Promise.all([
      api("/bonus/scheme"),
      api(`/bonus/leaderboard?month=${month}`),
    ]);
    const { updatedAt: _updatedAt, ...editable } = schemeBody as Scheme;
    setScheme(schemeBody as Scheme);
    setSchemeText(JSON.stringify(editable, null, 2));
    setLeaderboard((boardBody as { rows: LeaderRow[] }).rows);
  }, [api, month]);

  useEffect(() => {
    void load().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Data bonus gagal dimuat.")
    );
  }, [load]);

  async function saveScheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const parsed = JSON.parse(schemeText) as Omit<Scheme, "updatedAt">;
      await api("/bonus/scheme", { method: "PUT", body: JSON.stringify(parsed) });
      setMessage("Skema bonus berhasil disimpan.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof SyntaxError
          ? "Format JSON skema tidak valid."
          : cause instanceof Error
          ? cause.message
          : "Skema gagal disimpan."
      );
    }
  }

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSimulation(null);
    try {
      const payload = changes
        .filter((change) => change.customerId && change.value)
        .map((change) =>
          change.mode === "rank"
            ? { customerId: change.customerId, targetRankCode: change.value }
            : { customerId: change.customerId, ownPv: Number(change.value) }
        );
      setSimulation(
        (await api("/bonus/simulate", {
          method: "POST",
          body: JSON.stringify({ month, customerId: memberId, changes: payload }),
        })) as Simulation
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Simulasi bonus gagal.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">PERINGKAT & INSENTIF</span>
          <h3>Bonus & Leaderboard Peringkat</h3>
          <p>Simulasi kalkulasi bonus berjenjang dengan skema fleksibel dan leaderboard pencapaian PV bulanan.</p>
        </div>
      </div>

      {/* Filter Bulan */}
      <section className="catalog-panel">
        <label className="flex items-center gap-3 text-xs font-bold text-slate-800">
          <span>Bulan Periode</span>
          <input
            className="rounded-lg border px-3 py-1.5 text-xs"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
      </section>

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

      {scheme?.isExample && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 leading-relaxed">
          <strong>Perhatian:</strong> Skema aktif saat ini masih merupakan <b>skema contoh</b>, bukan rumus resmi HPAI.
          Sesuaikan angka peringkat, nilai 1 PV ke rupiah, dan persentase generasi sesuai marketing plan resmi sebelum hasil simulasi dibagikan ke member.
        </div>
      )}

      {/* Leaderboard Table */}
      <section className="catalog-panel">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-700" />
            <h4>Leaderboard PV Periode {month}</h4>
          </div>
        </div>

        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Nama Member</th>
                <th>ID Member HNI</th>
                <th>PV Sendiri</th>
                <th>PV Grup</th>
                <th>Peringkat</th>
                <th>Lencana</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.customerId}>
                  <td>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        row.position === 1
                          ? "bg-amber-400 text-amber-950 shadow-sm"
                          : row.position === 2
                          ? "bg-slate-300 text-slate-800"
                          : row.position === 3
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>
                  <td className="font-bold text-slate-800">{row.name}</td>
                  <td className="font-mono text-slate-700">{row.hniId}</td>
                  <td className="font-semibold text-slate-800">{row.ownPv.toLocaleString("id-ID")}</td>
                  <td className="font-bold text-emerald-700">{row.groupPv.toLocaleString("id-ID")}</td>
                  <td>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {row.rank?.name ?? "—"}
                    </span>
                  </td>
                  <td>
                    {row.badge ? (
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badgeClass[row.badge] ?? "bg-emerald-100 text-emerald-900"}`}>
                        {row.badge}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!leaderboard.length && (
                <tr>
                  <td className="empty-table" colSpan={7}>
                    Belum ada member ber-ID HNI yang tercatat untuk bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator Proyeksi Bonus */}
      <section className="catalog-panel border-emerald-200">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Calculator className="h-4 w-4 text-emerald-700" />
          <h4>Simulator: &quot;Jika Downline Naik Level / PV, Bonus Saya Berapa?&quot;</h4>
        </div>

        <form className="space-y-4" onSubmit={simulate}>
          <label className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-3">
            Member yang dihitung:
            <select
              className="rounded-lg border px-3 py-2 text-xs"
              required
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">Pilih member utama</option>
              {leaderboard.map((row) => (
                <option key={row.customerId} value={row.customerId}>
                  {row.name} · {row.hniId}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Skenario Perubahan Downline:</span>
            {changes.map((change, index) => (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border" key={index}>
                <select
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  value={change.customerId}
                  onChange={(event) =>
                    setChanges(
                      changes.map((item, i) => (i === index ? { ...item, customerId: event.target.value } : item))
                    )
                  }
                >
                  <option value="">Pilih downline</option>
                  {leaderboard
                    .filter((row) => row.customerId !== memberId)
                    .map((row) => (
                      <option key={row.customerId} value={row.customerId}>
                        {row.name}
                      </option>
                    ))}
                </select>

                <select
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  value={change.mode}
                  onChange={(event) =>
                    setChanges(
                      changes.map((item, i) =>
                        i === index ? { ...item, mode: event.target.value as Change["mode"], value: "" } : item
                      )
                    )
                  }
                >
                  <option value="rank">Naik ke peringkat</option>
                  <option value="pv">PV sendiri menjadi</option>
                </select>

                {change.mode === "rank" ? (
                  <select
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    value={change.value}
                    onChange={(event) =>
                      setChanges(changes.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))
                    }
                  >
                    <option value="">Pilih peringkat</option>
                    {scheme?.ranks.map((rank) => (
                      <option key={rank.code} value={rank.code}>
                        {rank.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-32 rounded-lg border px-3 py-1.5 text-xs"
                    min="0"
                    step="0.01"
                    type="number"
                    placeholder="Nilai PV baru"
                    value={change.value}
                    onChange={(event) =>
                      setChanges(changes.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))
                    }
                  />
                )}

                {changes.length > 1 && (
                  <button
                    className="text-slate-400 hover:text-red-600 p-1"
                    onClick={() => setChanges(changes.filter((_, i) => i !== index))}
                    type="button"
                    title="Hapus skenario ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <button
              className="button button-secondary text-xs"
              onClick={() => setChanges([...changes, { customerId: "", mode: "rank", value: "" }])}
              type="button"
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Tambah Skenario
            </button>
            <button className="button button-primary text-xs" disabled={!memberId} type="submit">
              Hitung Simulasi Bonus
            </button>
          </div>

          {simulation && scheme && (
            <div className="mt-4 space-y-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-2">
                <BonusBreakdown title="Kondisi Saat Ini" bonus={simulation.member.before} pvValue={scheme.pvValue} />
                <BonusBreakdown
                  title="Setelah Skenario Terwujud"
                  bonus={simulation.member.after}
                  pvValue={scheme.pvValue}
                />
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800">Proyeksi Selisih Bonus:</span>
                  <p className="text-xl font-bold text-emerald-950">
                    {simulation.member.difference >= 0 ? "+" : ""}
                    {money.format(simulation.member.difference)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Dampak Perubahan Anggota:</span>
                {simulation.changes.map((item) => (
                  <p key={item.customerId} className="text-slate-600">
                    <strong>{item.name}</strong>: PV {item.fromPv} → {item.toPv} · Peringkat{" "}
                    {item.rankBefore?.name ?? "tanpa peringkat"} → {item.rankAfter?.name ?? "tanpa peringkat"}
                  </p>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Editor Skema Bonus JSON */}
      <section className="catalog-panel">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Sliders className="h-4 w-4 text-emerald-700" />
          <h4>Konfigurasi Skema Bonus (Format JSON)</h4>
        </div>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          Atur parameter <code>pvValue</code> (rupiah per 1 PV), <code>ranks</code> (syarat PV pribadi & grup, persentase bonus generasi), dan <code>badges</code>. Ubah <code>isExample: false</code> setelah memakai data resmi.
        </p>

        <form className="space-y-3" onSubmit={saveScheme}>
          <textarea
            aria-label="Skema bonus JSON"
            className="h-64 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-emerald-600"
            spellCheck={false}
            value={schemeText}
            onChange={(event) => setSchemeText(event.target.value)}
          />
          <div className="flex items-center justify-between">
            <button className="button button-primary text-xs" type="submit">
              Simpan Skema Bonus
            </button>
            {scheme?.updatedAt && (
              <span className="text-xs text-slate-400">
                Terakhir diubah {new Date(scheme.updatedAt).toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
