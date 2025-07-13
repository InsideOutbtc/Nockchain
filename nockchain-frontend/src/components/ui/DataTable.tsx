'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface Column<T> {
  key: keyof T | 'actions';
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    variant?: 'default' | 'primary' | 'secondary' | 'danger';
    show?: (row: T) => boolean;
  }[];
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  filterable = false,
  exportable = false,
  selectable = false,
  pagination = true,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  onRowClick,
  onSelectionChange,
  actions = []
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  }, [data, sortConfig]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchTerm) return sortedData;

    return sortedData.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [sortedData, searchTerm]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;

    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (key: keyof T) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    
    if (onSelectionChange) {
      const selectedData = Array.from(newSelected).map(i => paginatedData[i]);
      onSelectionChange(selectedData);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]); 
    } else {
      const allIndices = new Set(paginatedData.map((_, i) => i));
      setSelectedRows(allIndices);
      onSelectionChange?.(paginatedData);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (value: number, previousValue?: number) => {
    if (previousValue === undefined) return null;
    
    if (value > previousValue) {
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    } else if (value < previousValue) {
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
    return null;
  };

  const formatValue = (value: any, column: Column<T>) => {
    if (column.render) {
      return column.render(value, {} as T, 0);
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'success' : 'error'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  };

  if (loading) {
    return (
      <Card className={`glass-card ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="h-6 w-32 bg-white/10 rounded" />
              <div className="h-8 w-24 bg-white/10 rounded" />
            </div>
            
            {/* Table header */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
              {columns.map((_, i) => (
                <div key={i} className="h-4 bg-white/10 rounded" />
              ))}
            </div>
            
            {/* Table rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                {columns.map((_, j) => (
                  <div key={j} className="h-6 bg-white/5 rounded" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card ${className}`}>
      <CardContent className="p-0">
        {/* Header with controls */}
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input pl-10 pr-4 py-2 w-64"
                  />
                </div>
              )}
              
              {filterable && (
                <Button variant="ghost" size="sm" className="glass-button-secondary">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectable && selectedRows.size > 0 && (
                <Badge variant="neutral" className="mr-2">
                  {selectedRows.size} selected
                </Badge>
              )}
              
              {exportable && (
                <Button variant="ghost" size="sm" className="glass-button-secondary">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {selectable && (
                  <th className="text-left p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/10"
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`text-left p-4 font-medium text-white/80 ${column.className || ''}`}
                    style={{ width: column.width }}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key as keyof T)}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        {column.header}
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <div className="w-4 h-4 opacity-30">
                            <ChevronUp className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td 
                      colSpan={columns.length + (selectable ? 1 : 0)} 
                      className="text-center p-12 text-white/50"
                    >
                      {emptyMessage}
                    </td>
                  </motion.tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onRowClick?.(row, index)}
                    >
                      {selectable && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(index)}
                            onChange={() => handleSelectRow(index)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-white/20 bg-white/10"
                          />
                        </td>
                      )}
                      
                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={`p-4 ${column.className || ''}`}
                        >
                          {column.key === 'actions' ? (
                            <div className="flex items-center gap-2">
                              {actions
                                .filter(action => !action.show || action.show(row))
                                .map((action, actionIndex) => (
                                  <Button
                                    key={actionIndex}
                                    variant={action.variant || 'ghost'}
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      action.onClick(row);
                                    }}
                                    className="glass-button-secondary"
                                  >
                                    {action.icon}
                                    {action.label}
                                  </Button>
                                ))}
                            </div>
                          ) : column.render ? (
                            column.render(row[column.key], row, index)
                          ) : (
                            <div className="flex items-center gap-2">
                              {getStatusIcon(String(row[column.key]))}
                              {formatValue(row[column.key], column)}
                              {getTrendIcon(Number(row[column.key]), Number(row.previous))}
                            </div>
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="p-6 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/60">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to{' '}
              {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="glass-button-secondary"
              >
                Previous
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? 'glass-button-primary' : 'glass-button-secondary'}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="glass-button-secondary"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Common action components for reuse
export const TableActions = {
  View: ({ onClick }: { onClick: () => void }) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="glass-button-secondary">
      <Eye className="w-4 h-4" />
    </Button>
  ),
  
  Edit: ({ onClick }: { onClick: () => void }) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="glass-button-secondary">
      <Edit className="w-4 h-4" />
    </Button>
  ),
  
  Delete: ({ onClick }: { onClick: () => void }) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="text-red-400 hover:text-red-300">
      <Trash2 className="w-4 h-4" />
    </Button>
  ),
  
  More: ({ onClick }: { onClick: () => void }) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="glass-button-secondary">
      <MoreHorizontal className="w-4 h-4" />
    </Button>
  )
};