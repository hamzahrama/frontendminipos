"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  User,
  UserPlus,
  Tag,
  PauseCircle,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Receipt,
  X,
} from "lucide-react";
import { CartLine, CartProduct, useCartStore } from "../stores/cart-store";

type PosSession = {
  accessToken: string;
  user: { tenant: { id: string; name: string } };
};
type ApiProduct = {
  id: string;
  name: string;
  sku: string;
  memberPrice: string;
  retailPrice: string;
  pv: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  images: { url: string; alt: string | null }[];
};
type Category = { id: string; name: string };
type StockItem = { id: string; quantity: number };
type Customer = { id: string; name: string; phone: string | null; hniProfile: { hniId: string } | null };
type CheckoutResult = {
  id: string;
  invoiceNo: string;
  receiptToken: string;
  total: string;
  totalPv: string;
  changeAmount: string;
};
type VoucherPreview = { code: string; discountAmount: number; subtotal: number };
type PosDraft = {
  id: string;
  label: string;
  lines: CartLine[];
  memberMode: boolean;
  memberId: string;
  customerId: string;
  cash: string;
  discount: string;
  voucherCode: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function loadDrafts(tenantId: string): PosDraft[] {
  try {
    const stored = window.localStorage.getItem(`hni-pos-drafts-${tenantId}`);
    return stored ? (JSON.parse(stored) as PosDraft[]) : [];
  } catch {
    return [];
  }
}

export default function PosTerminal({ session }: { session: PosSession }) {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memberMode, setMemberMode] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [cash, setCash] = useState("");
  const [orderDiscount, setOrderDiscount] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherPreview, setVoucherPreview] = useState<VoucherPreview | null>(null);
  const [drafts, setDrafts] = useState<PosDraft[]>(() => loadDrafts(session.user.tenant.id));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: "", phone: "", hniId: "" });
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waStatus, setWaStatus] = useState<{ kind: "idle" | "sending" | "sent" | "error"; text: string }>({
    kind: "idle",
    text: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null);

  const lines = useCartStore((state) => state.lines);
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const setDiscount = useCartStore((state) => state.setDiscount);
  const setLines = useCartStore((state) => state.setLines);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  const authHeaders = useCallback(
    (token: string, tenantId: string) => ({
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    }),
    []
  );

  // Keranjang dikosongkan saat panel dibuka atau toko berganti
  useEffect(() => {
    clear();
  }, [session.user.tenant.id, clear]);

  useEffect(() => {
    window.localStorage.setItem(`hni-pos-drafts-${session.user.tenant.id}`, JSON.stringify(drafts));
  }, [drafts, session.user.tenant.id]);

  useEffect(() => {
    let active = true;
    const headers = authHeaders(session.accessToken, session.user.tenant.id);

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [productResponse, categoryResponse, stockResponse, customerResponse] = await Promise.all([
          fetch(`${API_URL}/products?limit=100`, { headers }),
          fetch(`${API_URL}/categories`, { headers }),
          fetch(`${API_URL}/inventory/stock`, { headers }),
          fetch(`${API_URL}/customers`, { headers }),
        ]);

        const results = await Promise.all([
          productResponse.json(),
          categoryResponse.json(),
          stockResponse.json(),
          customerResponse.json(),
        ]);

        const failed = [productResponse, categoryResponse, stockResponse, customerResponse].find(
          (response) => !response.ok
        );
        if (failed) throw new Error("Katalog POS tidak dapat dimuat. Pastikan akun memiliki akses kasir.");
        if (!active) return;

        const stockById = new Map((results[2] as StockItem[]).map((item) => [item.id, item.quantity]));
        setProducts(
          (results[0] as { items: ApiProduct[] }).items.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            categoryId: item.categoryId,
            memberPrice: Number(item.memberPrice),
            retailPrice: Number(item.retailPrice),
            pv: Number(item.pv),
            imageUrl: item.images[0]?.url ?? null,
            stock: stockById.get(item.id) ?? 0,
          }))
        );
        setCategories(results[1] as Category[]);
        setCustomers(results[3] as Customer[]);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Katalog POS tidak dapat dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [session, authHeaders]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = `${product.name} ${product.sku}`.toLowerCase().includes(search.trim().toLowerCase());
      return matchesSearch && (!categoryId || product.categoryId === categoryId);
    });
  }, [products, search, categoryId]);

  const subtotal = lines.reduce(
    (sum, line) => sum + (memberMode ? line.product.memberPrice : line.product.retailPrice) * line.quantity,
    0
  );
  const itemDiscountTotal = lines.reduce(
    (sum, line) =>
      sum + Math.min(line.discountAmount, (memberMode ? line.product.memberPrice : line.product.retailPrice) * line.quantity),
    0
  );
  const orderDiscountValue = Math.max(0, Number(orderDiscount) || 0);
  const voucherBase = Math.max(0, subtotal - itemDiscountTotal - orderDiscountValue);
  const currentVoucherDiscount =
    voucherPreview && voucherPreview.subtotal === voucherBase ? voucherPreview.discountAmount : 0;
  const total = Math.max(0, subtotal - itemDiscountTotal - orderDiscountValue - currentVoucherDiscount);
  const pvTotal = memberMode ? lines.reduce((sum, line) => sum + line.product.pv * line.quantity, 0) : 0;
  const paid = Number(cash) || 0;
  const change = Math.max(0, paid - total);
  const memberIdValid = !memberMode || /^[a-z0-9-]{4,32}$/i.test(memberId.trim());
  const searchableRef = useRef<HTMLInputElement>(null);

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (quickCustomer.hniId && !/^[a-z0-9-]{4,32}$/i.test(quickCustomer.hniId)) {
      setError("ID HNI harus berisi 4–32 karakter alfanumerik atau tanda hubung.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: {
          ...authHeaders(session.accessToken, session.user.tenant.id),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: quickCustomer.name,
          phone: quickCustomer.phone || undefined,
          hniId: quickCustomer.hniId || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Customer gagal disimpan.");
      const customer = result as Customer;
      setCustomers((current) =>
        [...current.filter((item) => item.id !== customer.id), customer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(customer.id);
      if (customer.hniProfile) {
        setMemberMode(true);
        setMemberId(customer.hniProfile.hniId);
      }
      setQuickCustomer({ name: "", phone: "", hniId: "" });
      setShowQuickAdd(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Customer gagal disimpan.");
    }
  }

  async function checkout() {
    setError("");
    setCheckingOut(true);
    const payload = {
      customerId: customerId || undefined,
      memberMode,
      memberHniId: memberMode ? memberId.trim() : undefined,
      items: lines.map(({ product, quantity, discountAmount }) => ({
        productId: product.id,
        quantity,
        discountAmount: Math.min(discountAmount, (memberMode ? product.memberPrice : product.retailPrice) * quantity),
      })),
      cashReceived: paid,
      discountAmount: orderDiscountValue,
      voucherCode: currentVoucherDiscount ? voucherPreview?.code : undefined,
    };
    const fingerprint = JSON.stringify(payload);
    if (!idempotency.current || idempotency.current.fingerprint !== fingerprint) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() };
    }
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          ...authHeaders(session.accessToken, session.user.tenant.id),
          "Content-Type": "application/json",
          "Idempotency-Key": idempotency.current.key,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(result.message) ? result.message[0] : result.message ?? "Checkout gagal.");
      }
      const sale = result as CheckoutResult;
      setWaPhone(customers.find((customer) => customer.id === (customerId || undefined))?.phone ?? "");
      setWaStatus({ kind: "idle", text: "" });
      setCheckoutResult(sale);
      clear();
      setCash("");
      setOrderDiscount("");
      setVoucherCode("");
      setVoucherPreview(null);
      idempotency.current = null;

      const stockResponse = await fetch(`${API_URL}/inventory/stock`, {
        headers: authHeaders(session.accessToken, session.user.tenant.id),
      });
      if (stockResponse.ok) {
        const updatedStock = (await stockResponse.json()) as StockItem[];
        setProducts((current) =>
          current.map((product) => ({
            ...product,
            stock: updatedStock.find((item) => item.id === product.id)?.quantity ?? 0,
          }))
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout gagal.");
    } finally {
      setCheckingOut(false);
    }
  }

  async function sendReceiptWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkoutResult) return;
    setWaStatus({ kind: "sending", text: "Mengirim struk…" });
    try {
      const response = await fetch(`${API_URL}/transactions/${checkoutResult.id}/whatsapp`, {
        method: "POST",
        headers: {
          ...authHeaders(session.accessToken, session.user.tenant.id),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: waPhone.trim() || undefined }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(result.message) ? result.message[0] : result.message ?? "Struk gagal dikirim.");
      }
      setWaStatus({
        kind: "sent",
        text: `Struk terkirim ke ${result.phone} (${(Number(result.durationMs) / 1000).toFixed(1)} detik).`,
      });
    } catch (caught) {
      setWaStatus({ kind: "error", text: caught instanceof Error ? caught.message : "Struk gagal dikirim." });
    }
  }

  async function previewVoucher() {
    setError("");
    setVoucherPreview(null);
    if (!voucherCode.trim()) return;
    try {
      const response = await fetch(`${API_URL}/vouchers/validate`, {
        method: "POST",
        headers: {
          ...authHeaders(session.accessToken, session.user.tenant.id),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: voucherCode, subtotal: voucherBase }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Voucher tidak dapat digunakan.");
      setVoucherPreview(result as VoucherPreview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voucher tidak dapat digunakan.");
    }
  }

  function holdOrder() {
    if (!lines.length) return;
    const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const draft: PosDraft = {
      id: crypto.randomUUID(),
      label: `Pesanan ${now}`,
      lines,
      memberMode,
      memberId,
      customerId,
      cash,
      discount: orderDiscount,
      voucherCode,
    };
    setDrafts((current) => [draft, ...current]);
    clear();
    setCash("");
    setOrderDiscount("");
    setVoucherCode("");
    setVoucherPreview(null);
    setMemberId("");
    setCustomerId("");
    setMemberMode(false);
  }

  function resumeOrder(draft: PosDraft) {
    if (lines.length) holdOrder();
    setLines(draft.lines);
    setMemberMode(draft.memberMode);
    setMemberId(draft.memberId);
    setCustomerId(draft.customerId);
    setCash(draft.cash);
    setOrderDiscount(draft.discount);
    setVoucherCode(draft.voucherCode);
    setVoucherPreview(null);
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
  }

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        searchableRef.current?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        setMemberMode((current) => !current);
      }
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        if (lines.length && memberIdValid && paid >= total && !checkingOut) void checkout();
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        holdOrder();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  });

  return (
    <div className="pos-shell">
      {/* Top Banner info */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Terminal Kasir Penjualan</h2>
            <p className="text-xs text-slate-500 font-medium">
              Toko: {session.user.tenant.name} · Mode Kasir Cepat
            </p>
          </div>
        </div>

        {/* Shortcuts pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">F2</span> Cari
          <span className="text-slate-300">·</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">F4</span> Toggle Member
          <span className="text-slate-300">·</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">Ctrl+Enter</span> Bayar
          <span className="text-slate-300">·</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">Ctrl+Shift+H</span> Tahan
        </div>
      </div>

      <div className="pos-layout">
        {/* SISI KIRI: KATALOG PRODUK KASIR */}
        <section className="pos-products">
          <div className="pos-title">
            <div>
              <p className="dashboard-label">KATALOG TRANSAKSI</p>
              <h1>Pilih Produk</h1>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              {visibleProducts.length} produk siap
            </span>
          </div>

          <div className="pos-filters">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                ref={searchableRef}
                className="pl-9"
                aria-label="Cari produk"
                placeholder="Cari nama atau SKU produk… (Tekan F2)"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter kategori"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="feedback error mb-3" role="alert">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              <RotateCcw className="h-5 w-5 animate-spin mr-2" />
              Memuat katalog kasir…
            </div>
          ) : (
            <div className="pos-product-grid">
              {visibleProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const price = memberMode ? product.memberPrice : product.retailPrice;

                return (
                  <button
                    key={product.id}
                    className="pos-product-card"
                    disabled={isOutOfStock}
                    onClick={() => add(product)}
                    type="button"
                    title={isOutOfStock ? "Stok habis" : "Klik untuk tambah ke keranjang"}
                  >
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        width={240}
                        height={140}
                        className="h-28 w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="pos-product-placeholder">{product.name.slice(0, 1)}</span>
                    )}

                    <span className="pos-product-info">
                      <strong>{product.name}</strong>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <small className="truncate max-w-[80px]">{product.sku}</small>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            isOutOfStock
                              ? "bg-red-50 text-red-700"
                              : product.stock <= 5
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          Stok {product.stock}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <b>{money.format(price)}</b>
                        {memberMode && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            +{product.pv} PV
                          </span>
                        )}
                      </div>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && visibleProducts.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="font-medium text-sm">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </section>

        {/* SISI KANAN: DOCK KERANJANG & CHECKOUT */}
        <aside className="pos-checkout">
          <div className="pos-title pb-2 border-b">
            <div>
              <p className="dashboard-label">DETAIL ORDER</p>
              <h2>Keranjang Belanja</h2>
            </div>
            <div className="pos-cart-actions">
              <button
                className="text-button text-xs"
                disabled={!lines.length}
                onClick={holdOrder}
                type="button"
                title="Tahan pesanan untuk melayani pelanggan lain"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Tahan</span>
              </button>
              <button
                className="text-button text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={!lines.length}
                onClick={() => {
                  clear();
                  setCash("");
                  setOrderDiscount("");
                  setVoucherCode("");
                  setVoucherPreview(null);
                }}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Kosongkan</span>
              </button>
            </div>
          </div>

          {/* Drafts Tab */}
          {drafts.length > 0 && (
            <div className="pos-drafts mt-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                <PauseCircle className="h-4 w-4 text-emerald-700" />
                <span>Pesanan Ditahan ({drafts.length})</span>
              </div>
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <button
                    className="text-button text-xs font-semibold"
                    onClick={() => resumeOrder(draft)}
                    type="button"
                  >
                    Lanjutkan {draft.label} ({draft.lines.length} produk)
                  </button>
                  <button
                    aria-label={`Hapus ${draft.label}`}
                    onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))}
                    type="button"
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Member Toggle Switch (F4) */}
          <div className="pos-member-toggle">
            <button
              className={!memberMode ? "active" : ""}
              onClick={() => {
                setMemberMode(false);
                setMemberId("");
              }}
              type="button"
            >
              Non-member (Harga Retail)
            </button>
            <button
              className={memberMode ? "active" : ""}
              onClick={() => setMemberMode(true)}
              type="button"
            >
              Member HNI (Harga Member & PV)
            </button>
          </div>

          {memberMode && (
            <label className="pos-member-input">
              <span>ID Member HNI Pelanggan</span>
              <input
                maxLength={32}
                placeholder="Contoh: 01234567"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              />
              {memberId && !memberIdValid && (
                <small className="pos-validation text-xs text-red-600 mt-1">
                  Gunakan 4–32 huruf, angka, atau tanda hubung tanpa spasi.
                </small>
              )}
            </label>
          )}

          {/* Customer Selection */}
          <div className="pos-customer-select">
            <label>
              <span>Pelanggan Terdaftar (Opsional)</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Tanpa pelanggan (Walk-in)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.hniProfile ? ` · HNI ${customer.hniProfile.hniId}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-button whitespace-nowrap text-xs"
              onClick={() => setShowQuickAdd((value) => !value)}
              type="button"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Baru</span>
            </button>
          </div>

          {showQuickAdd && (
            <form className="pos-quick-customer bg-slate-50 p-3 rounded-lg border my-2" onSubmit={addCustomer}>
              <p className="text-xs font-bold text-slate-800 mb-1">Tambah Pelanggan Cepat</p>
              <label>
                Nama Pelanggan
                <input
                  required
                  maxLength={120}
                  placeholder="Nama Lengkap"
                  value={quickCustomer.name}
                  onChange={(event) => setQuickCustomer({ ...quickCustomer, name: event.target.value })}
                />
              </label>
              <label>
                Nomor WhatsApp
                <input
                  inputMode="tel"
                  maxLength={32}
                  placeholder="081234567890"
                  value={quickCustomer.phone}
                  onChange={(event) => setQuickCustomer({ ...quickCustomer, phone: event.target.value })}
                />
              </label>
              <label>
                ID Member HNI (Opsional)
                <input
                  maxLength={32}
                  placeholder="ID Member jika ada"
                  value={quickCustomer.hniId}
                  onChange={(event) => setQuickCustomer({ ...quickCustomer, hniId: event.target.value })}
                />
              </label>
              <div className="flex gap-2 mt-2">
                <button className="button button-primary text-xs flex-1" type="submit">
                  Simpan Pelanggan
                </button>
                <button
                  className="button button-secondary text-xs"
                  onClick={() => setShowQuickAdd(false)}
                  type="button"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Checkout Success Receipt Notification */}
          {checkoutResult && (
            <div className="pos-receipt-message my-3 p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950" role="status">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>Transaksi Berhasil Disimpan!</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Nomor Invoice:</span>
                  <strong className="font-mono">{checkoutResult.invoiceNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Transaksi:</span>
                  <strong>{money.format(Number(checkoutResult.total))}</strong>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>PV Diperoleh:</span>
                  <strong>{Number(checkoutResult.totalPv).toLocaleString("id-ID")} PV</strong>
                </div>
                <div className="flex justify-between text-slate-700 font-bold border-t pt-1">
                  <span>Uang Kembalian:</span>
                  <span className="text-emerald-800">{money.format(Number(checkoutResult.changeAmount))}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={`/receipt/${checkoutResult.receiptToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-secondary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Lihat & Cetak Struk</span>
                </a>
              </div>

              <form className="pos-wa-form mt-2" onSubmit={sendReceiptWhatsApp}>
                <label className="text-xs">
                  <span>Kirim Struk via WhatsApp:</span>
                  <input
                    inputMode="tel"
                    maxLength={32}
                    placeholder="Contoh: 081234567890"
                    value={waPhone}
                    onChange={(event) => setWaPhone(event.target.value)}
                  />
                </label>
                <button
                  className="button button-primary text-xs whitespace-nowrap mt-1"
                  disabled={waStatus.kind === "sending" || waStatus.kind === "sent" || !waPhone.trim()}
                  type="submit"
                >
                  <Send className="h-3 w-3 inline mr-1" />
                  {waStatus.kind === "sending" ? "Mengirim…" : "Kirim WA"}
                </button>
              </form>
              {waStatus.text && (
                <small
                  className={`block mt-1 text-xs ${
                    waStatus.kind === "error" ? "text-red-600 font-semibold" : "text-emerald-700"
                  }`}
                  role="status"
                >
                  {waStatus.text}
                </small>
              )}

              <div className="text-right mt-2">
                <button
                  className="text-button text-xs"
                  onClick={() => setCheckoutResult(null)}
                  type="button"
                >
                  Tutup Notifikasi
                </button>
              </div>
            </div>
          )}

          {/* Cart Line Items */}
          <div className="pos-cart-lines">
            {lines.map(({ product, quantity, discountAmount }) => {
              const price = memberMode ? product.memberPrice : product.retailPrice;
              const lineDiscount = Math.min(discountAmount, price * quantity);

              return (
                <div className="pos-cart-line" key={product.id}>
                  <div>
                    <strong className="text-xs font-bold text-slate-800">{product.name}</strong>
                    <small className="text-slate-500">{money.format(price)} / unit</small>
                    <label className="pos-line-discount">
                      <span>Potongan item:</span>
                      <input
                        aria-label={`Diskon ${product.name}`}
                        min="0"
                        max={price * quantity}
                        step="100"
                        type="number"
                        value={discountAmount}
                        onChange={(event) => setDiscount(product.id, Number(event.target.value) || 0)}
                      />
                    </label>
                  </div>

                  <div className="pos-quantity">
                    <button
                      aria-label={`Kurangi ${product.name}`}
                      onClick={() => setQuantity(product.id, quantity - 1)}
                      type="button"
                    >
                      <Minus className="h-3 w-3 m-auto" />
                    </button>
                    <span className="font-bold text-xs min-w-[20px] text-center">{quantity}</span>
                    <button
                      aria-label={`Tambah ${product.name}`}
                      disabled={quantity >= product.stock}
                      onClick={() => setQuantity(product.id, quantity + 1)}
                      type="button"
                    >
                      <Plus className="h-3 w-3 m-auto" />
                    </button>
                  </div>

                  <b className="font-bold text-slate-900 text-xs">
                    {money.format(price * quantity - lineDiscount)}
                  </b>

                  <button
                    className="pos-remove"
                    aria-label={`Hapus ${product.name}`}
                    onClick={() => remove(product.id)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {lines.length === 0 && (
            <div className="pos-empty py-10 text-center text-slate-400">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Keranjang masih kosong. Pilih produk di sebelah kiri.</p>
            </div>
          )}

          {/* Totals & Payment Section */}
          <div className="pos-totals pt-2 border-t">
            <div>
              <span>Subtotal Barang</span>
              <b>{money.format(subtotal)}</b>
            </div>

            {itemDiscountTotal > 0 && (
              <div className="text-red-600">
                <span>Diskon Item</span>
                <b>−{money.format(itemDiscountTotal)}</b>
              </div>
            )}

            <label className="text-xs">
              <span>Diskon Transaksi (Rp)</span>
              <input
                min="0"
                max={Math.max(0, subtotal - itemDiscountTotal)}
                step="100"
                type="number"
                placeholder="0"
                value={orderDiscount}
                onChange={(event) => setOrderDiscount(event.target.value)}
              />
            </label>

            <div className="pos-voucher-entry">
              <label>
                <span>Kode Voucher Promo</span>
                <input
                  maxLength={32}
                  placeholder="KODE VOUCHER"
                  value={voucherCode}
                  onChange={(event) => {
                    setVoucherCode(event.target.value.toUpperCase());
                    setVoucherPreview(null);
                  }}
                />
              </label>
              <button
                className="button button-secondary text-xs"
                disabled={!voucherCode.trim()}
                onClick={() => void previewVoucher()}
                type="button"
              >
                Pakai
              </button>
            </div>

            {currentVoucherDiscount > 0 && (
              <div className="text-emerald-700 font-semibold">
                <span>Voucher {voucherPreview?.code}</span>
                <b>−{money.format(currentVoucherDiscount)}</b>
              </div>
            )}

            <div>
              <span>Perolehan PV {memberMode ? "Member" : "(Khusus Member)"}</span>
              <b className="text-emerald-700">{pvTotal.toLocaleString("id-ID")} PV</b>
            </div>

            <div className="pos-grand-total">
              <span className="text-slate-800 font-bold">TOTAL BAYAR</span>
              <strong>{money.format(total)}</strong>
            </div>

            <label className="mt-2 text-xs">
              <span className="font-bold text-slate-800">Nominal Uang Diterima (Rp)</span>
              <input
                inputMode="numeric"
                min="0"
                type="number"
                placeholder="Jumlah uang tunai..."
                className="text-base font-bold text-slate-900 h-11"
                value={cash}
                onChange={(event) => setCash(event.target.value)}
              />
            </label>

            <div className="rounded-lg bg-slate-50 p-2.5 border">
              <span className="font-medium text-xs text-slate-600">Uang Kembalian:</span>
              <b className="text-base font-bold text-slate-900">{money.format(change)}</b>
            </div>

            <button
              className="button button-primary pos-pay-button mt-2"
              disabled={
                !lines.length ||
                !memberIdValid ||
                paid < total ||
                checkingOut ||
                orderDiscountValue > subtotal - itemDiscountTotal ||
                (!!voucherCode && !currentVoucherDiscount) ||
                (memberMode && !customers.some((customer) => customer.hniProfile?.hniId === memberId.trim()))
              }
              onClick={() => void checkout()}
              type="button"
            >
              {checkingOut ? "Menyimpan Transaksi…" : "Selesaikan Pembayaran (Ctrl+Enter)"}
            </button>

            {memberMode &&
              memberIdValid &&
              memberId &&
              !customers.some((customer) => customer.hniProfile?.hniId === memberId.trim()) && (
                <small className="pos-validation block text-xs text-red-600 mt-1">
                  ID HNI harus terdaftar sebagai customer di sistem untuk mencatat PV.
                </small>
              )}

            <small className="pos-checkout-note block text-center mt-2 text-slate-400">
              Pintasan: F2 Cari · F4 Member · Ctrl+Enter Bayar · Ctrl+Shift+H Tahan
            </small>
          </div>
        </aside>
      </div>
    </div>
  );
}
