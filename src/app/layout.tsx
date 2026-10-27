import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "75 soft · Wellness planner",
  description: "Személyes 75 napos szokáskövető és étkezéstervező."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="hu"><body>{children}</body></html>;
}
