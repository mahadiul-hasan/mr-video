import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Poppins } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "plyr/dist/plyr.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "MR Video",
  description: "Watch curated videos with fast streaming and a dark responsive experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={poppins.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster
              toastOptions={{
                classNames: {
                  error: "!text-red-900",
                  success: "!text-green-900 dark:!text-white",
                },
              }}
            />
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
