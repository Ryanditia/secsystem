import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  DoorOpen,
  HardDrive,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Siren,
  Wifi,
} from 'lucide-react'

const navigation = [
  { label: 'Ringkasan', href: '#ringkasan', icon: Activity, active: true },
  { label: 'Perangkat', href: '#perangkat', icon: Camera },
  { label: 'Insiden', href: '#insiden', icon: Siren, count: '2' },
  { label: 'Lokasi', href: '#lokasi', icon: MapPin },
  { label: 'Laporan', href: '#laporan', icon: HardDrive },
]

const incidents = [
  {
    title: 'Kamera kehilangan koneksi',
    detail: 'Gudang Utama · CAM-08',
    time: '8 menit lalu',
    tone: 'amber',
    icon: Wifi,
  },
  {
    title: 'Akses di luar jadwal',
    detail: 'Kantor Pusat · Pintu Samping',
    time: '24 menit lalu',
    tone: 'rose',
    icon: DoorOpen,
  },
]

const locations = [
  { name: 'Kantor Pusat', address: 'Jakarta Selatan', online: 12, total: 12, type: 'Kantor' },
  { name: 'Gudang Utama', address: 'Tangerang, Banten', online: 8, total: 10, type: 'Gudang' },
  { name: 'Kantor Cabang', address: 'Bandung, Jawa Barat', online: 6, total: 6, type: 'Cabang' },
]

const weeklyActivity = [28, 42, 35, 62, 46, 78, 54]

function Brand() {
  return (
    <a href="#ringkasan" className="flex items-center gap-3" aria-label="SecSystem, ke ringkasan">
      <span className="flex size-10 items-center justify-center rounded-xl bg-lime-300 text-slate-950 shadow-[0_0_24px_rgba(190,242,100,0.18)]">
        <ShieldCheck size={22} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-semibold tracking-tight text-white">SecSystem</span>
        <span className="text-[10px] font-medium tracking-[0.16em] text-slate-500">SECURITY OPERATIONS</span>
      </span>
    </a>
  )
}

function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0e12] px-5 py-6 md:flex">
      <Brand />
      <div className="mt-10">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
          {navigation.map(({ label, href, icon: Icon, active, count }) => (
            <a
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {count ? <span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">{count}</span> : null}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-300 opacity-35" />
            <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
          </span>
          Status sistem
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Semua modul utama beroperasi normal.</p>
        <a href="#laporan" className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-lime-200 hover:text-lime-100">
          Lihat kesehatan sistem <ChevronRight size={13} aria-hidden="true" />
        </a>
      </div>
      <a href="#bantuan" className="mt-4 flex items-center gap-2 px-2 py-2 text-xs text-slate-500 hover:text-slate-200">
        <CircleHelp size={15} aria-hidden="true" /> Pusat bantuan
      </a>
    </aside>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  trend,
  accent = 'lime',
}: {
  label: string
  value: string
  note: string
  icon: typeof Activity
  trend?: string
  accent?: 'lime' | 'amber' | 'slate'
}) {
  const iconStyles = {
    lime: 'bg-lime-300/10 text-lime-200',
    amber: 'bg-amber-300/10 text-amber-200',
    slate: 'bg-white/[0.07] text-slate-300',
  }

  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#101419] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-[28px] font-semibold tracking-tight text-white">{value}</p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-xl ${iconStyles[accent]}`}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex min-h-5 items-center gap-1.5 text-[11px] text-slate-500">
        {trend ? <ArrowUpRight size={13} className="text-lime-300" aria-hidden="true" /> : null}
        {trend ? <span className="font-medium text-lime-200">{trend}</span> : null}
        <span>{note}</span>
      </div>
    </article>
  )
}

function IncidentList() {
  return (
    <section id="insiden" className="scroll-mt-6 rounded-2xl border border-white/[0.07] bg-[#101419]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Perlu ditinjau</h2>
          <p className="mt-1 text-[11px] text-slate-500">Aktivitas yang membutuhkan perhatian</p>
        </div>
        <a href="#laporan" className="text-[11px] font-medium text-slate-400 transition hover:text-white">Lihat semua</a>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {incidents.map(({ title, detail, time, tone, icon: Icon }) => (
          <article key={title} className="flex items-center gap-3 px-5 py-4">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone === 'amber' ? 'bg-amber-300/10 text-amber-200' : 'bg-rose-300/10 text-rose-200'}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xs font-medium text-slate-200">{title}</h3>
              <p className="mt-1 truncate text-[10px] text-slate-500">{detail}</p>
            </div>
            <time className="shrink-0 text-[10px] text-slate-600">{time}</time>
          </article>
        ))}
      </div>
      <a href="#perangkat" className="flex items-center justify-center gap-2 border-t border-white/[0.06] px-5 py-3 text-[11px] font-medium text-slate-400 transition hover:text-white">
        Tinjau perangkat <ArrowDownRight size={13} aria-hidden="true" />
      </a>
    </section>
  )
}

