"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, MessageCircle, Plus, Minus, Check, Package } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  memberPrice: string | number;
  retailPrice: string | number;
  pv: string | number;
  category: { name: string } | null;
  images: { url: string }[];
  availableQuantity: number;
};
type Store = { name: string; slug: string; whatsAppNumber: string | null };
type CartItem = { productId: string; quantity: number; product: Product };
const money = (value: string | number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(value)
  );

export function PublicCatalogView({ store, products }: { store: Store; products: Product[] }) {
  const key = `public-catalog-cart-${store.slug}`;
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keranjang dibaca setelah mount agar HTML server dan browser sama (hindari hydration mismatch)
      setCart(JSON.parse(localStorage.getItem(key) ?? "[]") as CartItem[]);
    } catch {
      setCart([]);
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(cart));
  }, [cart, key]);

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => ({
          product: products.find((candidate) => candidate.id === item.productId) ?? item.product,
          quantity: Math.min(
            item.quantity,
            products.find((candidate) => candidate.id === item.productId)?.availableQuantity ??
              item.product.availableQuantity
          ),
        }))
        .filter((item) => item.quantity > 0),
    [cart, products]
  );

  const setQuantity = (product: Product, change: number) =>
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const quantity = Math.max(
        0,
        Math.min(product.availableQuantity, (existing?.quantity ?? 0) + change)
      );
      return [
        ...current.filter((item) => item.productId !== product.id),
        ...(quantity ? [{ productId: product.id, quantity, product }] : []),
      ];
    });

  const total = cartProducts.reduce((sum, item) => sum + Number(item.product.retailPrice) * item.quantity, 0);
  const message = [
    `Halo ${store.name}, saya ingin memesan:`,
    ...cartProducts.map(
      ({ product, quantity }) => `- ${product.name} x${quantity} (${money(product.retailPrice)})`
    ),
    `Perkiraan total: ${money(total)}`,
  ].join("\n");
  const waLink = store.whatsAppNumber
    ? `https://wa.me/${store.whatsAppNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <>
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm">
          <Package className="h-10 w-10 mx-auto mb-3 text-slate-400" />
          <p className="font-semibold text-base">Belum ada produk ready stock yang cocok.</p>
          <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian atau kategori lain.</p>
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const quantity = cart.find((item) => item.productId === product.id)?.quantity ?? 0;
            return (
              <article
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-emerald-300"
                key={product.id}
              >
                <Link
                  href={`/katalog/${encodeURIComponent(store.slug)}/${encodeURIComponent(product.id)}`}
                  aria-label={`Lihat ${product.name}`}
                  className="relative overflow-hidden bg-slate-50"
                >
                  {product.images[0]?.url ? (
                    <Image
                      unoptimized
                      width={640}
                      height={400}
                      className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                      src={product.images[0].url}
                      alt={product.name}
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-slate-100 text-slate-400 text-xs">
                      Tidak ada foto
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-md bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                    {product.category?.name ?? "Umum"}
                  </span>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] text-slate-400 font-mono">SKU: {product.sku}</p>
                  <Link
                    className="mt-1 block text-base font-bold text-slate-900 group-hover:text-emerald-700 transition"
                    href={`/katalog/${encodeURIComponent(store.slug)}/${encodeURIComponent(product.id)}`}
                  >
                    {product.name}
                  </Link>

                  <div className="mt-3">
                    <p className="text-lg font-extrabold text-emerald-800">
                      {money(product.retailPrice)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Member: {money(product.memberPrice)} · <span className="text-emerald-700 font-semibold">{product.pv} PV</span>
                    </p>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Stok: <b>{product.availableQuantity}</b>
                    </span>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1 bg-slate-50">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
                        onClick={() => setQuantity(product, -1)}
                        disabled={quantity <= 0}
                        aria-label={`Kurangi ${product.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center font-bold text-xs text-slate-800">{quantity}</span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition"
                        onClick={() => setQuantity(product, 1)}
                        aria-label={`Tambah ${product.name}`}
                        disabled={quantity >= product.availableQuantity}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartProducts.length > 0 && (
        <aside className="sticky bottom-4 z-30 mt-8 rounded-2xl border border-emerald-300 bg-white/95 backdrop-blur-md p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <strong className="text-sm font-bold text-slate-900 block">
                  {cartProducts.reduce((sum, item) => sum + item.quantity, 0)} barang dipilih
                </strong>
                <p className="text-xs text-slate-500">
                  Perkiraan Total Belanja: <span className="font-bold text-emerald-800 text-sm">{money(total)}</span>
                </p>
              </div>
            </div>

            {waLink ? (
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-md hover:bg-emerald-800 transition"
                href={waLink}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Pesan Sekarang via WhatsApp</span>
              </a>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Toko belum mengatur nomor WhatsApp penerima pesanan.
              </p>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
