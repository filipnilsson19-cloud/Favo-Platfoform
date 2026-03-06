import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const graphik = localFont({
  variable: "--font-graphik",
  src: [
    {
      path: "../../Graphik Family/Graphik-Regular-Trial.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../Graphik Family/Graphik-Medium-Trial.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../Graphik Family/Graphik-Semibold-Trial.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../Graphik Family/Graphik-Bold-Trial.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../Graphik Family/Graphik-Black-Trial.otf",
      weight: "900",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "FAVO Platform",
  description: "Intern personalportal for recept, stationsvyer och rutiner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className={`${graphik.className} ${graphik.variable}`}>{children}</body>
    </html>
  );
}
