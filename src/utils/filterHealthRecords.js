/**
 * Universal health record filter.
 * Supports searching by hospital name, specialization, confirmation number,
 * and now also by stored symptoms.
 */

export function filterHealthRecords(records, searchTerm, statusFilter = "all", dateFilter = "all") {
  if (!Array.isArray(records)) return [];

  let term = searchTerm?.trim().toLowerCase() || "";
  let filtered = [...records];

  if (term) {
    filtered = filtered.filter((r) => {
      const h = r.hospital || {};
      const inHospital =
        h.name?.toLowerCase().includes(term) ||
        h.specialization?.toLowerCase().includes(term) ||
        r.confirmationNumber?.toLowerCase().includes(term);
      const inSymptoms = r.symptoms?.toLowerCase().includes(term);
      return inHospital || inSymptoms;
    });
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  if (dateFilter !== "all") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filtered = filtered.filter((r) => {
      const d = new Date(r.slot.date);
      switch (dateFilter) {
        case "today": return d.toDateString() === today.toDateString();
        case "upcoming": return d >= today;
        case "past": return d < today;
        default: return true;
      }
    });
  }

  filtered.sort((a, b) => new Date(b.slot.date) - new Date(a.slot.date));

  return filtered;
}
