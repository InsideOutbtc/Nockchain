import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHashrate(hashrate: number): string {
  if (hashrate >= 1000000) return `${(hashrate / 1000000).toFixed(1)}TH/s`;
  if (hashrate >= 1000) return `${(hashrate / 1000).toFixed(1)}GH/s`;
  return `${hashrate.toFixed(1)}MH/s`;
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatPrice(price: number): string {
  return price.toFixed(4);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'online': case 'confirmed': case 'filled':
      return 'text-green-400';
    case 'warning': case 'pending': case 'partial':
      return 'text-yellow-400';
    case 'offline': case 'failed': case 'cancelled':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeAgo(timestamp: string | Date): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}