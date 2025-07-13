import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hashrate formatting utilities
export function formatHashrate(hashrate: number, short = false): string {
  if (hashrate === 0) return '0 H/s'
  
  const units = short 
    ? ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']
    : ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']
  
  let unitIndex = 0
  let value = hashrate
  
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000
    unitIndex++
  }
  
  // Format with appropriate decimal places
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2
  
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

// Currency formatting
export function formatCurrency(amount: number, currency = 'NOCK', decimals = 2): string {
  if (amount === 0) return `0 ${currency}`
  
  // For large numbers, use compact notation
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${currency}`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${currency}`
  }
  
  return `${amount.toFixed(decimals)} ${currency}`
}

// Number formatting with locale support
export function formatNumber(num: number, compact = false): string {
  if (compact && num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (compact && num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  
  return new Intl.NumberFormat('en-US').format(num)
}

// Time formatting utilities
export function formatTime(date: Date, context?: string): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // For chart contexts, use appropriate formatting
  if (context === '1h') {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  } else if (context === '24h') {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  } else if (context === '7d') {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit'
    })
  } else if (context === '30d') {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Relative time formatting
  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

// Duration formatting
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const days = Math.floor(seconds / 86400)
    const remainingHours = Math.floor((seconds % 86400) / 3600)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

// Percentage formatting
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Difficulty formatting (similar to hashrate)
export function formatDifficulty(difficulty: number): string {
  return formatHashrate(difficulty, true).replace('H/s', '')
}

// Address formatting for display
export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// Transaction hash formatting
export function formatTxHash(hash: string): string {
  return formatAddress(hash, 8, 6)
}

// File size formatting
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Status color utilities
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
    case 'confirmed':
    case 'completed':
    case 'success':
      return 'text-green-500'
    case 'offline':
    case 'inactive':
    case 'failed':
    case 'error':
      return 'text-red-500'
    case 'pending':
    case 'processing':
    case 'warning':
      return 'text-yellow-500'
    case 'idle':
    case 'paused':
      return 'text-blue-500'
    default:
      return 'text-muted-foreground'
  }
}

// Status badge utilities
export function getStatusBadgeClass(status: string): string {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
    case 'confirmed':
    case 'completed':
    case 'success':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`
    case 'offline':
    case 'inactive':
    case 'failed':
    case 'error':
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`
    case 'pending':
    case 'processing':
    case 'warning':
      return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`
    case 'idle':
    case 'paused':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`
  }
}

// Mining efficiency calculation
export function calculateEfficiency(validShares: number, totalShares: number): number {
  if (totalShares === 0) return 0
  return (validShares / totalShares) * 100
}

// Pool luck calculation
export function calculateLuck(actualShares: number, expectedShares: number): number {
  if (expectedShares === 0) return 0
  return (expectedShares / actualShares) * 100
}

// Estimated earnings calculation
export function calculateEstimatedEarnings(
  hashrate: number, 
  networkHashrate: number, 
  blockReward: number, 
  blockTime: number // in seconds
): number {
  if (networkHashrate === 0) return 0
  
  const shareOfNetwork = hashrate / networkHashrate
  const blocksPerDay = (24 * 60 * 60) / blockTime
  const dailyReward = blocksPerDay * blockReward * shareOfNetwork
  
  return dailyReward
}

// Profitability calculation
export function calculateProfitability(
  earnings: number,
  powerConsumption: number, // watts
  electricityCost: number, // per kWh
  hardwareCost: number = 0
): { profit: number; roi: number } {
  const dailyPowerCost = (powerConsumption * 24 * electricityCost) / 1000
  const profit = earnings - dailyPowerCost
  const roi = hardwareCost > 0 ? (profit * 365) / hardwareCost * 100 : 0
  
  return { profit, roi }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Color interpolation for charts
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple color interpolation - in a real app you might use a more sophisticated library
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')
  
  const r1 = parseInt(hex1.substr(0, 2), 16)
  const g1 = parseInt(hex1.substr(2, 2), 16)
  const b1 = parseInt(hex1.substr(4, 2), 16)
  
  const r2 = parseInt(hex2.substr(0, 2), 16)
  const g2 = parseInt(hex2.substr(2, 2), 16)
  const b2 = parseInt(hex2.substr(4, 2), 16)
  
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Generate chart colors
export function generateChartColors(count: number): string[] {
  const baseColors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(220, 70%, 50%)',
    'hsl(280, 70%, 50%)',
    'hsl(340, 70%, 50%)',
    'hsl(40, 70%, 50%)',
    'hsl(120, 70%, 50%)',
    'hsl(180, 70%, 50%)',
  ]
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count)
  }
  
  // Generate additional colors if needed
  const colors = [...baseColors]
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360 // Golden angle approximation
    colors.push(`hsl(${hue}, 70%, 50%)`)
  }
  
  return colors
}

// Local storage utilities with error handling
export function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// API error handling
export function handleApiError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message
  } else if (error?.message) {
    return error.message
  } else {
    return 'An unexpected error occurred'
  }
}