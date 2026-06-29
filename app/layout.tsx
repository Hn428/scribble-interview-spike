import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scribble — Home Health Workflow Spike",
  description:
    "Interview-ready AI workflow spike for a home health documentation platform (synthetic data).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
