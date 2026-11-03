import { useEffect, useState } from "react";
import { animate } from "motion/react";

export function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) }); return () => c.stop(); }, [to]);
  return <>{prefix}{v.toLocaleString("en-IN")}{suffix}</>;
}