function ActivityChart() {
  return (
    <section id="laporan" className="scroll-mt-6 rounded-2xl border border-white/[0.07] bg-[#101419] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Aktivitas sistem</h2>
          <p className="mt-1 text-[11px] text-slate-500">Ringkasan 7 hari terakhir</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400">
          <Activity size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-6 flex h-[112px] items-end gap-2 border-b border-l border-white/[0.07] px-3 pb-0 sm:gap-3">
        {weeklyActivity.map((height, index) => (
          <div key={index} className="flex h-full flex-1 flex-col justify-end">
            <div className={`w-full rounded-t-md ${index === 5 ? 'bg-lime-300' : 'bg-lime-300/25'}`} style={{ height: `${height}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between pl-3 text-[9px] text-slate-600">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-500">
        <span className="size-1.5 rounded-full bg-lime-300" /> Aktivitas terpantau
      </div>
    </section>
  )
}

function Locations() {
  return (
    <section id="lokasi" className="scroll-mt-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Lokasi terpantau</h2>
          <p className="mt-1 text-[11px] text-slate-500">Kondisi perangkat di setiap lokasi</p>
        </div>
        <a href="#perangkat" className="text-[11px] font-medium text-slate-400 hover:text-white">Semua lokasi</a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => {
          const healthy = location.online === location.total
          return (
            <article key={location.name} className="rounded-2xl border border-white/[0.07] bg-[#101419] p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.05] text-slate-300"><MapPin size={16} aria-hidden="true" /></span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-medium ${healthy ? 'bg-lime-300/10 text-lime-200' : 'bg-amber-300/10 text-amber-200'}`}>
                  <span className={`size-1.5 rounded-full ${healthy ? 'bg-lime-300' : 'bg-amber-300'}`} />{healthy ? 'Normal' : 'Perlu dicek'}
                </span>
              </div>
              <h3 className="mt-4 text-xs font-semibold text-white">{location.name}</h3>
              <p className="mt-1 text-[10px] text-slate-500">{location.address} · {location.type}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px]">
                <span className="text-slate-500">Perangkat online</span>
                <span className="font-medium text-slate-200">{location.online}<span className="text-slate-600"> / {location.total}</span></span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function SecurityDashboard() {
  return (
    <main id="ringkasan" className="min-h-screen bg-[#080b0f] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#080b0f]/90 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div className="md:hidden"><Brand /></div>
              <div className="hidden items-center gap-2 text-[11px] text-slate-500 md:flex">
                <span>Workspace</span><ChevronRight size={13} aria-hidden="true" /><span className="text-slate-300">Ringkasan</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <a href="#perangkat" aria-label="Cari perangkat" className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.05] hover:text-white"><Search size={16} aria-hidden="true" /></a>
                <a href="#insiden" aria-label="Lihat notifikasi insiden" className="relative flex size-9 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.05] hover:text-white">
                  <Bell size={16} aria-hidden="true" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-300" />
                </a>
                <div className="ml-1 flex items-center gap-2 border-l border-white/[0.08] pl-3 sm:ml-2 sm:pl-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#26302a] text-[11px] font-semibold text-lime-200">AD</span>
                  <span className="hidden text-xs font-medium text-slate-300 sm:inline">Admin</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-7 sm:px-7 sm:pb-10 sm:pt-9 lg:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-lime-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">Sistem operasional</span>
                  <span className="rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-slate-500">DATA DEMO</span>
                </div>
                <h1 className="text-[25px] font-semibold tracking-tight text-white sm:text-[30px]">Dashboard keamanan</h1>
                <p className="mt-1.5 text-xs text-slate-500">Pantau perangkat, lokasi, dan aktivitas keamanan dalam satu tempat.</p>
              </div>
              <a href="#perangkat" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-slate-950 transition hover:bg-lime-200">
                <Check size={15} aria-hidden="true" /> Lihat perangkat
              </a>
            </div>

            <section id="perangkat" aria-label="Ringkasan perangkat" className="mt-6 grid scroll-mt-24 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Perangkat online" value="26 / 28" note="2 perangkat perlu diperiksa" icon={Camera} accent="lime" />
              <MetricCard label="Lokasi aktif" value="3" note="Semua lokasi terhubung" icon={MapPin} accent="slate" />
              <MetricCard label="Insiden terbuka" value="2" note="Menunggu tindak lanjut" icon={Siren} accent="amber" />
              <MetricCard label="Kesehatan sistem" value="98.4%" note="Stabil dalam 7 hari" icon={Radio} trend="+1.2%" accent="lime" />
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
              <IncidentList />
              <ActivityChart />
            </div>

            <div className="mt-7">
              <Locations />
            </div>

            <section id="bantuan" className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#101419] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-slate-300"><Clock3 size={15} aria-hidden="true" /></span>
                <div>
                  <h2 className="text-xs font-medium text-slate-200">Butuh bantuan?</h2>
                  <p className="mt-1 text-[10px] text-slate-500">Hubungi administrator sistem untuk bantuan perangkat dan akses.</p>
                </div>
              </div>
              <a href="mailto:support@secsystem.id" className="inline-flex items-center gap-1 text-[11px] font-medium text-lime-200 hover:text-lime-100">Hubungi support <ArrowUpRight size={13} aria-hidden="true" /></a>
            </section>
            <p className="mt-5 text-center text-[9px] leading-4 text-slate-600">Tampilan ini menggunakan data simulasi. Hubungkan perangkat keamanan Anda untuk menampilkan data aktual.</p>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-1 overflow-x-auto border-t border-white/[0.08] bg-[#0b0e12]/95 px-3 py-2 backdrop-blur md:hidden" aria-label="Navigasi bawah">
        {navigation.map(({ label, href, icon: Icon, active }) => (
          <a key={label} href={href} aria-current={active ? 'page' : undefined} className={`flex min-w-[62px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[9px] ${active ? 'text-lime-200' : 'text-slate-500'}`}>
            <Icon size={16} aria-hidden="true" />{label}
          </a>
        ))}
      </div>
    </main>
  )
}
