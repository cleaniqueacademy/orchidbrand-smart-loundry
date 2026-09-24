import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  RefreshCw,
  X,
  Check,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Service, Tenant } from "../../types";
import { useToast } from "../common/ToastContext";
import { useConfirm } from "../common/ConfirmContext";
import { authHeaders } from "../../utils/api";

interface ServicesTabProps {
  tenantId: string;
  tenants: Tenant[];
  currentUserRole: string;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  tenantId,
  tenants,
  currentUserRole,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "kg",
    pricePerUnit: 8000,
    minOrder: 1,
    durationHours: 48,
    status: "active" as "active" | "inactive",
  });
  const [submitting, setSubmitting] = useState(false);

  const safeTenants = Array.isArray(tenants) ? tenants : [];
  const activeTenant = safeTenants.find((t) => t.id === tenantId) || safeTenants[0];

  const fetchServices = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/services?tenantId=${tenantId}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setServicesList(json.data);
      }
    } catch (err: any) {
      toast.error("Gagal Memuat Layanan", err.message || "Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [tenantId]);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: "",
      unit: "kg",
      pricePerUnit: 8000,
      minOrder: 1,
      durationHours: 48,
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      unit: service.unit,
      pricePerUnit: service.pricePerUnit,
      minOrder: service.minOrder || 1,
      durationHours: service.durationHours || 48,
      status: service.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("Nama Layanan Wajib", "Silakan masukkan nama paket layanan.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingService) {
        // Update
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          toast.success("Layanan Diperbarui", `Paket ${formData.name} berhasil disimpan.`);
          setIsModalOpen(false);
          fetchServices();
        } else {
          toast.error("Gagal Memperbarui", json.message);
        }
      } else {
        // Create
        const res = await fetch("/api/services", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            tenantId,
            ...formData,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success("Layanan Ditambahkan", `Paket ${formData.name} siap digunakan kasir.`);
          setIsModalOpen(false);
          fetchServices();
        } else {
          toast.error("Gagal Menambahkan", json.message);
        }
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (service: Service) => {
    const confirmed = await confirm({
      title: "Hapus Paket Layanan?",
      description: (
        <span>
          Apakah Anda yakin ingin menghapus paket layanan <strong>{service.name}</strong>?
          Paket ini tidak akan muncul lagi di pilihan kasir.
        </span>
      ),
      confirmText: "Hapus Layanan",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.info("Layanan Dihapus", `Paket ${service.name} telah dihapus.`);
        fetchServices();
      } else {
        toast.error("Gagal Menghapus", json.message);
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    }
  };

  const filteredServices = servicesList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination State for Services
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, tenantId]);

  const totalItems = filteredServices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const paginatedServices = filteredServices.slice((validPage - 1) * pageSize, validPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold">
              <Tag className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                Master Layanan & Estimasi SLA
              </h2>
              <p className="text-xs text-zinc-500">
                Atur tarif per satuan, minimum order, dan durasi pengerjaan untuk{" "}
                <strong className="text-zinc-700">{activeTenant?.outletName}</strong>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Layanan Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400">Total Paket Layanan</p>
            <p className="text-lg font-black text-zinc-900">{servicesList.length} Paket</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400">Layanan Aktif di POS</p>
            <p className="text-lg font-black text-emerald-700">
              {servicesList.filter((s) => s.status === "active").length} Layanan
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400">Durasi Pengerjaan Standar</p>
            <p className="text-lg font-black text-amber-800">24 – 48 Jam</p>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama layanan atau satuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition"
          />
        </div>

        <button
          onClick={fetchServices}
          disabled={loading}
          className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition cursor-pointer self-end sm:self-auto"
          title="Muat ulang layanan"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Layanan</th>
                <th className="py-3 px-3">Satuan</th>
                <th className="py-3 px-4 text-right">Tarif / Satuan</th>
                <th className="py-3 px-3 text-center">Min. Order</th>
                <th className="py-3 px-4 text-center">Durasi SLA</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && servicesList.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-36" /></td>
                    <td className="py-4 px-3"><div className="h-4 bg-zinc-200 rounded w-12" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded w-20 ml-auto" /></td>
                    <td className="py-4 px-3 text-center"><div className="h-4 bg-zinc-200 rounded w-8 mx-auto" /></td>
                    <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded w-16 mx-auto" /></td>
                    <td className="py-4 px-3 text-center"><div className="h-4 bg-zinc-200 rounded w-14 mx-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 bg-zinc-200 rounded-lg w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    Tidak ada paket layanan yang ditemukan. Klik tombol Tambah Layanan di atas.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service) => (
                  <tr key={service.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span>{service.name}</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 font-mono uppercase font-semibold text-[11px]">
                      {service.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-zinc-900 font-mono">
                      Rp {Number(service.pricePerUnit || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-600">
                      {service.minOrder || 1} {service.unit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {service.durationHours
                          ? service.durationHours >= 24
                            ? `${service.durationHours / 24} Hari (${service.durationHours} Jam)`
                            : `${service.durationHours} Jam`
                          : "48 Jam"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                          service.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        {service.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(service)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-700 hover:bg-blue-50 border border-zinc-200 transition cursor-pointer"
                          title="Edit Layanan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 transition cursor-pointer"
                          title="Hapus Layanan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Services Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-50/60 border-t border-zinc-200/80 text-xs text-zinc-500">
            <div className="text-[11px]">
              Menampilkan{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min((validPage - 1) * pageSize + 1, totalItems)}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(validPage * pageSize, totalItems)}
              </span>{" "}
              dari <span className="font-semibold text-zinc-800">{totalItems}</span> layanan
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-semibold text-zinc-700">
                  {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  {editingService ? "Edit Paket Layanan" : "Tambah Paket Layanan Baru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Layanan / Paket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Cuci Komplit Kilat 1 Hari"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Satuan Hitung
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 transition bg-white"
                  >
                    <option value="kg">Kilogram (Kg)</option>
                    <option value="pcs">Satuan (Pcs)</option>
                    <option value="meter">Meteran (m)</option>
                    <option value="pasang">Pasang (psg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Tarif per Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.pricePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerUnit: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 font-mono transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Minimal Order ({formData.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.minOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrder: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Durasi SLA Pengerjaan
                  </label>
                  <select
                    value={formData.durationHours}
                    onChange={(e) =>
                      setFormData({ ...formData, durationHours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 transition bg-white"
                  >
                    <option value={6}>Express (6 Jam)</option>
                    <option value={12}>Kilat (12 Jam)</option>
                    <option value={24}>1 Hari (24 Jam)</option>
                    <option value={48}>2 Hari (48 Jam - Reguler)</option>
                    <option value={72}>3 Hari (72 Jam)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Status Paket
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === "active"}
                      onChange={() => setFormData({ ...formData, status: "active" })}
                      className="accent-zinc-900"
                    />
                    <span className="font-medium text-zinc-800">Aktif (Tampil di Kasir)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === "inactive"}
                      onChange={() => setFormData({ ...formData, status: "inactive" })}
                      className="accent-zinc-900"
                    />
                    <span className="font-medium text-zinc-500">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingService ? "Simpan Perubahan" : "Simpan Layanan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
