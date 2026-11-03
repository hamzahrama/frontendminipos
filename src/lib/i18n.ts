/**
 * Localization strings for frontend HNI POS.
 *
 * `id` is the default and the single source of truth for the dictionary shape.
 * `en` is a full-shape overlay that spreads `id` and translates the
 * unauthenticated (auth/intro) surface. Any key not translated in `en` safely
 * falls back to Indonesian, so a missing translation can never produce
 * `undefined` in the UI.
 */

const id = {
  // Auth
  auth: {
    login: "Masuk ke toko",
    register: "Daftarkan toko Baru",
    loginDesc: "Masukkan akun kasir/pemilik dan slug toko Anda.",
    registerDesc: "Buat ruang kerja toko dan akun pemilik dalam hitungan detik.",
    processing: "Memproses…",
    logout: "Keluar",
    logoutTitle: "Keluar dari akun",
    switching: "Ganti Akun",
    successLogin: "Berhasil masuk.",
    successRegister: "Toko dan akun pemilik berhasil dibuat.",
    sessionExpired: "Sesi berakhir. Silakan masuk kembali.",
    copyToken: "Salin JSON Web Token",
    tokenCopied: "Token disalin ke clipboard.",
    tokenCopyFailed: "Browser tidak mengizinkan menyalin token. Anda tetap bisa memakai respons API.",
    tabLogin: "Masuk",
    tabRegister: "Daftar toko",
    securityNote: "Koneksi aman terenkripsi & password disimpan dalam hash standar industri.",
  },

  // Form fields
  form: {
    email: "Email",
    password: "Password",
    minPassword: "Minimal 8 karakter",
    tenantName: "Nama Toko",
    tenantSlug: "Slug Toko",
    slugHint: "Slug toko unik yang diberikan saat pendaftaran.",
    ownerName: "Nama Pemilik Toko",
    exampleTenantName: "Contoh: Toko Herbal Barokah",
    exampleSlug: "contoh: toko-sehat-ibu",
    exampleEmail: "nama@email.com",
  },

  // Sidebar menu
  menu: {
    operasional: "Operasional",
    memberJaringan: "Member & Jaringan",
    keuanganLaporan: "Keuangan & Laporan",
    pemasaranIntegrasi: "Pemasaran & Integrasi",
    administrasi: "Administrasi Platform",

    catalog: "Katalog & Stok",
    pos: "Terminal Kasir POS",
    customer: "Pelanggan & Member",
    network: "Jaringan HNI",
    bonus: "Bonus & Leaderboard",
    reports: "Laporan Penjualan",
    profitLoss: "Laba Rugi (P&L)",
    pv: "Rekap PV Bulanan",
    billing: "Langganan & Billing",
    vouchers: "Voucher Promo",
    storefront: "Katalog Publik",
    whatsapp: "Log WhatsApp",
    admin: "Platform Admin",
  },

  // Catalog/Product
  product: {
    title: "Daftar Inventaris Produk",
    addNew: "Tambah Produk Baru",
    edit: "Edit Produk Terdaftar",
    details: "Detail Produk & Riwayat Harga",
    archive: "Arsipkan Produk",
    priceHistory: "Riwayat Perubahan Harga",
    fefoStock: "Kelola Batch Stok FEFO",

    name: "Nama Produk",
    sku: "SKU",
    barcode: "Barcode",
    description: "Deskripsi/Keterangan",
    category: "Kategori",
    memberPrice: "Harga Member",
    retailPrice: "Harga Retail",
    pv: "PV (Point Value)",
    lowStockLimit: "Batas Stok Minimum",

    exampleName: "Contoh: Minyak Herba Sinergi",
    exampleSku: "Contoh: HNI-MHS-100",
    exampleBarcode: "Scan atau ketik barcode fisik",
    exampleNotes: "Keterangan khasiat, aturan pakai, atau catatan produk...",
    exampleBatch: "Contoh: BATCH-2026-001",

    import: "Impor Produk",
    importFile: "Pilih File CSV",
    bulkPrice: "Ubah Harga Massal",
    selectMinOne: "Pilih minimal satu produk untuk mengubah harga.",
    fillPrice: "Isi harga member, harga retail, atau keduanya.",

    warehouse: "Gudang",
    warehouseCode: "Kode Gudang",
    warehouseName: "Nama Gudang",
    newCategory: "Nama Kategori Baru",
    editCategory: "Ubah nama kategori",
    selectCategory: "Pilih Kategori",

    successAdd: "Produk berhasil ditambahkan.",
    successUpdate: "Produk berhasil diperbarui.",
    successDelete: "Produk gagal dihapus.",
    successRestore: "Produk gagal dipulihkan.",
    successPriceUpdate: "Harga massal berhasil diperbarui.",

    failLoad: "Data produk gagal dimuat.",
    failSave: "Produk gagal disimpan.",
    failDelete: "Produk gagal dihapus.",
    failCategory: "Kategori gagal dibuat.",
    failCategoryUpdate: "Kategori gagal diperbarui.",
    failWarehouse: "Gudang gagal dibuat.",
    failImport: "Import gagal disimpan.",
    failCSV: "CSV gagal diperiksa.",
    failBatch: "Batch produk gagal dimuat.",
  },

  // POS
  pos: {
    title: "Terminal Kasir POS",
    selectProduct: "Pilih Produk",
    cart: "Keranjang Masih Kosong",
    cartEmpty: "Keranjang masih kosong. Pilih produk di sebelah kiri.",
    search: "Cari nama, SKU, barcode…",
    filterCategory: "Filter kategori",
    memberMode: "Mode Member",
    nonMember: "Non-Member",
    customer: "Pelanggan",
    customerName: "Nama Lengkap",
    discount: "Diskon",
    voucher: "Kode Voucher",
    cash: "Uang Tunai",
    checkout: "Selesaikan Pembayaran (Ctrl+Enter)",
    checkingOut: "Menyimpan Transaksi…",
    hold: "Tahan Pesanan",
    resume: "Lanjutkan",
    receipt: "Struk",
    printReceipt: "Cetak Struk",
    sendWA: "Kirim WA",
    sendingWA: "Mengirim…",
    quickAddCustomer: "Tambah Customer Baru",
    order: "Pesanan",
    totalPV: "Total PV",
    change: "Kembalian",
    offline: "Offline - Antri Transaksi",
    online: "Online",
    waitingSync: "Tunggu sinkronisasi…",
  },

  // Billing
  billing: {
    title: "Langganan & Billing",
    currentPlan: "Paket Saat Ini",
    active: "Paket Aktif",
    select: "Pilih",
    renewal: "Perpanjangan",
    lastPayment: "Pembayaran Terakhir",
    perMonth: "/bulan",
    free: "Gratis",
    features: {
      whatsapp: "Gateway WhatsApp",
      reports: "Laporan Lengkap",
      publicCatalog: "Katalog Publik",
      bonusSimulator: "Simulator Komisi",
      offlineSync: "Sinkronisasi Offline",
    },
    paymentSuccess: "Pembayaran berhasil!",
    paymentPending: "Pembayaran sedang diproses...",
    paymentFailed: "Pembayaran dibatalkan",
    chargeFailed: "Charge gagal",
    statusFailed: "Gagal memuat status",
    loadingStatus: "Memuat status langganan...",
  },

  // Reports
  reports: {
    title: "Laporan Penjualan",
    loading: "Memuat…",
    applyFilter: "Terapkan Filter",
    range: "Rentang Tanggal",
    download: "Unduh",
    dailyRevenue: "Omzet Harian",
    totalTx: "Total Transaksi",
    avgBasket: "Rata-rata Basket",
    failLoad: "Laporan gagal dimuat.",
  },

  // Network
  network: {
    title: "Jaringan HNI",
    downline: "Downline",
    downlineName: "Nama Downline",
    addDownline: "Tambah Downline",
    selectUpline: "Pilih Upline",
    failLoad: "Jaringan gagal dimuat.",
    failSave: "Downline gagal disimpan.",
  },

  // Customers
  customers: {
    title: "Pelanggan & Member",
    add: "Tambah Customer",
    edit: "Edit Customer",
    save: "Simpan Perubahan",
    saving: "Menyimpan…",
    viewProfile: "Lihat Profil & Transaksi",
    member: "Member",
    nonMember: "Non-Member",
    successAdd: "Customer baru berhasil ditambahkan.",
    successUpdate: "Data customer berhasil diperbarui.",
    successDelete: "Data customer berhasil dihapus.",
    failLoad: "Customer gagal dimuat.",
    failSave: "Customer gagal disimpan.",
    failDelete: "Customer gagal dihapus.",
  },

  // Bonus
  bonus: {
    title: "Bonus & Leaderboard",
    simulator: "Simulator Komisi",
    leaderboard: "Papan Peringkat",
    scheme: "Skema Bonus",
    newValue: "Nilai PV Baru",
    afterScenario: "Setelah Skenario Terwujud",
    jsonError: "Format JSON skema tidak valid.",
    failLoad: "Data bonus gagal dimuat.",
  },

  // Admin
  admin: {
    title: "Platform Super Admin",
    tenantList: "Daftar Tenant",
    viewDetail: "Lihat Detail Tenant",
    suspend: "Nonaktifkan",
    activate: "Aktifkan",
    cannotSuspendSelf: "Anda tidak dapat menangguhkan tenant Anda sendiri.",
    failLoad: "Gagal memuat data super admin.",
  },

  // Offline
  offline: {
    online: "Online",
    offline: "Offline - Mode Antri",
    snapshot: "Snapshot Produk",
    syncQueue: "Sinkronisasi Antrian",
    queueMsg: "Transaksi tertunda di antri offline.",
    loadingSnapshot: "Memuat snapshot produk...",
    snapshotFailed: "Snapshot fetch gagal",
    syncFailed: "Sinkronisasi gagal",
  },

  // Alerts
  alerts: {
    lowStock: "Stok Menipis",
    expiry: "Segera Kedaluwarsa",
    urgentExpiry: "Segera Kedaluwarsa",
  },

  // Intro Panel
  intro: {
    ariaLabel: "Tentang HNI POS",
    ecosystem: "HNI POS ECOSYSTEM",
    title: "Kelola toko & jaringan lebih tenang.",
    description: "Platform modern untuk menata penjualan kasir, stok multi-gudang FEFO, rekapitulasi PV member, dan laporan keuangan toko HNI Anda.",
    portal: "PORTAL MASUK",
    features: {
      memberPOS: "Kasir POS Cepat dengan Mode Member & Diskon",
      monthlyPVReport: "Rekap PV Bulanan & Silsilah Jaringan Otomatis",
      fefoManagement: "Manajemen Batch FEFO & Alert Kedaluwarsa",
      digitalReceipt: "Cetak Struk Digital & Kirim via WhatsApp",
    },
    status: {
      ready: "Sistem Operasional Siap Digunakan",
    },
  },

  // Common
  common: {
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    edit: "Edit",
    add: "Tambah",
    remove: "Hapus",
    search: "Cari",
    filter: "Saring",
    sort: "Urut",
    export: "Ekspor",
    import: "Impor",
    download: "Unduh",
    upload: "Unggah",
    close: "Tutup",
    loading: "Memuat…",
    error: "Kesalahan",
    success: "Berhasil",
    warning: "Peringatan",
    info: "Informasi",
    confirm: "Yakin?",
    yes: "Ya",
    no: "Tidak",
    ok: "OK",
    create: "Buat",
    update: "Perbarui",
    connecting: "Terhubung…",
    connected: "Terhubung",
    disconnected: "Terputus",
    retry: "Coba Lagi",
    backToHome: "Kembali ke Beranda",
    appName: "HNI POS Mini",
    language: "Bahasa",
    footerTagline: "Point of Sale & Jaringan Terpadu",
  },
};

