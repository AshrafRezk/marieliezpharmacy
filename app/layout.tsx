import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Marieliez Pharmacy | Care That Feels Like Family", description: "Your neighbourhood pharmacy in Cairo for medicines, wellness, mother and baby care, beauty, personal care and more.", icons: { icon: "/marieliez-logo.jpg", shortcut: "/marieliez-logo.jpg" }, openGraph: { title: "Marieliez Pharmacy", description: "Professional care. Personal connection.", type: "website" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
