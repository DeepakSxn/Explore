import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./styles/auth-background.css"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./context/AuthContext"
import { GamificationProvider } from "./context/GamificationContext"
import SuspensionWrapper from "./components/SuspensionWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EOXS Video Management Tool",
  description: "Access customized software demo videos, track engagement, and get valuable insights.",
  generator: "v0.dev",
  icons: {
    icon: "/Eoxsplore logo.png",
    shortcut: "/Eoxsplore logo.png",
    apple: "/Eoxsplore logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/Eoxsplore logo.png" />
        <link rel="shortcut icon" type="image/png" href="/Eoxsplore logo.png" />
        <link rel="apple-touch-icon" href="/Eoxsplore logo.png" />
      </head>
      <body className={inter.className}>
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
