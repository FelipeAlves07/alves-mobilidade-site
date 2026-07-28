import { ThemeProvider } from "@/contexts/ThemeContext";

export default function TVDebordoLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
