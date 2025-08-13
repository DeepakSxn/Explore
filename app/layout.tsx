import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import "./styles/auth-background.css"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./context/AuthContext"
import { GamificationProvider } from "./context/GamificationContext"
import SuspensionWrapper from "./components/SuspensionWrapper"

export const metadata: Metadata = {
  title: "EOXS Video Management Tool",
  description: "Access customized software demo videos, track engagement, and get valuable insights.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <GamificationProvider>
              <SuspensionWrapper>
                {children}
              </SuspensionWrapper>
            </GamificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
