
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-nfl-dark">
      <Header />
      <BreadcrumbNav />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
