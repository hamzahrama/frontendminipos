import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "../components/pwa-register";
import { cookies } from "next/headers";
import { Language } from "../lib/i18n";


export const metadata: Metadata = {
  title: "Masuk | HNI POS",
  description: "Masuk atau daftarkan toko HNI POS Anda.",
  other: {
    google: "notranslate",
  },
};

async function getLanguageFromCookies(): Promise<Language> {
  const cookieStore = await cookies();
  const language = (cookieStore.get("hni_pos_language")?.value || cookieStore.get("hni-pos-language")?.value) as Language;
  return language && (language === "id" || language === "en")
    ? language
    : "id";
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const serverLanguage = await getLanguageFromCookies();

  return (
    <html lang={serverLanguage} translate="no">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
