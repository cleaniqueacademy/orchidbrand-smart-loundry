import React, { useEffect, useState } from "react";
import { Tenant } from "../../types";
import { api } from "../../utils/api";
import { PremiumFeatureLock } from "../common/PremiumFeatureLock";

interface Props { currentTenant?: Tenant | null; isLocked?: boolean; onLearnMore?: () => void; onSelectBranch?: (id: string) => void; }
export const BranchManagementSection: React.FC<Props> = ({ currentTenant, isLocked = true, onLearnMore, onSelectBranch }) => {
  const [branches, setBranches] = useState<Tenant[]>([]);
  const [maxBranches, setMaxBranches] = useState(5);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ outletName: "", phone: "", address: "" });
  const load = async (signal?: AbortSignal) => {
    try {
      const res = await api.get<{ success: boolean; data: Tenant[]; maxBranches: number; message?: string }>("/api/my-branches", { signal });
      if (!res.success) throw new Error(res.message || "Cabang tidak dapat dimuat");
      if (!signal?.aborted) { setBranches(res.data); setMaxBranches(res.maxBranches); }
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Gagal memuat cabang"); }
  };
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [currentTenant?.id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const res = await api.post<{ success: boolean; message?: string }>("/api/my-branches", form);
      if (!res.success) throw new Error(res.message || "Cabang gagal dibuat");
      setForm({ outletName: "", phone: "", address: "" }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat cabang"); }
    finally { setSaving(false); }
  };
  const activeCount=branches.filter(branch=>branch.status === "active" && !branch.archivedAt).length;
  return <PremiumFeatureLock feature="branch_management" isLocked={isLocked} onLearnMore={onLearnMore}>
    <section className="space-y-5 bg-white rounded-xl border border-zinc-200 p-5">
      <div><h2 className="font-bold text-lg">Cabang laundry</h2><p className="text-sm text-zinc-500">{activeCount} dari {maxBranches} cabang aktif. Satu langganan Owner, data operasional terpisah per cabang.</p></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ul className="space-y-2">{branches.map(branch => <li key={branch.id} className="border rounded-xl p-3 flex items-center justify-between gap-3">
        <div><p className="font-semibold">{branch.outletName}</p><p className="text-xs text-zinc-500">{branch.address}</p></div>
        <button type="button" disabled={branch.id === currentTenant?.id || branch.status !== "active" || !!branch.archivedAt} onClick={() => onSelectBranch?.(branch.id)} className="border rounded-lg px-3 py-2 text-xs disabled:opacity-50">{branch.id === currentTenant?.id ? "Cabang aktif" : "Pilih cabang"}</button>
      </li>)}</ul>
      <form onSubmit={submit} className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">Tambah cabang</h3>
        {([['outletName', 'Nama cabang'], ['phone', 'Nomor telepon'], ['address', 'Alamat']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input required maxLength={key === 'address' ? 500 : key === 'phone' ? 30 : 120} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label>)}
        <button disabled={saving || isLocked || activeCount >= maxBranches} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{saving ? "Menyimpan..." : "Buat cabang"}</button>
      </form>
    </section>
  </PremiumFeatureLock>;
};
