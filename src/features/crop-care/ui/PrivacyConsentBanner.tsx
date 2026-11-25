import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Cookie,
  X,
  FileText,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CONSENT_STORAGE_KEY = "kisanai_privacy_consent";

export function PrivacyConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!consent) {
        setShowBanner(true);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    } catch {}
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, "essential");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Floating Bottom Cookie & Privacy Consent Banner */}
      {showBanner && (
        <aside
          aria-label="Privacy and cookies"
          className="fixed bottom-20 sm:bottom-6 inset-x-4 max-w-xl mx-auto z-40 rounded-3xl border border-primary/30 bg-card/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Cookie className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  Privacy &amp; Local Storage Notice
                </h3>
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                KisanAI operates <strong className="text-foreground">100% on-device</strong> for offline crop diagnosis. We use device storage (IndexedDB, cookies &amp; localStorage) to cache on-device neural weights, scan history, and field weather. Your crop images and private farm data are never tracked or sold.
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
                >
                  Accept &amp; Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
                >
                  <FileText className="size-3.5" />
                  Read Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Essential Only
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Comprehensive Privacy Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-line bg-card p-6 shadow-2xl text-foreground">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line pb-3 bg-card/90 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">KisanAI Privacy Policy &amp; Terms</h2>
                  <p className="text-[11px] text-muted-foreground">Last updated: November 2026 · Agricultural Data Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-line bg-surface p-2 text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  1. 100% On-Device AI &amp; Zero Cloud Exfiltration
                </h3>
                <p className="mt-1">
                  Computer vision diagnosis (MobileNetV3) and local agronomic reasoning execute directly inside your browser or Android device hardware. Crop specimen photographs taken in the field are processed locally and are never transmitted to external cloud servers without your explicit initiation.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Cookie className="size-4 text-amber-500" />
                  2. Cookies &amp; Local Storage Usage
                </h3>
                <p className="mt-1">
                  We use browser LocalStorage and IndexedDB strictly for operational agricultural utilities:
                </p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Storing offline diagnosis history and treatment notes on your phone.</li>
                  <li>Caching neural network model weights for airplane-mode execution.</li>
                  <li>Remembering your selected district, language preference, and seasonal planting schedule.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  3. Statutory CIB&amp;RC Compliance Guarantee
                </h3>
                <p className="mt-1">
                  All disease management recommendations, biological controls, and chemical dosages conform strictly to the Central Insecticide Board &amp; Registration Committee (CIB&RC) statutory guidelines. KisanAI never recommends off-label or unapproved agrochemicals.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="size-4 text-sky-500" />
                  4. Farmer Data Sovereignty
                </h3>
                <p className="mt-1">
                  You retain total ownership of your crop data. You may export your complete scan history as an encrypted <code>.cropcare</code> archive or wipe all local data at any time from the Profile screen.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => {
                  handleAccept();
                  setShowModal(false);
                }}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
              >
                Accept All Terms &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
