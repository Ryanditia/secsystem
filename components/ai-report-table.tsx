import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import type { InferSelectModel } from 'drizzle-orm'
import { aiGuardReports } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'

export function AiReportTable({ reports }: { reports: Array<InferSelectModel<typeof aiGuardReports>> }) {
  if (reports.length === 0) return <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center text-xs text-slate-500">Belum ada laporan AI tersimpan. Tempel laporan mentah di atas untuk mulai.</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-slate-500"><th className="pb-3 pr-4 font-medium">Tanggal / jenis</th><th className="pb-3 pr-4 font-medium">Shift / regu</th><th className="pb-3 pr-4 font-medium">Personel</th><th className="pb-3 pr-4 font-medium">Kendaraan</th><th className="pb-3 pr-4 font-medium">Kartu ID</th><th className="pb-3 font-medium">Ekspor</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">
          {reports.map((report) => {
            const data = report.structuredData
            const motorcycleCount = data.vehicles.totalMotorcycles
            const carCount = data.vehicles.totalCars
            const typeLabel = report.reportType === 'combined' ? 'Jaga + ID card' : report.reportType === 'id-card' ? 'ID card' : 'Jaga'
            return (
              <tr key={report.id} className="align-top">
                <td className="py-3 pr-4 whitespace-nowrap"><p className="font-medium text-slate-200">{formatDate(report.reportDate)}</p><p className="mt-1 text-[10px] text-slate-500">{typeLabel}</p></td>
                <td className="py-3 pr-4 text-slate-300">{report.shift ? `Shift ${report.shift}` : '—'}{report.team ? ` / Regu ${report.team}` : ''}</td>
                <td className="py-3 pr-4"><p className="text-slate-300">{data.attendance.roster.length} nama</p><p className="mt-1 text-[10px] text-slate-500">{data.attendanceStatus}</p></td>
                <td className="py-3 pr-4 text-slate-400">Motor {motorcycleCount ?? '—'} · Mobil {carCount ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-400">{data.cardIncidents.length} orang</td>
                <td className="py-3"><div className="flex items-center gap-2"><Link href={`/admin/report-print?id=${report.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-medium text-slate-200 transition hover:bg-white/[0.06]" aria-label={`Cetak laporan ${report.reportDate} ke PDF`}><FileText size={12} aria-hidden="true" /> PDF</Link><a href={`/api/ai-reports-export?id=${report.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-medium text-slate-200 transition hover:bg-white/[0.06]" aria-label={`Unduh laporan ${report.reportDate} sebagai Excel`}><Download size={12} aria-hidden="true" /> Excel</a></div></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
