'use client';

import React from 'react';
import { Pagination } from '@/types';

interface PaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function PaginationComponent({ pagination, onPageChange }: PaginationProps) {
  const { page, totalPages, hasNext, hasPrev } = pagination;

  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (i === page - 2 || i === page + 2) {
      pages.push('...');
    }
  }

  // Remove duplicate ellipsis
  const filteredPages = pages.filter(
    (p, index) => !(p === '...' && pages[index - 1] === '...')
  );

  return (
    <div className="flex justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className={`
          px-4 py-2 rounded-lg border transition-colors
          ${hasPrev
            ? 'border-gray-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
            : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        ← Prev
      </button>

      {filteredPages.map((p, index) =>
        typeof p === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(p)}
            className={`
              px-4 py-2 rounded-lg border transition-colors
              ${p === page
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
              }
            `}
          >
            {p}
          </button>
        ) : (
          <span
            key={index}
            className="px-4 py-2 text-gray-400"
          >
            {p}
          </span>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className={`
          px-4 py-2 rounded-lg border transition-colors
          ${hasNext
            ? 'border-gray-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
            : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        Next →
      </button>
    </div>
  );
}
