'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Check, ClipboardCheck, FileText, LoaderCircle, Sparkles, UsersRound } from 'lucide-react'
import { generateAiGuardReportDraft, saveAiGuardReport } from '@/app/actions/ai-reports'
import type { GuardReportDraft, IdCardStatus } from '@/lib/guard-report'

const inputClass = 'h-10 w-full rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15'

export function AiReportWorkspace() {
  const router = useRouter()
  const [rawInput, setRawInput] = useState('')
  const [draft, setDraft] = useState<GuardReportDraft | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function generateDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await generateAiGuardReportDraft(rawInput)
      if (result.error || !result.draft) {
        setError(result.error ?? 'Draf tidak dapat dibuat.')
        return
      }
      setDraft(result.draft)
    } catch {
      setError('Permintaan belum berhasil. Coba kirim ulang teks laporan.')
    } finally {
      setPending(false)
    }
  }

  async function saveDraft() {
    if (!draft) return
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await saveAiGuardReport(rawInput, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(result.success ?? 'Laporan berhasil disimpan.')
      setDraft(null)
      setRawInput('')
      router.refresh()
    } catch {
      setError('Laporan belum tersimpan. Coba lagi tanpa menutup draf ini.')
    } finally {
      setPending(false)
    }
  }

  function updateDraft<K extends keyof GuardReportDraft>(key: K, value: GuardReportDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  function updateCardIncident(index: number, field: 'employeeName' | 'department' | 'status' | 'details', value: string) {
    setDraft((current) => {
      if (!current) return current
      const cardIncidents = current.cardIncidents.map((incident, incidentIndex) => {
        if (incidentIndex !== index) return incident
        if (field === 'status') return { ...incident, status: value as IdCardStatus }
        return { ...incident, [field]: value }
      })
      return { ...current, cardIncidents }
    })
  }

  const reportCanSave = Boolean(draft && /^\d{4}-\d{2}-\d{2}$/.test(draft.reportDate) && ((draft.shift && draft.team) || draft.cardIncidents.length > 0))

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5" aria-labelledby="ai-input-title">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-300/10 text-lime-200"><Bot size={19} aria-hidden="true" /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">Input percakapan</p>
            <h3 id="ai-input-title" className="mt-1 text-base font-semibold text-white">Kirim catatan jaga apa adanya</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Tempel chat atau laporan mentah. AI menyusun kehadiran, tugas, kendaraan, dan temuan kartu ID tanpa menambah fakta.</p>
          </div>
        </div>

        <form onSubmit={generateDraft} className="mt-4 flex flex-col gap-3">
          <label htmlFor="guard-report-input" className="text-xs font-medium text-slate-300">Isi laporan</label>
          <textarea
            id="guard-report-input"
            value={rawInput}
            onChange={(event) => {
              setRawInput(event.target.value)
              setDraft(null)
              setError('')
            }}
            disabled={pending}
            minLength={20}
            maxLength={20000}
            rows={18}
            required
            placeholder={'Contoh: Kamis 05 November 2026\nPetugas shift 3 Regu D jumlah 6...\nKaryawan yang tidak membawa ID card: ...'}
            className="min-h-[280px] w-full resize-y rounded-xl border border-white/10 bg-[#0a0d11] px-3 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15"
          />
          <p className="text-[10px] leading-4 text-slate-600">Maksimal 20.000 karakter. Teks diproses melalui AI Gateway; laporan baru disimpan ke arsip setelah Anda meninjau dan menekan tombol simpan.</p>
          {error ? <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2.5 text-xs text-rose-200">{error}</p> : null}
          {success ? <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2.5 text-xs text-lime-200">{success}</p> : null}
          <button type="submit" disabled={pending || rawInput.trim().length < 20} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">
            {pending && !draft ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
            {pending && !draft ? 'AI sedang merapikan…' : 'Rapikan dengan AI'}
          </button>
        </form>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#101419] p-4 sm:p-5" aria-labelledby="ai-preview-title">
        {!draft ? (
          <div className="flex min-h-[390px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] px-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500"><FileText size={21} aria-hidden="true" /></span>
            <h3 id="ai-preview-title" className="mt-4 text-sm font-semibold text-slate-300">Pratinjau laporan muncul di sini</h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">Setelah AI merapikan teks, cek tanggal, shift, jumlah, kendaraan, dan daftar ID card sebelum menyimpan.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">Pratinjau · belum tersimpan</p>
                <h3 id="ai-preview-title" className="mt-1 text-base font-semibold text-white">Tinjau hasil AI</h3>
                <p className="mt-1 text-[10px] text-slate-500">{draft.reportDay || 'Hari belum disebut'}{draft.greeting ? ` · ${draft.greeting}` : ''}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-2.5 py-1 text-[10px] text-lime-100"><ClipboardCheck size={12} aria-hidden="true" /> Perlu persetujuan admin</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-[11px] font-medium text-slate-400">Tanggal laporan
                <input type="date" value={draft.reportDate} onChange={(event) => updateDraft('reportDate', event.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-medium text-slate-400">Tanggal kop
                <input type="date" value={draft.documentDate} onChange={(event) => updateDraft('documentDate', event.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-medium text-slate-400">Shift
                <select value={draft.shift ?? ''} onChange={(event) => updateDraft('shift', (event.target.value || null) as GuardReportDraft['shift'])} className={inputClass}>
                  <option value="">Belum disebut</option><option value="I">Shift I</option><option value="II">Shift II</option><option value="III">Shift III</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-medium text-slate-400">Regu
                <select value={draft.team ?? ''} onChange={(event) => updateDraft('team', (event.target.value || null) as GuardReportDraft['team'])} className={inputClass}>
                  <option value="">Belum disebut</option><option value="A">Regu A</option><option value="B">Regu B</option><option value="C">Regu C</option><option value="D">Regu D</option>
                </select>
              </label>
            </div>

            {draft.missingInformation.length > 0 ? (
              <div role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-100">Perlu dicek sebelum laporan final</p>
                <ul className="mt-1 list-inside list-disc text-[11px] leading-5 text-amber-100/80">{draft.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-3">
              <MiniMetric icon={UsersRound} label="Nama di roster" value={draft.attendance.roster.length} note={draft.attendance.reportedCount === null ? 'Jumlah laporan belum disebut' : `Dilaporkan ${draft.attendance.reportedCount} personel`} />
              <MiniMetric icon={ClipboardCheck} label="Status kehadiran" value={draft.attendanceStatus} note={draft.attendance.absentNames.length ? `${draft.attendance.absentNames.length} nama absen` : 'Berdasarkan teks laporan'} />
              <MiniMetric icon={FileText} label="Temuan ID card" value={draft.cardIncidents.length} note={`${countByCardStatus(draft.cardIncidents, 'Belum ada')} belum ada · ${countByCardStatus(draft.cardIncidents, 'Tertinggal')} tertinggal · ${countByCardStatus(draft.cardIncidents, 'Rusak')} rusak`} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <PreviewSection title="Kehadiran & penempatan">
                <div className="mb-2 text-[11px] text-slate-400">{draft.attendance.notes.join(' · ') || 'Tidak ada catatan tambahan.'}</div>
                <div className="flex flex-col gap-1.5">
                  {draft.attendance.roster.length ? draft.attendance.roster.map((person, index) => <div key={`${person.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-2.5 py-2 text-[11px]"><span className="font-medium text-slate-200">{person.name}</span><span className="text-right text-slate-500">{person.assignment || 'Penugasan belum disebut'}</span></div>) : <span className="text-[11px] text-slate-500">Nama personel tidak disebut.</span>}
                </div>
                {draft.attendance.absentNames.length > 0 ? <p className="mt-2 text-[11px] text-amber-100">Absen: {draft.attendance.absentNames.join(', ')}</p> : null}
                {draft.attendance.replacements.length > 0 ? <p className="mt-1 text-[11px] text-slate-400">Pengganti: {draft.attendance.replacements.join(', ')}</p> : null}
              </PreviewSection>

              <PreviewSection title="Kendaraan menginap">
                <VehicleList title="Motor" areas={draft.vehicles.motorcycles} total={draft.vehicles.totalMotorcycles} />
                <VehicleList title="Mobil" areas={draft.vehicles.cars} total={draft.vehicles.totalCars} />
                {draft.vehicles.operationalVehicles !== null ? <p className="mt-2 text-[11px] text-slate-500">Kendaraan operasional: {draft.vehicles.operationalVehicles} unit</p> : null}
              </PreviewSection>
            </div>

            <PreviewSection title={`Karyawan tanpa ID card · ${draft.cardIncidents.length} orang`}>
              {draft.cardIncidents.length === 0 ? <p className="text-[11px] text-slate-500">Tidak ada temuan ID card pada teks ini.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[11px]">
                    <thead><tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-slate-500"><th className="pb-2 pr-2 font-medium">Nama</th><th className="pb-2 pr-2 font-medium">Departemen</th><th className="pb-2 font-medium">Status</th></tr></thead>
                    <tbody className="divide-y divide-white/[0.05]">{draft.cardIncidents.map((incident, index) => <tr key={`${incident.employeeName}-${index}`}><td className="py-2 pr-2"><input aria-label={`Nama karyawan ${index + 1}`} value={incident.employeeName} onChange={(event) => updateCardIncident(index, 'employeeName', event.target.value)} className="h-8 w-full min-w-28 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70" /></td><td className="py-2 pr-2"><input aria-label={`Departemen karyawan ${index + 1}`} value={incident.department} onChange={(event) => updateCardIncident(index, 'department', event.target.value)} className="h-8 w-full min-w-24 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70" /></td><td className="py-2"><select aria-label={`Status kartu ID ${incident.employeeName}`} value={incident.status} onChange={(event) => updateCardIncident(index, 'status', event.target.value)} className="h-8 rounded-lg border border-white/10 bg-[#0a0d11] px-2 text-[10px] text-slate-200 outline-none focus:border-lime-300/70"><option>Belum ada</option><option>Tertinggal</option><option>Rusak</option></select></td></tr>)}</tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-[10px] text-slate-500">Belum ada: {countByCardStatus(draft.cardIncidents, 'Belum ada')} · Tertinggal: {countByCardStatus(draft.cardIncidents, 'Tertinggal')} · Rusak: {countByCardStatus(draft.cardIncidents, 'Rusak')}</p>
            </PreviewSection>

            <div className="grid gap-3 lg:grid-cols-2">
              <PreviewSection title="Tugas & kegiatan">
                {draft.tasks.length ? <ul className="flex flex-col gap-2">{draft.tasks.map((task, index) => <li key={`${task.task}-${index}`} className="rounded-lg bg-white/[0.025] px-2.5 py-2"><div className="flex items-start justify-between gap-3"><p className="text-[11px] leading-5 text-slate-300">{task.task}</p><span className="shrink-0 text-[10px] text-lime-100">{task.status}</span></div>{task.assignee ? <p className="mt-1 text-[10px] text-slate-600">PIC: {task.assignee}</p> : null}</li>)}</ul> : <p className="text-[11px] text-slate-500">Tidak ada tugas terstruktur.</p>}
              </PreviewSection>
              <PreviewSection title="Situasi, cuaca & temuan">
                <dl className="grid grid-cols-2 gap-2 text-[11px]">{[['Situasi', draft.situation], ['Lalu lintas', draft.traffic], ['Cuaca', draft.weather]].map(([label, value]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="mt-0.5 text-slate-200">{value || 'Belum disebut'}</dd></div>)}</dl>
                <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">{draft.cleanedNarrative || 'Belum ada narasi.'}</p>
                {draft.findings.length > 0 ? <p className="mt-2 text-[11px] text-amber-100">Temuan: {draft.findings.join(' · ')}</p> : null}
              </PreviewSection>
            </div>

            <PreviewSection title="Rencana shift berikutnya & kartu parkir">
              {draft.nextShiftPlan.length ? <ul className="flex flex-wrap gap-2">{draft.nextShiftPlan.map((person, index) => <li key={`${person.name}-${index}`} className="rounded-lg bg-white/[0.025] px-2.5 py-2 text-[10px] text-slate-300">{person.name}{person.assignment ? ` · ${person.assignment}` : ''}</li>)}</ul> : <p className="text-[11px] text-slate-500">Rencana shift berikutnya tidak dicantumkan.</p>}
              <div className="mt-3 flex flex-wrap gap-4 border-t border-white/[0.06] pt-2 text-[10px] text-slate-500"><span>Kartu parkir mobil: {draft.parkingCards.cars ?? '—'}</span><span>Motor: {draft.parkingCards.motorcycles ?? '—'}</span><span>Cadangan: {draft.parkingCards.reserve ?? '—'}</span></div>
            </PreviewSection>

            {error ? <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2.5 text-xs text-rose-200">{error}</p> : null}
            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setDraft(null)} disabled={pending} className="h-10 rounded-xl border border-white/10 px-4 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50">Buang pratinjau</button>
              <button type="button" onClick={saveDraft} disabled={pending || !reportCanSave} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50">
                {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                Simpan laporan yang sudah ditinjau
              </button>
            </div>
            {!reportCanSave ? <p className="text-[10px] text-amber-200">Isi tanggal dan shift/regu, atau pastikan daftar temuan kartu ID terbaca sebelum menyimpan.</p> : null}
          </div>
        )}
      </section>
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value, note }: { icon: typeof UsersRound; label: string; value: number | string; note: string }) {
  return (
    <article className="rounded-xl border border-white/[0.07] bg-[#0b0f13] p-3">
      <div className="flex items-center gap-2 text-slate-500"><Icon size={13} aria-hidden="true" /><span className="text-[10px]">{label}</span></div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
    </article>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0b0f13] p-3"><h4 className="mb-2 text-xs font-semibold text-slate-200">{title}</h4>{children}</section>
}

function VehicleList({ title, areas, total }: { title: string; areas: Array<{ location: string; count: number }>; total: number | null }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-[11px]"><span className="font-medium text-slate-300">{title}</span><span className="font-semibold text-white">{total === null ? 'Total belum disebut' : `${total} unit`}</span></div>
      {areas.length ? <ul className="mt-1 flex flex-col gap-1">{areas.map((area, index) => <li key={`${area.location}-${index}`} className="flex justify-between gap-3 text-[10px] text-slate-500"><span>{area.location}</span><span>{area.count} unit</span></li>)}</ul> : <p className="mt-1 text-[10px] text-slate-600">Lokasi belum dirinci.</p>}
    </div>
  )
}

function countByCardStatus(incidents: GuardReportDraft['cardIncidents'], status: GuardReportDraft['cardIncidents'][number]['status']) {
  return incidents.filter((incident) => incident.status === status).length
}
