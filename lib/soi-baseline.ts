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

export const soiBaseline = {
  period: '2026-07',
  source: 'SOI-AAL_HO-Juli-2026-008e15.xlsx · One Sheet Report',
  weights: { leading: 0.5, lagging: 0.3, csi: 0.2 },
  leadingPercent: 96.22796934865901,
  laggingPercent: 100,
  csiPercent: 90,
  overallPercent: 96.1139846743295,
  indicators: [
    { category: 'People', side: 'Leading', name: 'BMI', target: 'Average BMI = 60%', performance: 34.48275862068966, performanceUnit: '%', achievementPercent: 57.4712643678161, maturity: 2 },
    { category: 'People', side: 'Leading', name: 'Latihan fisik / Samapta', target: 'Average Samapta = 80', performance: 48.4551724137931, performanceUnit: 'poin', achievementPercent: 60.56896551724138, maturity: 2 },
    { category: 'People', side: 'Leading', name: 'Keterampilan', target: 'Skill Readiness = 100%', performance: 88.88888888888889, performanceUnit: '%', achievementPercent: 88.88888888888889, maturity: 2 },
    { category: 'System', side: 'Leading', name: 'Compliance SRA', target: 'Compliance = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'System', side: 'Leading', name: 'KTA', target: 'Readiness = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Leading', name: 'Readiness devices', target: 'Readiness = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Leading', name: 'Safety equipment', target: 'Readiness = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Networking', side: 'Leading', name: 'Networking schedule', target: 'On schedule = 100%', performance: 166.66666666666666, performanceUnit: '%', achievementPercent: 166.66666666666666, maturity: 3 },
    { category: 'People', side: 'Lagging', name: 'Penilaian kedisiplinan', target: 'Kedisiplinan = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'System', side: 'Lagging', name: 'Incident handling', target: 'SLA = 120%', performance: 120, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Devices', side: 'Lagging', name: 'Report devices', target: 'Issues resolved = 100%', performance: 100, performanceUnit: '%', achievementPercent: 100, maturity: 3 },
    { category: 'Customer', side: 'CSI', name: 'Customer Satisfaction Index', target: 'Average CSI = 4 (80%)', performance: 8.9, performanceUnit: 'poin', achievementPercent: 222.5, maturity: 3, sourceNote: 'Baris indikator mencatat achievement 222.5%; formula SOI memakai Average Customer Satisfaction Index 90% dari baris ringkasan.' },
  ] satisfies SoiIndicator[],
} as const

export function calculateSoi(leadingPercent: number, laggingPercent: number, csiPercent: number) {
  return (soiBaseline.weights.leading * leadingPercent)
    + (soiBaseline.weights.lagging * laggingPercent)
    + (soiBaseline.weights.csi * csiPercent)
}