const en: Dictionary = {
  ...id,
  auth: {
    ...id.auth,
    login: "Sign in to your store",
    register: "Register a new store",
    loginDesc: "Enter your cashier/owner account and store slug.",
    registerDesc: "Create your store workspace and owner account in seconds.",
    processing: "Processing…",
    logout: "Sign out",
    logoutTitle: "Sign out of your account",
    switching: "Switch Account",
    successLogin: "Signed in successfully.",
    successRegister: "Store and owner account created successfully.",
    sessionExpired: "Session expired. Please sign in again.",
    copyToken: "Copy JSON Web Token",
    tokenCopied: "Token copied to clipboard.",
    tokenCopyFailed: "The browser does not allow copying the token. You can still use the API response.",
    tabLogin: "Sign in",
    tabRegister: "Register store",
    securityNote: "Encrypted secure connection & passwords stored with industry-standard hashing.",
  },
  form: {
    ...id.form,
    email: "Email",
    password: "Password",
    minPassword: "At least 8 characters",
    tenantName: "Store name",
    tenantSlug: "Store slug",
    slugHint: "Unique store slug provided at registration.",
    ownerName: "Owner name",
    exampleTenantName: "Example: Barokah Herbal Store",
    exampleSlug: "example: healthy-mom-store",
    exampleEmail: "name@email.com",
  },
  intro: {
    ariaLabel: "About HNI POS",
    ecosystem: "HNI POS ECOSYSTEM",
    title: "Manage your stores & network with more peace of mind.",
    description: "A modern platform to manage POS sales, multi-warehouse FEFO stock, member PV recaps, and financial reports for your HNI store.",
    portal: "LOGIN PORTAL",
    features: {
      memberPOS: "Fast POS Cashier with Member Mode & Discounts",
      monthlyPVReport: "Monthly PV Recaps & Automatic Network Genealogy",
      fefoManagement: "FEFO Batch Management & Expiry Alerts",
      digitalReceipt: "Digital Receipt Printing & WhatsApp Delivery",
    },
    status: {
      ready: "Operational System Ready to Use",
    },
  },
  common: {
    ...id.common,
    appName: "HNI POS Mini",
    language: "Language",
    footerTagline: "Point of Sale & Integrated Network",
  },
};

export type Language = "id" | "en";

export type Dictionary = typeof id;

export const DEFAULT_LANGUAGE: Language = "id";

export const LANGUAGES: readonly Language[] = ["id", "en"];

export const dictionaries: Record<Language, Dictionary> = { id, en };

export function isLanguage(value: unknown): value is Language {
  return value === "id" || value === "en";
}

/**
 * Resolve a dictionary for a language. Always returns a complete dictionary,
 * so UI text can never become `undefined` because of a missing translation.
 */
export function getDictionary(language: Language): Dictionary {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
}

/**
 * Backwards-compatible default dictionary (Indonesian).
 * Existing components that import `i18n` keep working unchanged.
 */
export const i18n = id;
