"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Package,
  ShoppingCart,
  Users,
  GitFork,
  Award,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Ticket,
  Store,
  MessageSquare,
  ShieldAlert,
  Copy,
  Check,
  LogOut,
  UserCheck,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Clock,
  Warehouse as WarehouseIcon,
  Layers,
  Upload,
  ArrowUpDown,
  Box,
  Building2,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
} from "lucide-react";
import PosTerminal from "../components/pos-terminal";
import CustomersPanel from "../components/customers-panel";
import VouchersPanel from "../components/vouchers-panel";
import NetworkPanel from "../components/network-panel";
import StorefrontPanel from "../components/storefront-panel";
import WhatsAppLogsPanel from "../components/whatsapp-logs-panel";
import BonusPanel from "../components/bonus-panel";
import SuperAdminPanel from "../components/super-admin-panel";

const ReportsPanel = dynamic(() => import("../components/reports-panel"), { ssr: false });
const ProfitLossPanel = dynamic(() => import("../components/profit-loss-panel"), { ssr: false });
const PvReportPanel = dynamic(() => import("../components/pv-report-panel"), { ssr: false });

type AuthMode = "login" | "register";

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    tenant: { id: string; name: string; slug: string };
    roles: string[];
    permissions: string[];
  };
};

type FormValues = {
  tenantName: string;
  ownerName: string;
  email: string;
  password: string;
  tenantSlug: string;
};

type AuthProfile = {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
};

type Category = { id: string; name: string };
type ProductImage = { id: string; url: string; key: string; alt: string | null };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  memberPrice: string;
  retailPrice: string;
  pv: string;
  isActive: boolean;
  deletedAt: string | null;
  images: ProductImage[];
  lowStockLimit: number;
};
type ProductPage = { items: Product[]; page: number; limit: number; total: number; totalPages: number };
type ImportRow = {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category?: string;
  memberPrice: number;
  retailPrice: number;
  pv?: number;
  rowNumber: number;
  errors: string[];
};
type ImportPreview = { total: number; validCount: number; invalidCount: number; rows: ImportRow[] };
type PriceHistory = {
  id: string;
  previousMemberPrice: string;
  previousRetailPrice: string;
  memberPrice: string;
  retailPrice: string;
  source: string;
  createdAt: string;
};
type Warehouse = { id: string; name: string; code: string; isDefault: boolean };
type ProductBatch = {
  id: string;
  batchCode: string;
  expiryDate: string | null;
  quantity: string;
  receivedQuantity: string;
  unitCost: string | null;
  warehouse: Warehouse;
};
type InventoryAlert = {
  id: string;
  kind: "LOW_STOCK" | "EXPIRY";
  message: string;
  quantity: string | null;
  expiresAt: string | null;
  product: { id: string; name: string; sku: string; lowStockLimit: number };
  batch: { batchCode: string; expiryDate: string | null } | null;
};
type FefoAllocation = {
  batchId: string;
  batchCode: string;
  warehouseId: string;
  quantity: number;
  expiryDate: string | null;
};

