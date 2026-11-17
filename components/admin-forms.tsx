'use client'

import { useActionState } from 'react'
import { createGuardReport, createVisitorRecord } from '@/app/actions/records'
import type { FormState } from '@/app/actions/accounts'

const initialState: FormState = {}

function Field({ label, name, type = 'text', required = false, defaultValue, placeholder }: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  placeholder?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-300">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="h-10 w-full rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
    </label>
  )
}

function SelectField({ label, name, options, defaultValue, required = false }: {
  label: string
  name: string
  options: Array<{ label: string; value: string }>
  defaultValue?: string
  required?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-300">
      {label}
      <select name={name} defaultValue={defaultValue} required={required} className="h-10 w-full rounded-xl border border-white/10 bg-[#0a0d11] px-3 text-sm text-white outline-none focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function TextAreaField({ label, name, rows = 3, required = false, placeholder }: {
  label: string
  name: string
  rows?: number
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-300">
      {label}
      <textarea name={name} rows={rows} required={required} placeholder={placeholder} className="w-full resize-y rounded-xl border border-white/10 bg-[#0a0d11] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/15" />
    </label>
  )
}

function FormFeedback({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs text-rose-200">{state.error}</p>
  if (state.success) return <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2 text-xs text-lime-200">{state.success}</p>
  return null
}

export function VisitorEntryForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createVisitorRecord, initialState)
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tanggal kunjungan" name="visitDate" type="date" required defaultValue={today} />
        <Field label="Nama tamu" name="visitorName" required placeholder="Nama sesuai identitas" />
        <SelectField label="Jenis kelamin" name="gender" required options={[
          { label: 'Pilih', value: '' }, { label: 'Laki-laki', value: 'Laki-laki' }, { label: 'Perempuan', value: 'Perempuan' }, { label: 'Lainnya', value: 'Lainnya' },
        ]} />
        <Field label="No. WhatsApp / telepon" name="phone" type="tel" placeholder="Opsional" />
        <Field label="Jam datang" name="arrivalTime" type="time" required />
        <Field label="Rencana pulang" name="plannedDepartureTime" type="time" required />
        <Field label="Perusahaan / instansi" name="company" placeholder="Nama perusahaan atau perorangan" />
        <Field label="Bertemu dengan" name="host" placeholder="Nama karyawan / PIC" />
        <Field label="Jumlah tamu" name="guestCount" type="number" required defaultValue="1" />
        <SelectField label="Status visitor pass" name="visitorPassStatus" required options={[
          { label: 'Belum diberikan', value: 'belum_diberikan' }, { label: 'Sudah diberikan', value: 'diberikan' }, { label: 'Sudah dikembalikan', value: 'dikembalikan' },
        ]} />
      </div>
      <Field label="Alamat" name="address" placeholder="Alamat perusahaan / tamu" />
      <Field label="Tujuan kedatangan" name="purpose" required placeholder="Meeting, maintenance, pengiriman, dan lainnya" />
      <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs leading-5 text-slate-300">
        <input name="securityInductionConfirmed" type="checkbox" className="mt-1 size-4 accent-lime-300" />
        Tamu telah membaca dan memahami induksi keamanan dan keselamatan.
      </label>
      <TextAreaField label="Catatan petugas" name="notes" rows={2} placeholder="Informasi tambahan, bila ada" />
      <FormFeedback state={state} />
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Menyimpan…' : 'Simpan kontrol tamu'}
      </button>
    </form>
  )
}

export function GuardReportForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createGuardReport, initialState)
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Tanggal laporan" name="reportDate" type="date" required defaultValue={today} />
        <SelectField label="Shift" name="shift" required options={[
          { label: 'Shift I', value: 'I' }, { label: 'Shift II', value: 'II' }, { label: 'Shift III', value: 'III' },
        ]} />
        <SelectField label="Regu" name="team" required options={[
          { label: 'Regu A', value: 'A' }, { label: 'Regu B', value: 'B' }, { label: 'Regu C', value: 'C' }, { label: 'Regu D', value: 'D' },
        ]} />
        <SelectField label="Kehadiran" name="attendanceStatus" required options={[
          { label: 'Lengkap', value: 'Lengkap' }, { label: 'Kurang personel', value: 'Kurang personel' }, { label: 'Tidak lengkap', value: 'Tidak lengkap' },
        ]} />
      </div>
      <Field label="Catatan kehadiran / pengganti" name="attendanceNotes" placeholder="Contoh: 1 personel cuti, digantikan ..." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pos 1" name="pos1" placeholder="Nama petugas" />
        <Field label="Pos 2" name="pos2" placeholder="Nama petugas" />
        <Field label="Pos 3" name="pos3" placeholder="Nama petugas" />
        <Field label="Patroli" name="patrol" placeholder="Danru / Wadanru" />
        <Field label="Lobby" name="lobby" placeholder="Nama petugas" />
        <Field label="Basement" name="basement" placeholder="Nama petugas" />
      </div>
      <TextAreaField label="Kegiatan dan catatan shift" name="activities" rows={3} placeholder="Penjagaan, pengaturan, patroli, serah terima, update situasi, dan lainnya" />
      <TextAreaField label="Serah terima inventaris" name="inventoryHandover" rows={2} placeholder="Satu item per baris, misalnya HT 10 unit; kartu parkir ..." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kendaraan menginap" name="vehicleSummary" placeholder="Mobil ...; motor ..." />
        <SelectField label="Situasi" name="situation" required options={[
          { label: 'Aman', value: 'Aman' }, { label: 'Waspada', value: 'Waspada' }, { label: 'Darurat', value: 'Darurat' },
        ]} />
        <SelectField label="Lalu lintas" name="traffic" required options={[
          { label: 'Lancar', value: 'Lancar' }, { label: 'Padat', value: 'Padat' }, { label: 'Terkendala', value: 'Terkendala' },
        ]} />
        <SelectField label="Cuaca" name="weather" required options={[
          { label: 'Cerah', value: 'Cerah' }, { label: 'Berawan', value: 'Berawan' }, { label: 'Hujan', value: 'Hujan' }, { label: 'Lainnya', value: 'Lainnya' },
        ]} />
      </div>
      <TextAreaField label="Karyawan lembur" name="overtimeNotes" rows={2} placeholder="Divisi, jumlah, atau nama petugas lembur" />
      <TextAreaField label="Tamu / proyek" name="visitorProjectNotes" rows={2} placeholder="Tamu, proyek, PIC, jumlah personel, dan waktu keluar" />
      <TextAreaField label="Temuan" name="findings" rows={2} placeholder="Tuliskan temuan atau isi Nihil" />
      <Field label="Pelapor / Danru" name="reporter" required placeholder="Nama Danru / Wadanru" />
      <FormFeedback state={state} />
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Menyimpan…' : 'Simpan laporan jaga'}
      </button>
    </form>
  )
}
