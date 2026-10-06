import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTwin — Living Financial Digital Twin & Scenario Laboratory",
  description: "Understand your financial life today. Build a Financial Twin. Change one thing. Simulate what could happen next with institutional-grade Monte Carlo analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}
