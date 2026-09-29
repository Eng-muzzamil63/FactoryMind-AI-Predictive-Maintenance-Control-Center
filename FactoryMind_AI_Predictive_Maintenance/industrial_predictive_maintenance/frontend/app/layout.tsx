import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FactoryMind AI | Predictive Maintenance Control Center",
  description: "ML-powered industrial predictive maintenance dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
