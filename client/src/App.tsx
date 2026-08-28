import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// 部署到子路徑（例如 GitHub Pages 的 /pixel-campus-rpg/）時，網址的開頭
// 不是 "/"，路由會全部對不上而掉進 NotFound。BASE_URL 由 Vite 依建置時的
// VITE_BASE_PATH 產生，去掉結尾斜線後交給 wouter 當作 base。
// 部署在根目錄時 BASE_URL 是 "/"，base 會是空字串，行為與原本相同。
const routerBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function Router() {
  return (
    <WouterRouter base={routerBase}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
