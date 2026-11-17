import type { InferSelectModel } from 'drizzle-orm'
import { guardReports, visitorRecords } from '@/lib/db/schema'

export function AdminVisitorTable({ visitors }: { visitors: Array<InferSelectModel<typeof visitorRecords>> }) {
  if (visitors.length === 0) return <EmptyState>Belum ada data tamu tersimpan.</EmptyState>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-slate-500"><th className="pb-3 pr-4 font-medium">Tamu</th><th className="pb-3 pr-4 font-medium">Kontak</th><th className="pb-3 pr-4 font-medium">Instansi / Alamat</th><th className="pb-3 pr-4 font-medium">PIC / Tujuan</th><th className="pb-3 pr-4 font-medium">Waktu</th><th className="pb-3 pr-4 font-medium">Status</th><th className="pb-3 font-medium">Pass</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">{visitors.map((visitor) => <tr key={visitor.id} className="align-top"><td className="py-3 pr-4"><p className="font-medium text-slate-200">{visitor.visitorName}</p><p className="mt-1 text-[10px] text-slate-500">{visitor.visitDate} · {visitor.gender || '—'} · {visitor.guestCount} tamu</p></td><td className="py-3 pr-4 text-slate-400">{visitor.phone || '—'}</td><td className="py-3 pr-4"><p className="text-slate-300">{visitor.company || 'Perorangan'}</p><p className="mt-1 max-w-[230px] text-[10px] text-slate-500">{visitor.address || '—'}</p></td><td className="py-3 pr-4"><p className="text-slate-300">{visitor.host || '—'}</p><p className="mt-1 text-[10px] text-slate-500">{visitor.purpose || '—'}</p></td><td className="py-3 pr-4 whitespace-nowrap text-slate-400">{visitor.arrivalTime || '—'} – {visitor.plannedDepartureTime || '—'}</td><td className="py-3 pr-4 text-slate-400">{visitor.visitStatus === 'selesai' ? 'Selesai' : visitor.visitStatus === 'sedang_berkunjung' ? 'Di lokasi' : 'Terjadwal'}</td><td className="py-3 text-slate-400">{visitor.visitorPassStatus === 'dikembalikan' ? 'Kembali' : visitor.visitorPassStatus === 'diberikan' ? 'Diberikan' : visitor.visitorPassStatus === 'tercatat_di_sheet' ? 'Di Sheet' : 'Belum'}</td></tr>)}</tbody>
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
