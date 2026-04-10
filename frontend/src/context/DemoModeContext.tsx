"use client";
import { createContext, useContext, useState } from "react";

const DemoModeContext = createContext<{ demo: boolean; setDemo: (v: boolean) => void }>({
  demo: true,
  setDemo: () => {},
});

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState(true);
  return <DemoModeContext.Provider value={{ demo, setDemo }}>{children}</DemoModeContext.Provider>;
}

export const useDemoMode = () => useContext(DemoModeContext);
