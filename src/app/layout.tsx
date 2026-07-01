import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "plyr/dist/plyr.css";

export const metadata: Metadata = {
  title: "VVideos",
  description:
    "Watch curated videos with fast streaming and a dark responsive experience.",
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
        <body>
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
