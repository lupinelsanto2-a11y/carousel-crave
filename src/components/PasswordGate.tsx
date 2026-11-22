import { useEffect, useState, type ReactNode } from "react";
import logoUrl from "@/assets/carousel-crave-logo.png";

const PASSWORD = "Mashumaro_1234";
const KEY = "carousel-auth";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(KEY) === "1") {
      setOk(true);
    }
  }, []);

  if (ok) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (val === PASSWORD) {
            sessionStorage.setItem(KEY, "1");
            setOk(true);
          } else {
            setErr("Incorrect password");
          }
        }}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border p-6"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <img src={logoUrl} alt="Carousel Crave" className="h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
          <h1 className="text-xl font-semibold">Carousel Crave</h1>
          <p className="text-sm text-muted-foreground">Enter password to continue</p>
        </div>
        <input
          type="password"
          autoFocus
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setErr("");
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Password"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
