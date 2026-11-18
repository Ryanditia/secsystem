import type { InferSelectModel } from 'drizzle-orm'
import { updateVisitorControl } from '@/app/actions/records'
import { guardReports, visitorRecords } from '@/lib/db/schema'
import { getJakartaTimeInput } from '@/lib/format'

export function AdminVisitorTable({ visitors }: { visitors: Array<InferSelectModel<typeof visitorRecords>> }) {
  if (visitors.length === 0) return <EmptyState>Belum ada data tamu tersimpan.</EmptyState>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-xs">
        <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-slate-500"><th className="pb-3 pr-4 font-medium">Tamu</th><th className="pb-3 pr-4 font-medium">Kontak</th><th className="pb-3 pr-4 font-medium">Instansi / Alamat</th><th className="pb-3 pr-4 font-medium">PIC / Tujuan</th><th className="pb-3 pr-4 font-medium">Waktu</th><th className="pb-3 font-medium">Status kunjungan / pass</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">{visitors.map((visitor) => (
          <tr key={visitor.id} className="align-top">
            <td className="py-3 pr-4"><p className="font-medium text-slate-200">{visitor.visitorName}</p><p className="mt-1 text-[10px] text-slate-500">{visitor.visitDate} · {visitor.gender || '—'} · {visitor.guestCount} tamu</p></td>
            <td className="py-3 pr-4 text-slate-400">{visitor.phone || '—'}</td>
            <td className="py-3 pr-4"><p className="text-slate-300">{visitor.company || 'Perorangan'}</p><p className="mt-1 max-w-[230px] text-[10px] text-slate-500">{visitor.address || '—'}</p></td>
            <td className="py-3 pr-4"><p className="text-slate-300">{visitor.host || '—'}</p><p className="mt-1 text-[10px] text-slate-500">{visitor.purpose || '—'}</p></td>
            <td className="py-3 pr-4 whitespace-nowrap text-slate-400"><p>{visitor.arrivalTime || '—'} – {visitor.plannedDepartureTime || '—'}</p><p className="mt-1 text-[10px] text-slate-600">Aktual: {getJakartaTimeInput(visitor.checkedInAt) || '—'} – {getJakartaTimeInput(visitor.checkedOutAt) || '—'}</p></td>
            <td className="py-3">
              <form action={updateVisitorControl} className="flex min-w-[390px] flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={visitor.id} />
                <label className="sr-only" htmlFor={`visit-status-${visitor.id}`}>Status kunjungan {visitor.visitorName}</label>
                <select id={`visit-status-${visitor.id}`} name="visitStatus" defaultValue={visitor.visitStatus} className="h-8 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70">
                  <option value="terjadwal">Terjadwal</option><option value="sedang_berkunjung">Di lokasi</option><option value="selesai">Selesai</option>
                </select>
                <label className="sr-only" htmlFor={`pass-status-${visitor.id}`}>Status visitor pass {visitor.visitorName}</label>
                <select id={`pass-status-${visitor.id}`} name="visitorPassStatus" defaultValue={visitor.visitorPassStatus} className="h-8 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70">
                  <option value="belum_diberikan">Pass belum</option><option value="diberikan">Pass diberikan</option><option value="dikembalikan">Pass kembali</option><option value="tercatat_di_sheet">Riwayat sheet</option>
                </select>
                <label className="sr-only" htmlFor={`check-in-${visitor.id}`}>Jam check-in aktual {visitor.visitorName}</label>
                <input id={`check-in-${visitor.id}`} type="time" name="checkInTime" defaultValue={getJakartaTimeInput(visitor.checkedInAt)} className="h-8 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70" />
                <label className="sr-only" htmlFor={`check-out-${visitor.id}`}>Jam check-out aktual {visitor.visitorName}</label>
                <input id={`check-out-${visitor.id}`} type="time" name="checkOutTime" defaultValue={getJakartaTimeInput(visitor.checkedOutAt)} className="h-8 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70" />
                <button type="submit" className="h-8 rounded-lg bg-white/[0.08] px-2.5 text-[10px] font-medium text-white transition hover:bg-white/[0.14]">Simpan</button>
              </form>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function AdminReportTable({ reports }: { reports: Array<InferSelectModel<typeof guardReports>> }) {
  if (reports.length === 0) return <EmptyState>Belum ada laporan jaga tersimpan.</EmptyState>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-slate-500"><th className="pb-3 pr-4 font-medium">Tanggal</th><th className="pb-3 pr-4 font-medium">Shift / Regu</th><th className="pb-3 pr-4 font-medium">Kehadiran</th><th className="pb-3 pr-4 font-medium">Kegiatan / Tamu</th><th className="pb-3 pr-4 font-medium">Temuan</th><th className="pb-3 font-medium">Pelapor</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">{reports.map((report) => <tr key={report.id} className="align-top"><td className="py-3 pr-4 whitespace-nowrap text-slate-300">{report.reportDate}</td><td className="py-3 pr-4 text-slate-300">{report.shift} / {report.team}</td><td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-[10px] ${report.attendanceStatus === 'Lengkap' ? 'bg-lime-300/10 text-lime-200' : 'bg-amber-300/10 text-amber-200'}`}>{report.attendanceStatus}</span><p className="mt-1 text-[10px] text-slate-500">{report.attendanceNotes || '—'}</p></td><td className="max-w-[250px] py-3 pr-4"><p className="line-clamp-2 text-slate-300">{report.activities || '—'}</p><p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{report.visitorProjectNotes || '—'}</p></td><td className="max-w-[220px] py-3 pr-4 text-slate-400">{report.findings || 'Nihil'}</td><td className="py-3 text-slate-400">{report.reporter || '—'}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center text-xs text-slate-500">{children}</div>
}
