import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  role: text('role').notNull().default('supervisor'),
  workspaceId: text('workspaceId'),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
})

export const visitorRecords = pgTable('visitor_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull(),
  createdByUserId: text('createdByUserId').notNull(),
  sourceRowHash: text('sourceRowHash').unique(),
  sourceRowIndex: integer('sourceRowIndex'),
  sourceTimestamp: text('sourceTimestamp'),
  visitDate: date('visitDate').notNull(),
  visitorName: text('visitorName').notNull(),
  gender: text('gender').notNull().default(''),
  arrivalTime: text('arrivalTime').notNull().default(''),
  plannedDepartureTime: text('plannedDepartureTime').notNull().default(''),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  host: text('host'),
  purpose: text('purpose'),
  visitorPassConfirmation: text('visitorPassConfirmation'),
  securityInductionConfirmed: boolean('securityInductionConfirmed').notNull().default(false),
  guestCount: text('guestCount').notNull().default('1'),
  visitorPassStatus: text('visitorPassStatus').notNull().default('belum_diberikan'),
  visitStatus: text('visitStatus').notNull().default('terjadwal'),
  checkedInAt: timestamp('checkedInAt', { withTimezone: true }),
  checkedOutAt: timestamp('checkedOutAt', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('visitor_records_workspace_date_idx').on(table.userId, table.visitDate)])

export const guardReports = pgTable('guard_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull(),
  createdByUserId: text('createdByUserId').notNull(),
  reportDate: date('reportDate').notNull(),
  shift: text('shift').notNull(),
  team: text('team').notNull(),
  attendanceStatus: text('attendanceStatus').notNull().default('Lengkap'),
  attendanceNotes: text('attendanceNotes').notNull().default(''),
  staffing: jsonb('staffing').$type<Record<string, string>>().notNull().default({}),
  activities: text('activities').notNull().default(''),
  inventoryHandover: jsonb('inventoryHandover').$type<string[]>().notNull().default([]),
  vehicleSummary: text('vehicleSummary').notNull().default(''),
  situation: text('situation').notNull().default(''),
  traffic: text('traffic').notNull().default(''),
  weather: text('weather').notNull().default(''),
  overtimeNotes: text('overtimeNotes').notNull().default(''),
  visitorProjectNotes: text('visitorProjectNotes').notNull().default(''),
  findings: text('findings').notNull().default(''),
  reporter: text('reporter').notNull().default(''),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('guard_reports_workspace_date_shift_team').on(table.userId, table.reportDate, table.shift, table.team),
  index('guard_reports_workspace_date_idx').on(table.userId, table.reportDate),
])

export const supervisorInvitations = pgTable('supervisor_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull(),
  createdByUserId: text('createdByUserId').notNull(),
  email: text('email').notNull(),
  tokenHash: text('tokenHash').notNull().unique(),
  role: text('role').notNull().default('supervisor'),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('acceptedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})
