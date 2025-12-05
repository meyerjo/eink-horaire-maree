import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gezeiten Ver-sur-Mer",
  description: "Gezeitenzeiten für Ver-sur-Mer (Quelle: horaire-maree.fr)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>{children}</body>
    </html>
  );
}
