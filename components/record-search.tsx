export function DateFilter({ date }: { date: string }) {
  return (
    <form action="/supervisor" method="get" className="flex items-end gap-2">
      <label className="flex flex-col gap-1.5 text-[10px] font-medium text-slate-400">
        Tanggal
        <input type="date" name="date" defaultValue={date} className="h-10 rounded-xl border border-white/10 bg-[#101419] px-3 text-xs text-white outline-none focus:border-lime-300/70" />
      </label>
      <button type="submit" className="h-10 rounded-xl bg-white/[0.08] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.12]">Terapkan</button>
    </form>
  )
}
