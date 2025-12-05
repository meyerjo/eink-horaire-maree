import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marées Ver-sur-Mer",
  description:
    "Horaires de marée et lever/coucher du soleil pour Ver-sur-Mer (source horaire-maree.fr)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
