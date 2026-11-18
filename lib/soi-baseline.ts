export type SoiIndicatorSide = 'Leading' | 'Lagging' | 'CSI'

export type SoiIndicator = {
  category: 'People' | 'System' | 'Devices' | 'Networking' | 'Customer'
  side: SoiIndicatorSide
  name: string
  target: string
  performance: number
  performanceUnit: '%' | 'poin'
  achievementPercent: number
  maturity: number
  sourceNote?: string
}

export type SoiMonthBaseline = {
  period: string
  source: string
  leadingPercent: number
  laggingPercent: number
  csiPercent: number
  overallPercent: number
  fitnessPerformance: number
  fitnessAchievement: number
  skillPercent: number
  safetyPercent: number
  networkingPercent: number
  csiPerformance: number
}

export const soiWeights = { leading: 0.5, lagging: 0.3, csi: 0.2 } as const

export const soiMonthBaselines: SoiMonthBaseline[] = [
  { period: '2026-06', source: 'SOI-AAL_HO-Juni-2026-compressed-f937ad.xlsx', leadingPercent: 98.3787878787879, laggingPercent: 100, csiPercent: 90, overallPercent: 97.189393939394, fitnessPerformance: 48.4551724137931, fitnessAchievement: 60.5689655172414, skillPercent: 88.7931034482759, safetyPercent: 98.9583333333333, networkingPercent: 181.818181818182, csiPerformance: 8.7 },
  { period: '2026-07', source: 'SOI-AAL_HO-Juli-2026-008e15.xlsx', leadingPercent: 96.227969348659, laggingPercent: 100, csiPercent: 90, overallPercent: 96.1139846743295, fitnessPerformance: 48.4551724137931, fitnessAchievement: 60.5689655172414, skillPercent: 88.8888888888889, safetyPercent: 100, networkingPercent: 166.666666666667, csiPerformance: 8.9 },
  { period: '2026-08', source: 'SOI-AAL_HO-Agustus-2026-compressed-b6de23.xlsx', leadingPercent: 89.2633445182171, laggingPercent: 100, csiPercent: 90, overallPercent: 92.6316722591085, fitnessPerformance: 48.7586206896552, fitnessAchievement: 60.948275862069, skillPercent: 89.0325670498084, safetyPercent: 100, networkingPercent: 117.391304347826, csiPerformance: 8.9 },
  { period: '2026-09', source: 'SOI-AAL_HO-September-2026-compressed-1dacb8.xlsx', leadingPercent: 90.5382709647683, laggingPercent: 100, csiPercent: 90, overallPercent: 93.2691354823841, fitnessPerformance: 48.7586206896552, fitnessAchievement: 60.948275862069, skillPercent: 89.0325670498084, safetyPercent: 100, networkingPercent: 126.315789473684, csiPerformance: 8.9 },
  { period: '2026-11', source: 'SOI-AAL_HO-November-2026-compressed-7d662e.xlsx', leadingPercent: 89.15982484948, laggingPercent: 100, csiPercent: 90, overallPercent: 92.57991242474, fitnessPerformance: 48.7586206896552, fitnessAchievement: 60.948275862069, skillPercent: 89.0325670498084, safetyPercent: 100, networkingPercent: 116.666666666667, csiPerformance: 8.9 },
]

export function getSoiIndicators(snapshot: SoiMonthBaseline): SoiIndicator[] {
  const csiAchievement = snapshot.csiPerformance / 4 * 100
  return [
    { category: 'People', side: 'Leading', name: 'BMI', target: 'Average BMI = 60%', performance: 34.48275862068966, performanceUnit: '%', achievementPercent: 57.4712643678161, maturity: 2 },
    { category: 'People', side: 'Leading', name: 'Latihan fisik / Samapta', target: 'Average Samapta = 80', performance: snapshot.fitnessPerformance, performanceUnit: 'poin', achievementPercent: snapshot.fitnessAchievement, maturity: 2 },
    { category: 'People', side: 'Leading', name: 'Keterampilan', target: 'Skill Readiness = 100%', performance: snapshot.skillPercent, performanceUnit: '%', achievementPercent: snapshot.skillPercent, maturity: 2 },
    { category: 'System', side: 'Leading', name: 'Compliance SRA', target: 'Compliance = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'System', side: 'Leading', name: 'KTA', target: 'Readiness = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Leading', name: 'Readiness devices', target: 'Readiness = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Leading', name: 'Safety equipment', target: 'Readiness = 100%', performance: snapshot.safetyPercent, performanceUnit: '%', achievementPercent: snapshot.safetyPercent, maturity: snapshot.safetyPercent < 100 ? 2 : 3 },
    { category: 'Networking', side: 'Leading', name: 'Networking schedule', target: 'On schedule = 100%', performance: snapshot.networkingPercent, performanceUnit: '%', achievementPercent: snapshot.networkingPercent, maturity: 3 },
    { category: 'People', side: 'Lagging', name: 'Penilaian kedisiplinan', target: 'Kedisiplinan = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'System', side: 'Lagging', name: 'Incident handling', target: 'SLA = 120%', performance: 120, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Lagging', name: 'Report devices', target: 'Issues resolved = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Customer', side: 'CSI', name: 'Customer Satisfaction Index', target: 'Average CSI = 4 (80%)', performance: snapshot.csiPerformance, performanceUnit: 'poin', achievementPercent: csiAchievement, maturity: 3, sourceNote: 'Baris indikator mencatat achievement berbeda dari agregat CSI 90% yang dipakai formula SOI.' },
  ] satisfies SoiIndicator[]
}

export function calculateSoi(leadingPercent: number, laggingPercent: number, csiPercent: number) {
  return (soiWeights.leading * leadingPercent)
    + (soiWeights.lagging * laggingPercent)
    + (soiWeights.csi * csiPercent)
}
