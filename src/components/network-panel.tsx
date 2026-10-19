"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  GitFork,
  Users,
  Award,
  Layers,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  X,
} from "lucide-react";

type Member = {
  id: string;
  hniId: string;
  name: string;
  level: number;
  ownPv: number;
  groupPv: number;
  downlineCount: number;
  hiddenDownlineCount: number;
  downlines: Member[];
};
type Network = {
  month: string;
  roots: Member[];
  memberCount: number;
  totalPv: number;
  maxDepth: number;
  displayDepthLimit: number;
  externalUplines: string[];
};
type Session = { accessToken: string; user: { tenant: { id: string } } };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const monthNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const pv = (value: number) => value.toLocaleString("id-ID");

function flatten(members: Member[]): Member[] {
  return members.flatMap((member) => [member, ...flatten(member.downlines)]);
}

function TreeNode({
  member,
  selectedId,
  onSelect,
}: {
  member: Member;
  selectedId: string | null;
  onSelect: (member: Member) => void;
}) {
  const isSelected = selectedId === member.id;

  return (
    <li className="mt-2.5">
      <button
        className={`w-full rounded-xl border p-3.5 text-left transition ${
          isSelected
            ? "border-emerald-500 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
        }`}
        onClick={() => onSelect(member)}
        type="button"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
              L{member.level + 1}
            </div>
            <div>
              <strong className="text-slate-900 font-bold text-sm">{member.name}</strong>
              <span className="ml-2 font-mono text-xs text-slate-500">ID: {member.hniId}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
              PV Pribadi: <b>{pv(member.ownPv)}</b>
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800 font-bold border border-emerald-200">
              PV Jaringan: {pv(member.groupPv)}
            </span>
            <span className="text-slate-500 font-semibold">{member.downlineCount} downline</span>
          </div>
        </div>

        {member.hiddenDownlineCount > 0 && (
          <small className="block mt-1.5 text-amber-700 text-[11px] font-medium">
            +{member.hiddenDownlineCount} downline di bawah batas tampilan {member.level + 1} level (tetap dihitung di PV grup).
          </small>
        )}
      </button>

      {member.downlines.length > 0 && (
        <ul className="ml-4 border-l-2 border-emerald-200 pl-4 mt-1 space-y-2">
          {member.downlines.map((child) => (
            <TreeNode key={child.id} member={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function NetworkPanel({ session }: { session: Session }) {
  const [month, setMonth] = useState(monthNow);
  const [data, setData] = useState<Network | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", hniId: "", uplineHniId: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.user.tenant.id,
    }),
    [session.accessToken, session.user.tenant.id]
  );

  const fetchNetwork = useCallback(async () => {
    const response = await fetch(`${apiUrl}/customers/network?month=${month}`, { headers });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Jaringan gagal dimuat.");
    return body as Network;
  }, [month, headers]);

  const applyNetwork = useCallback((body: Network) => {
    setData(body);
    setSelected((current) =>
      current ? flatten(body.roots).find((member) => member.id === current.id) ?? null : null
    );
  }, []);

  // Dipakai setelah aksi lain (tetap membersihkan pesan error)
  const load = useCallback(async () => {
    setError("");
    applyNetwork(await fetchNetwork());
  }, [fetchNetwork, applyNetwork]);

  // Muat otomatis saat bulan berubah; state hanya diubah setelah data datang
  useEffect(() => {
    let cancelled = false;
    fetchNetwork()
      .then((body) => {
        if (cancelled) return;
        applyNetwork(body);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Jaringan gagal dimuat.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchNetwork, applyNetwork]);

  const members = useMemo(
    () => (data ? flatten(data.roots).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [data]
  );

  async function addDownline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/customers`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          hniId: form.hniId,
          uplineHniId: form.uplineHniId || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? "Downline gagal disimpan.");
      }
      setMessage(
        `${form.name} berhasil ditambahkan${
          form.uplineHniId ? ` di bawah upline ${form.uplineHniId}` : " sebagai member utama"
        }.`
      );
      setForm({ name: "", phone: "", hniId: "", uplineHniId: form.uplineHniId });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Downline gagal disimpan.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="catalog-heading">
        <div>
          <span className="dashboard-label">GENEALOGI MEMBER</span>
          <h3>Struktur Jaringan HNI</h3>
          <p>
            Pohon jaringan downline/upline otomatis diperbarui saat ID upline customer berubah. Tampilan dibatasi{" "}
            {data?.displayDepthLimit ?? 5} level kedalaman.
          </p>
        </div>
      </div>

      {/* Filter Bulan */}
      <section className="catalog-panel">
        <label className="flex items-center gap-3 text-xs font-bold text-slate-800">
          <span>Bulan Perhitungan PV</span>
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

      {/* Form Tambah Downline */}
      <section className="catalog-panel border-emerald-200">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Plus className="h-4 w-4 text-emerald-700" />
          <h4>Tambah Downline Baru</h4>
        </div>

        <form className="grid gap-3 md:grid-cols-4 items-end" onSubmit={addDownline}>
          <label className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
            Nama Lengkap
            <input
              className="rounded-lg border px-3 py-2 text-xs"
              required
              minLength={2}
              maxLength={120}
              placeholder="Nama Downline"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
            Nomor WhatsApp (Opsional)
            <input
              className="rounded-lg border px-3 py-2 text-xs"
              inputMode="tel"
              maxLength={32}
              placeholder="0812..."
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
          <label className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
            ID Member HNI
            <input
              className="rounded-lg border px-3 py-2 text-xs"
              required
              pattern="[A-Za-z0-9-]{4,32}"
              maxLength={32}
              placeholder="ID HNI"
              value={form.hniId}
              onChange={(event) => setForm({ ...form, hniId: event.target.value })}
            />
          </label>
          <label className="text-xs font-bold text-slate-700 flex flex-col gap-1.5">
            Pilih Upline
            <select
              className="rounded-lg border px-3 py-2 text-xs"
              value={form.uplineHniId}
              onChange={(event) => setForm({ ...form, uplineHniId: event.target.value })}
            >
              <option value="">Tanpa upline (Member utama)</option>
              {members.map((member) => (
                <option key={member.id} value={member.hniId}>
                  {member.name} · {member.hniId}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4 mt-2">
            <button className="button button-primary" type="submit">
              Simpan Downline
            </button>
          </div>
        </form>
      </section>

      {/* Summary KPI Jaringan */}
      {data && (
        <>
          <section className="report-kpis grid grid-cols-1 sm:grid-cols-3 gap-4">
            <article>
              <div className="flex items-center justify-between">
                <span>Total Anggota Jaringan</span>
                <Users className="h-4 w-4 text-emerald-700" />
              </div>
              <strong className="text-2xl text-slate-900">{data.memberCount} member</strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Total PV Jaringan</span>
                <Award className="h-4 w-4 text-emerald-700" />
              </div>
              <strong className="text-2xl text-emerald-700">{pv(data.totalPv)} PV</strong>
            </article>

            <article>
              <div className="flex items-center justify-between">
                <span>Kedalaman Level</span>
                <Layers className="h-4 w-4 text-emerald-700" />
              </div>
              <strong className="text-2xl text-slate-800">{data.maxDepth} level</strong>
            </article>
          </section>

          {data.externalUplines.length > 0 && (
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
              Upline di luar toko ini (belum terdaftar sebagai customer lokal):{" "}
              <strong>{data.externalUplines.join(", ")}</strong>
            </p>
          )}

          {/* Rekap Leg Anggota Terpilih */}
          {selected && (
            <section className="catalog-panel border-emerald-300 bg-emerald-50/20">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-700" />
                  <h4 className="font-bold text-slate-900">Rekap PV per Leg: {selected.name}</h4>
                </div>
                <button className="text-button" onClick={() => setSelected(null)} type="button">
                  <X className="h-4 w-4 inline mr-1" />
                  Tutup Rincian
                </button>
              </div>

              <div className="product-table-wrap bg-white mt-3">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Leg (Downline Langsung)</th>
                      <th>ID HNI</th>
                      <th>Anggota di Leg</th>
                      <th>PV Leg</th>
                      <th>Porsi Kontribusi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.downlines.map((leg) => (
                      <tr key={leg.id}>
                        <td className="font-bold text-slate-800">{leg.name}</td>
                        <td className="font-mono text-slate-700">{leg.hniId}</td>
                        <td>{leg.downlineCount + 1} orang</td>
                        <td className="font-bold text-emerald-700">{pv(leg.groupPv)} PV</td>
                        <td className="font-semibold text-slate-700">
                          {selected.groupPv - selected.ownPv > 0
                            ? `${Math.round((leg.groupPv / (selected.groupPv - selected.ownPv)) * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {!selected.downlines.length && (
                      <tr>
                        <td className="empty-table" colSpan={5}>
                          {selected.hiddenDownlineCount
                            ? "Leg berada di bawah batas tampilan 5 level."
                            : "Belum memiliki downline langsung."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Pohon Silsilah Anggota */}
          <section className="catalog-panel">
            <div className="section-title">
              <div className="flex items-center gap-2">
                <GitFork className="h-4 w-4 text-emerald-700" />
                <h4>Silsilah Pohon Jaringan (Klik untuk Lihat Rekap Leg)</h4>
              </div>
            </div>

            {data.roots.length ? (
              <ul className="space-y-1">
                {data.roots.map((root) => (
                  <TreeNode
                    key={root.id}
                    member={root}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                  />
                ))}
              </ul>
            ) : (
              <p className="empty-note text-slate-500 py-6 text-center">
                Belum ada profil anggota ber-ID HNI di toko ini.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
