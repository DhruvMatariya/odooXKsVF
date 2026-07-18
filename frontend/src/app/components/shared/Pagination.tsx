import type { PaginationMeta } from '../../lib/types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total, limit } = meta;
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #E4E7E2', marginTop: '8px' }}>
      <span style={{ fontSize: '13px', color: '#738A6E' }}>
        Showing {start}–{end} of {total} results
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <PagBtn
          label="← Prev"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        />

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#8EA58C', fontSize: '13px' }}>…</span>
          ) : (
            <PagBtn
              key={p}
              label={String(p)}
              active={p === page}
              onClick={() => onPageChange(p as number)}
            />
          )
        )}

        <PagBtn
          label="Next →"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PagBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px', fontSize: '13px', borderRadius: '6px',
        border: '1px solid',
        borderColor: active ? '#738A6E' : '#E4E7E2',
        background: active ? '#738A6E' : 'transparent',
        color: active ? '#fff' : disabled ? '#BFCFBB' : '#344C3D',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: active ? 600 : 400,
        minWidth: '32px',
      }}
    >
      {label}
    </button>
  );
}
