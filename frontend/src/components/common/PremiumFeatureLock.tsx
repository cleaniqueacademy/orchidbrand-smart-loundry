import React from "react";
import { PremiumFeatureKey, PREMIUM_FEATURES_REGISTRY } from "../../types";
export interface PremiumFeatureLockProps {
  readonly feature: PremiumFeatureKey; readonly children: React.ReactNode; readonly isLocked?: boolean;
  readonly customTitle?: string; readonly customSubtitle?: string; readonly onLearnMore?: () => void;
}
export const PremiumFeatureLock: React.FC<PremiumFeatureLockProps> = ({ feature, children, isLocked = true, customTitle, customSubtitle, onLearnMore }) => {
  if (!isLocked) return <>{children}</>;
  const meta = PREMIUM_FEATURES_REGISTRY[feature];
  return <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-3">
    <p className="text-xs font-semibold text-amber-700">Paket Premium</p>
    <h2 className="text-lg font-bold">{customTitle || meta.title}</h2>
    <p className="text-sm text-zinc-600">{customSubtitle || meta.subtitle}</p>
    <ul className="list-disc pl-5 text-sm space-y-1">{meta.capabilities.map(item => <li key={item}>{item}</li>)}</ul>
    {onLearnMore && <button type="button" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm" onClick={onLearnMore}>Lihat paket Premium</button>}
  </section>;
};