const emptyProduct = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  categoryId: "",
  memberPrice: "",
  retailPrice: "",
  pv: "0",
  lowStockLimit: "5",
  isActive: true,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function rotateSession(session: AuthSession): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": session.user.tenant.id,
    },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "Sesi berakhir. Silakan masuk kembali.");
  return result as AuthSession;
}

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState<FormValues>({
    tenantName: "",
    ownerName: "",
    email: "",
    password: "",
    tenantSlug: "",
  });
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) return;

    let active = true;
    const refreshAfter = Math.max(session.expiresIn * 1000 - 60_000, 10_000);
    const timeout = window.setTimeout(() => {
      void rotateSession(session)
        .then((nextSession) => {
          if (active) setSession(nextSession);
        })
        .catch((caught: unknown) => {
          if (!active) return;
          setSession(null);
          setProfile(null);
          setError(caught instanceof Error ? caught.message : "Sesi berakhir. Silakan masuk kembali.");
        });
    }, refreshAfter);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    let active = true;
    async function loadProfile(currentSession: AuthSession, alreadyRefreshed = false) {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentSession.accessToken}`,
          "x-tenant-id": currentSession.user.tenant.id,
        },
      });

      if (response.status === 401 && !alreadyRefreshed) {
        const nextSession = await rotateSession(currentSession);
        if (active) setSession(nextSession);
        return loadProfile(nextSession, true);
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Profil toko tidak dapat dimuat.");
      if (active) setProfile(result as AuthProfile);
    }

    void loadProfile(session).catch((caught: unknown) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : "Profil toko tidak dapat dimuat.");
    });

    return () => {
      active = false;
    };
  }, [session]);

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const endpoint = mode === "register" ? "register-tenant" : "login";
    const body =
      mode === "register"
        ? {
            tenantName: values.tenantName,
            ownerName: values.ownerName,
            email: values.email,
            password: values.password,
          }
        : {
            email: values.email,
            password: values.password,
            tenantSlug: values.tenantSlug,
          };

    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message) ? result.message[0] : result.message;
        throw new Error(message ?? "Permintaan belum berhasil. Coba lagi.");
      }

      setSession(result as AuthSession);
      setNotice(mode === "register" ? "Toko dan akun pemilik berhasil dibuat." : "Berhasil masuk.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAccessToken() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.accessToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Browser tidak mengizinkan menyalin token. Anda tetap bisa memakai respons API.");
    }
  }

  async function logout() {
    if (!session) return;
    let logoutError = "";
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
          "x-tenant-id": session.user.tenant.id,
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!response.ok) logoutError = "Sesi ditutup di browser, tetapi server belum menerima permintaan keluar.";
    } catch {
      logoutError = "Koneksi terputus. Sesi lokal ditutup, tetapi server belum menerima permintaan keluar.";
    } finally {
      setSession(null);
      setProfile(null);
      setCopied(false);
    }
    setError(logoutError);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  function useAnotherAccount() {
    if (!session) return;
    void logout();
    setValues((current) => ({
      ...current,
      email: session.user.email,
      tenantSlug: session.user.tenant.slug,
      password: "",
    }));
    setSession(null);
    changeMode("login");
  }

  // JIKA SUDAH AUTHENTICATED: Tampilkan Enterprise Dashboard App Shell penuh
  if (session) {
    return (
      <CatalogDashboard
        session={session}
        profile={profile}
        copied={copied}
        onCopyToken={copyAccessToken}
        onLogout={logout}
        onSwitchAccount={useAnotherAccount}
        globalError={error}
      />
    );
  }

  // JIKA BELUM AUTHENTICATED: Tampilkan Halaman Login / Registrasi Modern
  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="intro-panel" aria-label="Tentang HNI POS">
          <div className="brand-mark" aria-hidden="true">H</div>
          <p className="eyebrow">HNI POS ECOSYSTEM</p>
          <h1>Kelola toko & jaringan lebih tenang.</h1>
          <p className="intro-copy">
            Platform modern untuk menata penjualan kasir, stok multi-gudang FEFO, rekapitulasi PV member, dan laporan keuangan toko HNI Anda.
          </p>

          <div className="mt-8 grid gap-3 text-xs text-emerald-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Kasir POS Cepat dengan Mode Member & Diskon</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Rekap PV Bulanan & Silsilah Jaringan Otomatis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Manajemen Batch FEFO & Alert Kedaluwarsa</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Cetak Struk Digital & Kirim via WhatsApp</span>
            </div>
          </div>

          <div className="intro-footer">
            <span className="online-dot" />
            <span>Sistem Operasional Siap Digunakan</span>
          </div>
        </section>

        <section className="form-panel" aria-labelledby="auth-title">
          <p className="eyebrow">PORTAL MASUK</p>
          <h2 id="auth-title">{mode === "login" ? "Masuk ke toko" : "Daftarkan toko baru"}</h2>
          <p className="form-description">
            {mode === "login"
              ? "Masukkan akun kasir/pemilik dan slug toko Anda."
              : "Buat ruang kerja toko dan akun pemilik dalam hitungan detik."}
          </p>

          <div className="mode-switch" role="tablist" aria-label="Pilih autentikasi">
            <button
              aria-selected={mode === "login"}
              className={mode === "login" ? "mode-tab active" : "mode-tab"}
              onClick={() => changeMode("login")}
              role="tab"
              type="button"
            >
              Masuk
            </button>
            <button
              aria-selected={mode === "register"}
              className={mode === "register" ? "mode-tab active" : "mode-tab"}
              onClick={() => changeMode("register")}
              role="tab"
              type="button"
            >
              Daftar toko
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" ? (
              <>
                <label>
                  Nama toko
                  <input
                    autoComplete="organization"
                    maxLength={100}
                    minLength={2}
                    onChange={(event) => updateField("tenantName", event.target.value)}
                    placeholder="Contoh: Toko Herbal Barokah"
                    required
                    value={values.tenantName}
                  />
                </label>
                <label>
                  Nama pemilik
                  <input
                    autoComplete="name"
                    maxLength={100}
                    minLength={2}
                    onChange={(event) => updateField("ownerName", event.target.value)}
                    placeholder="Nama lengkap pemilik toko"
                    required
                    value={values.ownerName}
                  />
                </label>
              </>
            ) : (
              <label>
                Slug toko
                <input
                  autoComplete="organization"
                  maxLength={100}
                  onChange={(event) => updateField("tenantSlug", event.target.value)}
                  placeholder="contoh: toko-sehat-ibu"
                  required
                  value={values.tenantSlug}
                />
                <span className="field-hint">Slug toko unik yang diberikan saat pendaftaran.</span>
              </label>
            )}

            <label>
              Email
              <input
                autoComplete="email"
                maxLength={254}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="nama@email.com"
                required
                type="email"
                value={values.email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                maxLength={72}
                minLength={8}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Minimal 8 karakter"
                required
                type="password"
                value={values.password}
              />
            </label>

            {error && <p className="feedback error" role="alert">{error}</p>}
            {notice && <p className="feedback success" role="status">{notice}</p>}

            <button className="button button-primary" disabled={loading} type="submit">
              {loading ? "Memproses…" : mode === "login" ? "Masuk ke Toko" : "Buat Toko & Akun Pemilik"}
            </button>
          </form>

          <p className="security-note">Koneksi aman terenkripsi & password disimpan dalam hash standar industri.</p>
        </section>
      </div>
      <footer className="page-footer">HNI POS <span>•</span> Point of Sale & Jaringan Terpadu</footer>
    </main>
  );
}

// ==========================================
// ENTERPRISE DASHBOARD & MASTER DATA WORKSPACE
// ==========================================
type DashboardProps = {
  session: AuthSession;
  profile: AuthProfile | null;
  copied: boolean;
  onCopyToken: () => void;
  onLogout: () => void;
  onSwitchAccount: () => void;
  globalError?: string;
};

function CatalogDashboard({
  session,
  profile: _profile,
  copied,
  onCopyToken,
  onLogout,
  onSwitchAccount,
  globalError,
}: DashboardProps) {
  const [activePanel, setActivePanel] = useState<
    | "catalog"
    | "pos"
    | "customers"
    | "vouchers"
    | "reports"
    | "profit-loss"
    | "pv"
    | "network"
    | "storefront"
    | "whatsapp"
    | "bonus"
    | "admin"
  >("catalog");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<ProductPage | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...emptyProduct });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [memberBulkPrice, setMemberBulkPrice] = useState("");
  const [retailBulkPrice, setRetailBulkPrice] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ productName: string; rows: PriceHistory[] } | null>(null);
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [stockSummary, setStockSummary] = useState<Array<{ id: string; quantity: number }>>([]);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "" });
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockBatches, setStockBatches] = useState<ProductBatch[]>([]);
  const [stockForm, setStockForm] = useState({ batchCode: "", expiryDate: "", quantity: "", unitCost: "", warehouseId: "" });
  const [fefoQuantity, setFefoQuantity] = useState("");
  const [fefoPlan, setFefoPlan] = useState<FefoAllocation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "x-tenant-id": session.user.tenant.id,
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(
        Array.isArray(result?.message) ? result.message[0] : result?.message ?? "Permintaan belum berhasil."
      );
    }
    return result;
  }

  async function loadCatalog(nextPage = page, nextSearch = search, showDeleted = includeDeleted) {
    const query = new URLSearchParams({
      page: String(nextPage),
      limit: "8",
      search: nextSearch,
      includeDeleted: String(showDeleted),
    });
    const productResult = await api(`/products?${query.toString()}`);
    setProducts(productResult as ProductPage);
  }

  async function loadInventoryPanels() {
    const [categoryResult, warehouseResult, alertResult, stockResult] = await Promise.all([
      api("/categories"),
      api("/warehouses"),
      api("/alerts"),
      api("/inventory/stock"),
    ]);
    setCategories(categoryResult as Category[]);
    setWarehouses(warehouseResult as Warehouse[]);
    setInventoryAlerts(alertResult as InventoryAlert[]);
    setStockSummary(stockResult as Array<{ id: string; quantity: number }>);
  }

  useEffect(() => {
    void Promise.all([loadCatalog(), loadInventoryPanels()]).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "Data produk gagal dimuat.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyProduct });
    setSelectedImage(null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        memberPrice: Number(form.memberPrice),
        retailPrice: Number(form.retailPrice),
        pv: Number(form.pv || 0),
        lowStockLimit: Number(form.lowStockLimit || 0),
      };
      const product = (await api(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      })) as Product;

      if (selectedImage) {
        const upload = (await api("/products/images/presign", {
          method: "POST",
          body: JSON.stringify({
            fileName: selectedImage.name,
            contentType: selectedImage.type,
            size: selectedImage.size,
          }),
        })) as { key: string; uploadUrl: string; publicUrl: string };
        const uploaded = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        if (!uploaded.ok) throw new Error("Gambar gagal diunggah ke storage. Periksa konfigurasi CORS bucket.");
        await api(`/products/${product.id}/images`, {
          method: "POST",
          body: JSON.stringify({ key: upload.key, url: upload.publicUrl, alt: form.name, position: 0 }),
        });
      }
      resetForm();
      setMessage(editingId ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
      await loadCatalog();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    setImportPreview(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api("/products/import/preview", { method: "POST", body: formData });
      setImportPreview(result as ImportPreview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV gagal diperiksa.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function commitImport() {
    if (!importPreview || importPreview.invalidCount > 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const rows = importPreview.rows.map(({ rowNumber: _rowNumber, errors: _errors, ...row }) => row);
      const result = (await api("/products/import/commit", {
        method: "POST",
        body: JSON.stringify({ rows }),
      })) as { importedCount: number };
      setMessage(`${result.importedCount} produk berhasil diimpor.`);
      setImportPreview(null);
      setPage(1);
      await loadCatalog(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function updateBulkPrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProductIds.length) {
      setError("Pilih minimal satu produk untuk mengubah harga.");
      return;
    }
    if (memberBulkPrice === "" && retailBulkPrice === "") {
      setError("Isi harga member, harga retail, atau keduanya.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = (await api("/products/bulk-prices", {
        method: "PATCH",
        body: JSON.stringify({
          productIds: selectedProductIds,
          ...(memberBulkPrice !== "" ? { memberPrice: Number(memberBulkPrice) } : {}),
          ...(retailBulkPrice !== "" ? { retailPrice: Number(retailBulkPrice) } : {}),
        }),
      })) as { updatedCount: number; priceHistoryCount: number };
      setMessage(`Harga ${result.updatedCount} produk diperbarui; riwayat harga tersimpan.`);
      setSelectedProductIds([]);
      setMemberBulkPrice("");
      setRetailBulkPrice("");
      await loadCatalog();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Harga massal gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePriceHistory(product: Product) {
    if (productDetail?.id === product.id) {
      setProductDetail(null);
      setPriceHistory(null);
      return;
    }
    try {
      const [detail, rows] = await Promise.all([
        api(`/products/${product.id}`) as Promise<Product>,
        api(`/products/${product.id}/price-history`) as Promise<PriceHistory[]>,
      ]);
      setProductDetail(detail);
      setPriceHistory({ productName: product.name, rows });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Riwayat harga gagal dimuat.");
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setError("");
    try {
      await api("/categories", { method: "POST", body: JSON.stringify({ name: categoryName }) });
      setCategoryName("");
      await loadInventoryPanels();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kategori gagal dibuat.");
    }
  }

  async function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      memberPrice: String(product.memberPrice),
      retailPrice: String(product.retailPrice),
      pv: String(product.pv),
      isActive: product.isActive,
      lowStockLimit: String(product.lowStockLimit),
    });
    setSelectedImage(null);
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Arsipkan produk “${product.name}”? Produk dapat dipulihkan nanti.`)) return;
    try {
      await api(`/products/${product.id}`, { method: "DELETE" });
      await loadCatalog();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal dihapus.");
    }
  }

  async function restoreProduct(product: Product) {
    try {
      await api(`/products/${product.id}/restore`, { method: "POST" });
      await loadCatalog();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Produk gagal dipulihkan.");
    }
  }

  async function addWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api("/warehouses", { method: "POST", body: JSON.stringify(warehouseForm) });
      setWarehouseForm({ name: "", code: "" });
      await loadInventoryPanels();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gudang gagal dibuat.");
    }
  }

  async function openStock(product: Product) {
    if (stockProduct?.id === product.id) {
      setStockProduct(null);
      setFefoPlan(null);
      return;
    }
    try {
      const batches = (await api(`/products/${product.id}/batches`)) as ProductBatch[];
      setStockProduct(product);
      setStockBatches(batches);
      setFefoPlan(null);
      setStockForm({ batchCode: "", expiryDate: "", quantity: "", unitCost: "", warehouseId: "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Batch produk gagal dimuat.");
    }
  }

  async function receiveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockProduct) return;
    setBusy(true);
    setError("");
    try {
      await api("/inventory/stock-in", {
        method: "POST",
        body: JSON.stringify({
          productId: stockProduct.id,
          batchCode: stockForm.batchCode,
          ...(stockForm.expiryDate ? { expiryDate: stockForm.expiryDate } : {}),
          quantity: Number(stockForm.quantity),
          ...(stockForm.unitCost ? { unitCost: Number(stockForm.unitCost) } : {}),
          ...(stockForm.warehouseId ? { warehouseId: stockForm.warehouseId } : {}),
        }),
      });
      setMessage(`Stok masuk untuk ${stockProduct.name} berhasil dicatat.`);
      setStockForm({ ...stockForm, batchCode: "", expiryDate: "", quantity: "", unitCost: "" });
      const batches = (await api(`/products/${stockProduct.id}/batches`)) as ProductBatch[];
      setStockBatches(batches);
      await Promise.all([loadCatalog(), loadInventoryPanels()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stok masuk gagal dicatat.");
    } finally {
      setBusy(false);
    }
  }

  async function previewFefo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockProduct) return;
    setError("");
    try {
      const result = (await api("/inventory/fefo/preview", {
        method: "POST",
        body: JSON.stringify({ productId: stockProduct.id, quantity: Number(fefoQuantity) }),
      })) as { allocations: FefoAllocation[] };
      setFefoPlan(result.allocations);
    } catch (caught) {
      setFefoPlan(null);
      setError(caught instanceof Error ? caught.message : "Stok tidak cukup untuk simulasi FEFO.");
    }
  }

  async function manageCategory(category: Category) {
    const name = window.prompt("Ubah nama kategori", category.name);
    if (name === null) return;
    try {
      if (!name.trim()) await api(`/categories/${category.id}`, { method: "DELETE" });
      else await api(`/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      await loadInventoryPanels();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kategori gagal diperbarui.");
    }
  }

  const isOwner = session.user.roles.includes("owner");
  const isSuperAdmin = session.user.roles.includes("super_admin");

  type NavItem = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    available: boolean;
    highlight?: boolean;
    isSpecial?: boolean;
  };

  // Navigation Items Definition
  const navItems: Array<{ group: string; items: NavItem[] }> = [
    {
      group: "Operasional",
      items: [
        { id: "catalog", label: "Katalog & Stok", icon: Package, available: true },
        { id: "pos", label: "Terminal Kasir POS", icon: ShoppingCart, available: true, highlight: true },
      ],
    },
    {
      group: "Member & Jaringan",
      items: [
        { id: "customers", label: "Pelanggan & Member", icon: Users, available: true },
        { id: "network", label: "Jaringan HNI", icon: GitFork, available: isOwner },
        { id: "bonus", label: "Bonus & Leaderboard", icon: Award, available: isOwner },
      ],
    },
    {
      group: "Keuangan & Laporan",
      items: [
        { id: "reports", label: "Laporan Penjualan", icon: BarChart3, available: isOwner },
        { id: "profit-loss", label: "Laba Rugi (P&L)", icon: TrendingUp, available: isOwner },
        { id: "pv", label: "Rekap PV Bulanan", icon: FileSpreadsheet, available: isOwner },
      ],
    },
    {
      group: "Pemasaran & Integrasi",
      items: [
        { id: "vouchers", label: "Voucher Promo", icon: Ticket, available: isOwner },
        { id: "storefront", label: "Katalog Publik", icon: Store, available: isOwner },
        { id: "whatsapp", label: "Log WhatsApp", icon: MessageSquare, available: isOwner },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            group: "Administrasi Platform",
            items: [{ id: "admin", label: "Platform Admin", icon: ShieldAlert, available: true, isSpecial: true }],
          },
        ]
      : []),
  ];

  return (
    <div className="app-shell min-h-screen bg-slate-50">
      {/* Top Application Bar */}
      <header className="app-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 font-extrabold text-white shadow-sm">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 text-base">HNI POS</span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  {session.user.tenant.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                {session.user.tenant.name}
              </p>
            </div>
          </div>
        </div>

        {/* Action Center in Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activePanel !== "pos" && (
            <button
              onClick={() => setActivePanel("pos")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
              type="button"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Buka Terminal POS</span>
            </button>
          )}

          {/* Token & Session pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Sesi: {Math.floor(session.expiresIn / 60)} mnt</span>
            <button
              onClick={onCopyToken}
              className="ml-1 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition"
              type="button"
              title="Salin JSON Web Token"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Tersalin" : "JWT"}</span>
            </button>
          </div>

          {/* User profile dropdown info */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800 leading-none">{session.user.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {session.user.roles.includes("owner") ? "Pemilik Toko" : session.user.roles.join(", ")}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-200">
              {session.user.name.slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Keluar dari akun"
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? "block" : "hidden"
          } md:block app-sidebar`}
        >
          <div className="space-y-6">
            {navItems.map((group, groupIdx) => {
              const visibleItems = group.items.filter((item) => item.available);
              if (!visibleItems.length) return null;

              return (
                <div key={groupIdx} className="space-y-1">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {group.group}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePanel === item.id;

                      let itemClasses =
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition";
                      if (isActive) {
                        itemClasses += " bg-emerald-700 text-white shadow-sm";
                      } else if (item.isSpecial) {
                        itemClasses += " text-amber-700 hover:bg-amber-50";
                      } else {
                        itemClasses += " text-slate-600 hover:bg-slate-100 hover:text-slate-900";
                      }

                      return (
                        <button
                          key={item.id}
                          className={itemClasses}
                          onClick={() => {
                            setActivePanel(item.id as typeof activePanel);
                            setMobileMenuOpen(false);
                          }}
                          type="button"
                        >
                          <Icon className={`h-4 w-4 ${isActive ? "text-white" : item.isSpecial ? "text-amber-600" : "text-slate-500"}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={onSwitchAccount}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              type="button"
            >
              <UserCheck className="h-4 w-4 text-slate-400" />
              <span>Ganti Akun Toko</span>
            </button>
            <div className="px-3 py-1.5 rounded-md bg-slate-50 text-[10px] text-slate-600 font-mono">
              Tenant: {session.user.tenant.slug}
            </div>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="app-main">
          {globalError && (
            <div className="feedback error mb-4">
              <AlertTriangle className="h-4 w-4" />
              <span>{globalError}</span>
            </div>
          )}

          {/* SUBPANEL VIEWS */}
          {activePanel === "pos" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Terminal Kasir POS</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <PosTerminal session={session} />
            </div>
          )}

          {activePanel === "customers" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Pelanggan & Member</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePanel("pos")}
                    className="button button-secondary text-xs"
                    type="button"
                  >
                    Buka Terminal POS
                  </button>
                  <button
                    onClick={() => setActivePanel("catalog")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                    type="button"
                  >
                    ← Kembali ke Katalog
                  </button>
                </div>
              </div>
              <CustomersPanel session={session} />
            </div>
          )}

          {activePanel === "vouchers" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Voucher Toko</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePanel("pos")}
                    className="button button-secondary text-xs"
                    type="button"
                  >
                    Buka Terminal POS
                  </button>
                  <button
                    onClick={() => setActivePanel("catalog")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                    type="button"
                  >
                    ← Kembali ke Katalog
                  </button>
                </div>
              </div>
              <VouchersPanel session={session} />
            </div>
          )}

          {activePanel === "reports" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Laporan Penjualan</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <ReportsPanel session={session} />
            </div>
          )}

          {activePanel === "profit-loss" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3 pnl-screen-only">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Laba Rugi (P&L)</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <ProfitLossPanel session={session} />
            </div>
          )}

          {activePanel === "pv" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Rekap PV Bulanan</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <PvReportPanel session={session} />
            </div>
          )}

          {activePanel === "network" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Jaringan HNI</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <NetworkPanel session={session} />
            </div>
          )}

          {activePanel === "storefront" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Katalog Publik & WhatsApp</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <StorefrontPanel session={session} />
            </div>
          )}

          {activePanel === "whatsapp" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Log Pengiriman WhatsApp</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <WhatsAppLogsPanel session={session} />
            </div>
          )}

          {activePanel === "bonus" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-slate-800">Bonus & Leaderboard</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <BonusPanel session={session} />
            </div>
          )}

          {activePanel === "admin" && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button onClick={() => setActivePanel("catalog")} className="hover:text-emerald-700 font-medium">
                    Dashboard
                  </button>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-bold text-amber-700">Platform Super Admin</span>
                </div>
                <button
                  onClick={() => setActivePanel("catalog")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                  type="button"
                >
                  ← Kembali ke Katalog
                </button>
              </div>
              <SuperAdminPanel session={session} />
            </div>
          )}

          {/* MAIN CATALOG & INVENTORY PANEL */}
          {activePanel === "catalog" && (
            <div className="catalog-dashboard space-y-6">
              {/* Header Info */}
              <div className="catalog-heading">
                <div>
                  <span className="dashboard-label">MASTER DATA & INVENTARIS</span>
                  <h3>Katalog Produk Toko</h3>
                  <p>Kelola katalog barang, penetapan harga member & retail, multi-gudang, dan batch FEFO.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="product-count">
                    <Box className="h-3.5 w-3.5" />
                    {products?.total ?? 0} Produk Terdaftar
                  </span>
                  <button
                    onClick={() => {
                      resetForm();
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    className="button button-primary text-xs"
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Produk
                  </button>
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

              {/* Alert Stok & Kedaluwarsa */}
              <section className="catalog-panel alert-panel">
                <div className="section-title">
                  <div>
                    <span className="dashboard-label">PANTAUAN OTOMATIS</span>
                    <h4>Alert Stok Menipis & Kedaluwarsa</h4>
                  </div>
                  <span className={inventoryAlerts.length ? "alert-count has-alert" : "alert-count"}>
                    {inventoryAlerts.length}
                  </span>
                </div>
                {inventoryAlerts.length ? (
                  <ul className="alert-list">
                    {inventoryAlerts.map((alert) => (
                      <li key={alert.id}>
                        <span className={alert.kind === "EXPIRY" ? "alert-mark expiry-mark" : "alert-mark"}>
                          {alert.kind === "EXPIRY" ? "!" : "↓"}
                        </span>
                        <span>
                          <strong>{alert.kind === "EXPIRY" ? "Segera Kedaluwarsa" : "Stok Menipis"}</strong>
                          <small>{alert.message}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-note text-slate-500">
                    Semua stok dalam batas aman. Belum ada batch yang kedaluwarsa dalam 30 hari ke depan.
                  </p>
                )}
              </section>

              {/* Grid 2 Kolom: Multi-Gudang & Kategori */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Gudang */}
                <section className="catalog-panel">
                  <div className="section-title">
                    <div>
                      <div className="flex items-center gap-2">
                        <WarehouseIcon className="h-4 w-4 text-emerald-700" />
                        <h4>Multi-Gudang</h4>
                      </div>
                      <span className="field-hint">Stok dan batch disimpan per gudang.</span>
                    </div>
                  </div>
                  <form className="category-add mb-3" onSubmit={addWarehouse}>
                    <input
                      aria-label="Nama gudang"
                      maxLength={100}
                      placeholder="Nama gudang"
                      value={warehouseForm.name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                      required
                    />
                    <input
                      aria-label="Kode gudang"
                      maxLength={24}
                      placeholder="KODE"
                      className="w-24"
                      value={warehouseForm.code}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                      required
                    />
                    <button className="button button-secondary" type="submit">
                      Tambah
                    </button>
                  </form>
                  <div className="category-list">
                    {warehouses.length ? (
                      warehouses.map((warehouse) => (
                        <span className="category-chip" key={warehouse.id}>
                          <Building2 className="h-3 w-3 text-emerald-600" />
                          {warehouse.name} · {warehouse.code}
                          {warehouse.isDefault ? " · utama" : ""}
                        </span>
                      ))
                    ) : (
                      <span className="empty-note">Gudang utama akan dibuat otomatis saat stok pertama diterima.</span>
                    )}
                  </div>
                </section>

                {/* Kategori */}
                <section className="catalog-panel">
                  <div className="section-title">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-700" />
                        <h4>Kategori Produk</h4>
                      </div>
                      <span className="field-hint">Kelompokkan produk herbal, kosmetik, atau suplemen.</span>
                    </div>
                  </div>
                  <form className="category-add mb-3" onSubmit={addCategory}>
                    <input
                      aria-label="Nama kategori baru"
                      maxLength={80}
                      placeholder="Nama kategori baru"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                    />
                    <button className="button button-secondary" type="submit">
                      Tambah
                    </button>
                  </form>
                  <div className="category-list">
                    {categories.length ? (
                      categories.map((category) => (
                        <button
                          key={category.id}
                          className="category-chip"
                          onClick={() => void manageCategory(category)}
                          type="button"
                          title="Klik untuk ubah nama atau hapus jika kosong"
                        >
                          {category.name}
                          <span className="text-slate-400">⋯</span>
                        </button>
                      ))
                    ) : (
                      <span className="empty-note">Belum ada kategori yang ditambahkan.</span>
                    )}
                  </div>
                  <p className="field-hint mt-2 text-[10px]">
                    Klik nama kategori untuk mengubah namanya. Kosongkan nama untuk menghapusnya.
                  </p>
                </section>
              </div>

              {/* Grid 2 Kolom: Impor CSV & Ubah Harga Massal */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Impor CSV */}
                <section className="catalog-panel">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-emerald-700" />
                    <h4>Import Produk dari CSV</h4>
                  </div>
                  <p className="field-hint mb-3">
                    Header wajib: <code>name</code>, <code>sku</code>, <code>memberPrice</code>, <code>retailPrice</code>. Opsional: <code>barcode</code>, <code>description</code>, <code>category</code>, <code>pv</code>.
                  </p>
                  <label className="csv-picker cursor-pointer inline-flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-3 hover:bg-emerald-50 transition">
                    <Upload className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-800">Pilih File CSV</span>
                    <input accept=".csv,text/csv" type="file" className="hidden" onChange={previewImport} />
                  </label>

                  {importPreview && (
                    <div className="import-preview mt-3 pt-3 border-t">
                      <div className="section-title">
                        <strong>
                          {importPreview.validCount} valid · {importPreview.invalidCount} bermasalah · {importPreview.total} baris
                        </strong>
                        <button
                          className="button button-primary"
                          disabled={busy || importPreview.invalidCount > 0}
                          onClick={() => void commitImport()}
                          type="button"
                        >
                          Import {importPreview.validCount} produk
                        </button>
                      </div>
                      {importPreview.invalidCount > 0 && (
                        <div className="import-errors">
                          {importPreview.rows
                            .filter((row) => row.errors.length)
                            .slice(0, 8)
                            .map((row) => (
                              <p key={row.rowNumber}>
                                Baris {row.rowNumber}: {row.errors.join(" ")}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Ubah Harga Massal */}
                <section className="catalog-panel">
                  <div className="section-title">
                    <div>
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-emerald-700" />
                        <h4>Ubah Harga Massal</h4>
                      </div>
                      <span className="field-hint">Centang produk pada tabel di bawah untuk menerapkan harga.</span>
                    </div>
                    <strong className="selected-count rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 border border-emerald-200">
                      {selectedProductIds.length} dipilih
                    </strong>
                  </div>
                  <form className="bulk-price-form" onSubmit={updateBulkPrices}>
                    <label>
                      Harga member baru
                      <input
                        min="0"
                        step="1"
                        type="number"
                        value={memberBulkPrice}
                        onChange={(e) => setMemberBulkPrice(e.target.value)}
                        placeholder="Kosongkan jika tetap"
                      />
                    </label>
                    <label>
                      Harga retail baru
                      <input
                        min="0"
                        step="1"
                        type="number"
                        value={retailBulkPrice}
                        onChange={(e) => setRetailBulkPrice(e.target.value)}
                        placeholder="Kosongkan jika tetap"
                      />
                    </label>
                    <button
                      className="button button-secondary"
                      disabled={busy || !selectedProductIds.length}
                      type="submit"
                    >
                      Terapkan Perubahan
                    </button>
                  </form>
                </section>
              </div>

              {/* Form Tambah / Edit Produk */}
              <section className="catalog-panel border-emerald-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-emerald-700" />
                    <h4>{editingId ? "Edit Produk Terdaftar" : "Tambah Produk Baru"}</h4>
                  </div>
                  {editingId && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                      Sedang mengedit produk
                    </span>
                  )}
                </div>

                <form className="product-form" onSubmit={saveProduct}>
                  <label>
                    Nama produk
                    <input
                      required
                      maxLength={160}
                      placeholder="Contoh: Minyak Herba Sinergi"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label>
                    SKU (Kode Unik)
                    <input
                      required
                      maxLength={64}
                      placeholder="Contoh: HNI-MHS-100"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </label>
                  <label>
                    Kategori
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    >
                      <option value="">Tanpa kategori</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Harga member (Rp)
                    <input
                      required
                      min="0"
                      step="1"
                      type="number"
                      placeholder="35000"
                      value={form.memberPrice}
                      onChange={(e) => setForm({ ...form, memberPrice: e.target.value })}
                    />
                  </label>
                  <label>
                    Harga retail (Rp)
                    <input
                      required
                      min="0"
                      step="1"
                      type="number"
                      placeholder="45000"
                      value={form.retailPrice}
                      onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                    />
                  </label>
                  <label>
                    Point Value (PV)
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      placeholder="10"
                      value={form.pv}
                      onChange={(e) => setForm({ ...form, pv: e.target.value })}
                    />
                  </label>
                  <label>
                    Batas minimum stok
                    <input
                      min="0"
                      step="1"
                      type="number"
                      value={form.lowStockLimit}
                      onChange={(e) => setForm({ ...form, lowStockLimit: e.target.value })}
                    />
                    <span className="field-hint">Pemberitahuan aktif saat stok di bawah angka ini.</span>
                  </label>
                  <label>
                    Barcode (Opsional)
                    <input
                      maxLength={64}
                      placeholder="Scan atau ketik barcode fisik"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    />
                  </label>
                  <label>
                    Foto produk
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      type="file"
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSelectedImage(e.target.files?.[0] ?? null)
                      }
                    />
                    <span className="field-hint">JPEG, PNG, WebP · maksimal 10 MB</span>
                  </label>
                  <label className="wide-field">
                    Deskripsi produk
                    <textarea
                      maxLength={2000}
                      rows={2}
                      placeholder="Keterangan khasiat, aturan pakai, atau catatan produk..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span className="font-semibold text-slate-700">Produk aktif dijual di kasir & katalog</span>
                  </label>
                  <div className="form-actions">
                    <button className="button button-primary" disabled={busy} type="submit">
                      {busy ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Tambah Produk"}
                    </button>
                    {editingId && (
                      <button className="button button-secondary" onClick={resetForm} type="button">
                        Batal Edit
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Tabel Daftar Produk */}
              <section className="catalog-panel">
                <div className="section-title">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-700" />
                    <h4>Daftar Inventaris Produk</h4>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        className="search-input pl-9"
                        aria-label="Cari produk"
                        placeholder="Cari nama, SKU, barcode…"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                          void loadCatalog(1, e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <label className="archive-filter inline-flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIncludeDeleted(checked);
                      setPage(1);
                      setSelectedProductIds([]);
                      void loadCatalog(1, search, checked);
                    }}
                  />
                  <span>Tampilkan produk yang diarsipkan</span>
                </label>

                <div className="product-table-wrap">
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th className="w-10">Pilih</th>
                        <th>Produk</th>
                        <th>Kategori</th>
                        <th>Total Stok</th>
                        <th>Harga Member</th>
                        <th>Harga Retail</th>
                        <th>PV</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products?.items.map((product) => {
                        const stockQty = stockSummary.find((row) => row.id === product.id)?.quantity ?? 0;
                        const isLowStock = stockQty <= product.lowStockLimit;

                        return (
                          <tr key={product.id}>
                            <td>
                              <input
                                aria-label={`Pilih ${product.name}`}
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                disabled={Boolean(product.deletedAt)}
                                onChange={(e) =>
                                  setSelectedProductIds((current) =>
                                    e.target.checked
                                      ? [...current, product.id]
                                      : current.filter((id) => id !== product.id)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <div className="product-cell">
                                {product.images[0] ? (
                                  <Image
                                    src={product.images[0].url}
                                    alt={product.images[0].alt ?? product.name}
                                    width={38}
                                    height={38}
                                    className="rounded-lg object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <span className="product-placeholder">
                                    {product.name.slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                <span>
                                  <strong>{product.name}</strong>
                                  <small>SKU: {product.sku}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              {product.category?.name ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                                  {product.category.name}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`font-bold ${
                                  stockQty <= 0
                                    ? "text-red-600"
                                    : isLowStock
                                    ? "text-amber-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {stockQty} unit
                              </span>
                            </td>
                            <td className="font-semibold text-slate-800">
                              Rp {Number(product.memberPrice).toLocaleString("id-ID")}
                            </td>
                            <td className="font-semibold text-slate-800">
                              Rp {Number(product.retailPrice).toLocaleString("id-ID")}
                            </td>
                            <td className="font-medium text-emerald-800">
                              {Number(product.pv).toLocaleString("id-ID")}
                            </td>
                            <td>
                              <span
                                className={
                                  product.deletedAt
                                    ? "status-inactive"
                                    : product.isActive
                                    ? "status-active"
                                    : "status-inactive"
                                }
                              >
                                {product.deletedAt ? "Diarsipkan" : product.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td>
                              {product.deletedAt ? (
                                <button
                                  className="row-action"
                                  onClick={() => void restoreProduct(product)}
                                  type="button"
                                >
                                  Pulihkan
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    className="row-action"
                                    onClick={() => void editProduct(product)}
                                    type="button"
                                    title="Edit Produk"
                                  >
                                    <Edit3 className="h-3 w-3 inline mr-1" />
                                    Edit
                                  </button>
                                  <button
                                    className="row-action"
                                    onClick={() => void togglePriceHistory(product)}
                                    type="button"
                                    title="Detail & Riwayat Harga"
                                  >
                                    <Eye className="h-3 w-3 inline mr-1" />
                                    Detail
                                  </button>
                                  <button
                                    className="row-action"
                                    onClick={() => void openStock(product)}
                                    type="button"
                                    title="Kelola Batch Stok FEFO"
                                  >
                                    <WarehouseIcon className="h-3 w-3 inline mr-1" />
                                    Stok / Batch
                                  </button>
                                  <button
                                    className="row-action danger-action"
                                    onClick={() => void removeProduct(product)}
                                    type="button"
                                    title="Arsipkan Produk"
                                  >
                                    <Trash2 className="h-3 w-3 inline" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {products && products.items.length === 0 && (
                        <tr>
                          <td className="empty-table" colSpan={9}>
                            Belum ada produk yang cocok dengan pencarian atau filter Anda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Batch & FEFO Panel (Modal / Card) */}
                {stockProduct && (
                  <div className="price-history inventory-detail mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <div className="section-title">
                      <div>
                        <span className="dashboard-label">BATCH & KEDALUWARSA (FEFO)</span>
                        <h4 className="text-emerald-900 font-bold">Stok & Batch: {stockProduct.name}</h4>
                      </div>
                      <button className="text-button" onClick={() => setStockProduct(null)} type="button">
                        Tutup Panel
                      </button>
                    </div>

                    <form className="stock-in-form bg-white p-4 rounded-lg border" onSubmit={receiveStock}>
                      <label>
                        Kode batch
                        <input
                          required
                          maxLength={80}
                          placeholder="Contoh: BATCH-2026-001"
                          value={stockForm.batchCode}
                          onChange={(e) => setStockForm({ ...stockForm, batchCode: e.target.value })}
                        />
                      </label>
                      <label>
                        Tanggal kedaluwarsa
                        <input
                          type="date"
                          value={stockForm.expiryDate}
                          onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })}
                        />
                      </label>
                      <label>
                        Jumlah masuk (Unit)
                        <input
                          required
                          min="0.01"
                          step="0.01"
                          type="number"
                          placeholder="50"
                          value={stockForm.quantity}
                          onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                        />
                      </label>
                      <label>
                        Harga pokok / unit (HPP)
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          placeholder="25000"
                          value={stockForm.unitCost}
                          onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })}
                        />
                      </label>
                      <label>
                        Gudang penempatan
                        <select
                          value={stockForm.warehouseId}
                          onChange={(e) => setStockForm({ ...stockForm, warehouseId: e.target.value })}
                        >
                          <option value="">Gudang utama</option>
                          {warehouses.map((warehouse) => (
                            <option value={warehouse.id} key={warehouse.id}>
                              {warehouse.name} ({warehouse.code})
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="button button-primary" disabled={busy} type="submit">
                        {busy ? "Menyimpan…" : "Catat Stok Masuk"}
                      </button>
                    </form>

                    <div className="product-table-wrap bg-white mt-4">
                      <table className="product-table">
                        <thead>
                          <tr>
                            <th>Batch Code</th>
                            <th>Gudang</th>
                            <th>Kedaluwarsa</th>
                            <th>Sisa Stok</th>
                            <th>Harga Pokok (HPP)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockBatches.map((batch) => (
                            <tr key={batch.id}>
                              <td className="font-mono font-bold text-slate-800">{batch.batchCode}</td>
                              <td>{batch.warehouse.name}</td>
                              <td>
                                {batch.expiryDate ? (
                                  <span className="font-semibold text-slate-700">
                                    {new Date(batch.expiryDate).toLocaleDateString("id-ID")}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Tanpa tanggal</span>
                                )}
                              </td>
                              <td className="font-bold text-emerald-700">
                                {Number(batch.quantity).toLocaleString("id-ID")} unit
                              </td>
                              <td>
                                {batch.unitCost
                                  ? `Rp ${Number(batch.unitCost).toLocaleString("id-ID")}`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                          {stockBatches.length === 0 && (
                            <tr>
                              <td className="empty-table" colSpan={5}>
                                Belum ada batch stok tercatat untuk produk ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <form className="fefo-form mt-4" onSubmit={previewFefo}>
                      <label>
                        Simulasi alokasi FEFO · jumlah
                        <input
                          required
                          min="0.01"
                          step="0.01"
                          type="number"
                          placeholder="Jumlah pesanan"
                          value={fefoQuantity}
                          onChange={(e) => setFefoQuantity(e.target.value)}
                        />
                      </label>
                      <button className="button button-secondary" type="submit">
                        Lihat Alokasi FEFO
                      </button>
                    </form>

                    {fefoPlan && (
                      <ol className="fefo-plan">
                        {fefoPlan.map((item) => (
                          <li key={item.batchId}>
                            Batch <strong>{item.batchCode}</strong>: {Number(item.quantity).toLocaleString("id-ID")} unit
                            {item.expiryDate
                              ? ` · Kedaluwarsa: ${new Date(item.expiryDate).toLocaleDateString("id-ID")}`
                              : " · Tanpa tanggal kedaluwarsa"}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Detail & Price History */}
                {productDetail && (
                  <div className="price-history mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <h4>Detail Produk & Riwayat Harga: {productDetail.name}</h4>
                      <button className="text-button" onClick={() => setProductDetail(null)} type="button">
                        Tutup
                      </button>
                    </div>
                    <div className="detail-grid">
                      <span>
                        SKU<strong>{productDetail.sku}</strong>
                      </span>
                      <span>
                        Barcode<strong>{productDetail.barcode ?? "—"}</strong>
                      </span>
                      <span>
                        Kategori<strong>{productDetail.category?.name ?? "—"}</strong>
                      </span>
                      <span>
                        PV Member<strong>{Number(productDetail.pv).toLocaleString("id-ID")}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border mb-4">
                      {productDetail.description || "Tidak ada deskripsi produk."}
                    </p>

                    <h4 className="mb-2 text-sm font-bold text-slate-800">Riwayat Perubahan Harga</h4>
                    {priceHistory?.rows.length ? (
                      <div className="product-table-wrap bg-white">
                        <table className="product-table">
                          <thead>
                            <tr>
                              <th>Waktu</th>
                              <th>Member Sebelumnya</th>
                              <th>Member Baru</th>
                              <th>Retail Sebelumnya</th>
                              <th>Retail Baru</th>
                              <th>Sumber</th>
                            </tr>
                          </thead>
                          <tbody>
                            {priceHistory.rows.map((row) => (
                              <tr key={row.id}>
                                <td>{new Date(row.createdAt).toLocaleString("id-ID")}</td>
                                <td>Rp {Number(row.previousMemberPrice).toLocaleString("id-ID")}</td>
                                <td className="font-bold text-emerald-700">
                                  Rp {Number(row.memberPrice).toLocaleString("id-ID")}
                                </td>
                                <td>Rp {Number(row.previousRetailPrice).toLocaleString("id-ID")}</td>
                                <td className="font-bold text-slate-800">
                                  Rp {Number(row.retailPrice).toLocaleString("id-ID")}
                                </td>
                                <td>{row.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="empty-note text-slate-500">Belum ada riwayat perubahan harga tercatat.</p>
                    )}
                  </div>
                )}

                {/* Pagination */}
                <div className="pagination">
                  <span>
                    Menampilkan {products?.items.length ?? 0} dari {products?.total ?? 0} produk · Halaman{" "}
                    {products?.page ?? 1} dari {Math.max(products?.totalPages ?? 0, 1)}
                  </span>
                  <div>
                    <button
                      className="button button-secondary"
                      disabled={page <= 1}
                      onClick={() => {
                        const next = page - 1;
                        setPage(next);
                        void loadCatalog(next);
                      }}
                      type="button"
                    >
                      Sebelumnya
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={!products || page >= products.totalPages}
                      onClick={() => {
                        const next = page + 1;
                        setPage(next);
                        void loadCatalog(next);
                      }}
                      type="button"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
