'use client'

import { Printer } from 'lucide-react'

export function ReportPrintActions() {
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden inline-flex h-10 items-center gap-2 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200">
      <Printer size={15} aria-hidden="true" /> Cetak / simpan PDF
    </button>
  )
}
