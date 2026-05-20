import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Thinking Machines | Enterprise Analytics",
  description: "AI-powered business intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-on-background font-body h-screen overflow-hidden flex">
        <Sidebar />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
