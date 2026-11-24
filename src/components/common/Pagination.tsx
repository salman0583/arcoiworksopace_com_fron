// frontend/src/components/common/Pagination.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
  itemName?: string;
  style?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
  onPageChange,
  isLoading = false,
  itemName = 'items',
  style,
}) => {
  if (totalCount === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderTop: '1px solid #E5E9F0',
        backgroundColor: '#FFFFFF',
        fontSize: '13px',
        color: '#667085',
        flexWrap: 'wrap',
        gap: '12px',
        ...style,
      }}
    >
      <div>
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalCount}</strong> {itemName}
        {totalPages > 1 && (
          <span style={{ color: '#98A2B3', marginLeft: '6px' }}>
            (Page {currentPage} of {totalPages})
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <ChevronLeft size={14} />
          Previous
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};
