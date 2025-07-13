import { z } from 'zod'

// User Management Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['user', 'miner', 'trader', 'admin', 'enterprise']),
  tier: z.enum(['free', 'basic', 'premium', 'enterprise']),
  isVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  preferences: z.record(z.any()),
  lastLogin: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UserWalletSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  chain: z.enum(['nockchain', 'solana', 'ethereum']),
  address: z.string(),
  publicKey: z.string().optional(),
  label: z.string().optional(),
  isDefault: z.boolean(),
  balance: z.number().nonnegative(),
  lastBalanceUpdate: z.date(),
  createdAt: z.date(),
})

export const UserSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionToken: z.string(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  location: z.string().optional(),
  isActive: z.boolean(),
  expiresAt: z.date(),
  createdAt: z.date(),
  lastActivity: z.date(),
})

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().default('en'),
  currency: z.string().default('USD'),
  timezone: z.string(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    mining: z.boolean(),
    trading: z.boolean(),
    security: z.boolean(),
    marketing: z.boolean(),
  }),
  privacy: z.object({
    profileVisible: z.boolean(),
    statsVisible: z.boolean(),
    activityVisible: z.boolean(),
  }),
  trading: z.object({
    defaultSlippage: z.number().min(0).max(1),
    advancedMode: z.boolean(),
    confirmTransactions: z.boolean(),
    autoApproval: z.boolean(),
    gasPreference: z.enum(['slow', 'standard', 'fast']),
  }),
  mining: z.object({
    autoCompound: z.boolean(),
    payoutThreshold: z.number().positive(),
    hardwareMonitoring: z.boolean(),
    alertsEnabled: z.boolean(),
  }),
})

// Authentication Types
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.string().default('Bearer'),
  scope: z.array(z.string()),
  issuedAt: z.date(),
})

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().optional(),
  rememberMe: z.boolean().default(false),
})

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  referralCode: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true),
  acceptPrivacy: z.boolean().refine(val => val === true),
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
})

export const PasswordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// KYC Types
export const KYCDocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement']),
  filename: z.string(),
  fileUrl: z.string().url(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewedBy: z.string().uuid().optional(),
  reviewedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
})

export const KYCVerificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  level: z.enum(['basic', 'intermediate', 'advanced']),
  status: z.enum(['not_started', 'in_progress', 'pending_review', 'approved', 'rejected']),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.date(),
    nationality: z.string(),
    phoneNumber: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
  }).optional(),
  documents: z.array(z.string().uuid()),
  riskScore: z.number().min(0).max(100).optional(),
  reviewedBy: z.string().uuid().optional(),
  reviewedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Activity and Analytics Types
export const UserActivitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([
    'login',
    'logout',
    'mining_start',
    'mining_stop',
    'bridge_transaction',
    'trade_executed',
    'withdrawal',
    'deposit',
    'settings_changed',
    'kyc_submitted',
    'password_changed',
    '2fa_enabled',
    '2fa_disabled',
  ]),
  description: z.string(),
  metadata: z.record(z.any()),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  location: z.string().optional(),
  timestamp: z.date(),
})

export const UserStatsSchema = z.object({
  userId: z.string().uuid(),
  totalMiningRewards: z.number().nonnegative(),
  totalTradingVolume: z.number().nonnegative(),
  totalBridgeVolume: z.number().nonnegative(),
  totalFeesPaid: z.number().nonnegative(),
  activeMiningDays: z.number().int().nonnegative(),
  successfulTrades: z.number().int().nonnegative(),
  totalTransactions: z.number().int().nonnegative(),
  referralsCount: z.number().int().nonnegative(),
  accountAge: z.number().int().nonnegative(), // days
  lastActivity: z.date(),
  timestamp: z.date(),
})

// Notification Types
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([
    'mining_reward',
    'payout_sent',
    'bridge_completed',
    'trade_executed',
    'security_alert',
    'maintenance',
    'news',
    'referral_bonus',
  ]),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  read: z.boolean(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  channel: z.enum(['in_app', 'email', 'push', 'sms']),
  sentAt: z.date().optional(),
  readAt: z.date().optional(),
  createdAt: z.date(),
})

// Export TypeScript types
export type User = z.infer<typeof UserSchema>
export type UserWallet = z.infer<typeof UserWalletSchema>
export type UserSession = z.infer<typeof UserSessionSchema>
export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type AuthToken = z.infer<typeof AuthTokenSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>
export type PasswordReset = z.infer<typeof PasswordResetSchema>
export type KYCDocument = z.infer<typeof KYCDocumentSchema>
export type KYCVerification = z.infer<typeof KYCVerificationSchema>
export type UserActivity = z.infer<typeof UserActivitySchema>
export type UserStats = z.infer<typeof UserStatsSchema>
export type Notification = z.infer<typeof NotificationSchema>

// Utility types
export type UserRole = 'user' | 'miner' | 'trader' | 'admin' | 'enterprise'
export type UserTier = 'free' | 'basic' | 'premium' | 'enterprise'
export type KYCLevel = 'basic' | 'intermediate' | 'advanced'
export type KYCStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'