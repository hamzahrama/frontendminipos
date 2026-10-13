# Frontend Mini POS (Projectke2-web)

Aplikasi Web Point of Sale (POS) dan Katalog Online berbasis Next.js 14 App Router, Tailwind CSS, TypeScript, dan Zustand.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **State Management**: Zustand
- **Charting**: Recharts
- **PWA**: Service Worker (`public/sw.js`) & Web Manifest
- **Testing**: Vitest

## Fitur Utama

- **POS Terminal**: Kasir penjualan, manajemen cart, diskon, barcode scanning, cetak/share struk via WhatsApp.
- **Katalog Publik**: Etalase produk online per toko (`/katalog/[slug]`) beserta detail produk dan SEO sitemap.
- **Struk Digital**: Halaman struk transaksi publik terverifikasi (`/receipt/[token]`).
- **Laporan & Analitik**: Laporan penjualan, laba rugi, dan Point Value (PV).
- **Manajemen Jaringan & Bonus**: Perhitungan bonus dan jaringan referral/downline.
- **Manajemen Pelanggan & Voucher**: Manajemen diskon kupon dan CRM pelanggan.
- **PWA Ready**: Mendukung mode offline dan instalasi aplikasi web di perangkat mobile/desktop.

## Memulai Proyek

### 1. Salin Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Sesuaikan URL backend API jika diperlukan:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_INTERNAL_URL=http://localhost:4000
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Jalankan Development Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

## Script yang Tersedia

- `npm run dev`: Menjalankan development server
- `npm run build`: Membangun aplikasi untuk production
- `npm run start`: Menjalankan production server
- `npm run lint`: Memeriksa format dan standar kode (ESLint)
- `npm run test`: Menjalankan unit tests (Vitest)
