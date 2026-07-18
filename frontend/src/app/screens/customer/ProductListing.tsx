import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, SlidersHorizontal, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { formatPrice, getPricingStartingPrice } from '../../lib/utils';
import { Pagination } from '../../components/shared/Pagination';
import { listProducts, getCategories } from '../../lib/api';
import { toast } from 'sonner';

const GRID_PAGE_SIZE = 6;
const LIST_PAGE_SIZE = 10;

export function ProductListing() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  const pageSize = viewMode === 'grid' ? GRID_PAGE_SIZE : LIST_PAGE_SIZE;
  const paged = products.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, categoryId, sort, order, page]);

  async function loadCategories() {
    try {
      const res = await getCategories();
      if (res.data) setCategories(res.data);
    } catch (e) {
      toast.error('Failed to load categories');
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await listProducts({
        page,
        limit: pageSize,
        search,
        category: categoryId,
      });
      if (res.data) {
        setProducts(res.data.data || []);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (e) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  function switchView(v: 'grid' | 'list') {
    if (v !== viewMode) {
      setViewMode(v);
      setPage(1);
      setTransitionKey(prev => prev + 1);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  if (loading && products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8EA58C' }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading products…</div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <br></br>
      {/* Filter bar */}
      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(115,138,110,0.2)', borderRadius: '18px',
        padding: '14px 18px', marginBottom: '20px',
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
        boxShadow: '0 4px 20px rgba(52,76,61,0.05)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} color="#8EA58C" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1px solid rgba(115,138,110,0.2)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#FAFAF8', color: '#344C3D', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#738A6E'}
            onBlur={e => e.target.style.borderColor = 'rgba(115,138,110,0.2)'}
          />
        </div>

        <SlidersHorizontal size={14} color="#8EA58C" />

        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
        </select>

        <button
          onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(115,138,110,0.2)', background: '#FAFAF8', color: '#344C3D', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
        >
          <ArrowUpDown size={13} />
          {order === 'asc' ? 'Asc' : 'Desc'}
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(115,138,110,0.08)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => switchView('grid')}
            title="Grid view"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '7px', border: 'none',
              background: viewMode === 'grid' ? '#344C3D' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : '#738A6E',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => switchView('list')}
            title="List view"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '7px', border: 'none',
              background: viewMode === 'list' ? '#344C3D' : 'transparent',
              color: viewMode === 'list' ? '#fff' : '#738A6E',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Product display */}
      {products.length === 0 ? (
        <EmptyState message="No products match your filters." />
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW ── */
        <div key={transitionKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '8px' }}>
          {paged.map((product, idx) => {
            const startingPrice = product.startingPrice || 0;
            const isUnavailable = product.inventory?.available === 0;
            return (
              <Link key={product.id} to={`/customer/products/${product.id}`} style={{ textDecoration: 'none', animation: `cardFadeIn 0.4s ease both`, animationDelay: `${idx * 55}ms` }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(115,138,110,0.15)', borderRadius: '18px',
                    overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 4px 16px rgba(52,76,61,0.04)',
                    opacity: isUnavailable ? 0.72 : 1,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-10px) scale(1.015)';
                    el.style.boxShadow = '0 24px 56px rgba(52,76,61,0.14)';
                    el.style.borderColor = 'rgba(115,138,110,0.4)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(0) scale(1)';
                    el.style.boxShadow = '0 4px 16px rgba(52,76,61,0.04)';
                    el.style.borderColor = 'rgba(115,138,110,0.15)';
                  }}
                >
                  <div style={{ position: 'relative', height: '200px', overflow: 'hidden', background: '#F0F3EF' }}>
                    <img src={product.thumbnail || ''} alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.08)'}
                      onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,35,25,0.4) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', background: 'rgba(20,35,25,0.75)', backdropFilter: 'blur(6px)', color: 'rgba(191,207,187,0.95)' }}>
                        {product.category?.name}
                      </span>
                    </div>
                    {isUnavailable && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', background: 'rgba(201,123,61,0.92)', color: '#fff' }}>Unavailable</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '10px', left: '12px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>from </span>
                      <span style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{formatPrice(startingPrice)}</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#344C3D', fontSize: '14px', marginBottom: '3px', lineHeight: 1.35 }}>{product.name}</div>
                    <div style={{ fontSize: '11px', color: '#8EA58C', marginBottom: '12px' }}>{product.brand} · {product.vendorName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isUnavailable ? '#C97B3D' : '#4a6848' }}>
                        {isUnavailable ? 'Out of stock' : `${product.inventory?.available} available`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', background: '#344C3D', color: '#fff' }}>
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
          {paged.map(product => {
            const startingPrice = product.startingPrice || 0;
            const isUnavailable = product.inventory?.available === 0;
            return (
              <Link key={product.id} to={`/customer/products/${product.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(115,138,110,0.15)', borderRadius: '16px',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '0',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: '0 2px 10px rgba(52,76,61,0.04)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateX(6px)';
                    el.style.boxShadow = '0 8px 32px rgba(52,76,61,0.12)';
                    el.style.borderColor = 'rgba(115,138,110,0.4)';
                    el.style.background = '#fff';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateX(0)';
                    el.style.boxShadow = '0 2px 10px rgba(52,76,61,0.04)';
                    el.style.borderColor = 'rgba(115,138,110,0.15)';
                    el.style.background = 'rgba(255,255,255,0.9)';
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '110px', height: '90px', flexShrink: 0, overflow: 'hidden', background: '#F0F3EF' }}>
                    <img src={product.thumbnail || ''} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.1)'}
                      onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'}
                    />
                    {isUnavailable && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>Unavailable</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 700, color: '#344C3D', fontSize: '14px' }}>{product.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: 'rgba(52,76,61,0.08)', color: '#4a6848' }}>{product.category?.name}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8EA58C' }}>{product.brand} · {product.vendorName}</div>
                    </div>

                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '10px', color: '#8EA58C' }}>from</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#344C3D', letterSpacing: '-0.01em' }}>{formatPrice(startingPrice)}</div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: isUnavailable ? '#C97B3D' : '#4a6848', marginBottom: '6px' }}>
                        {isUnavailable ? 'Out of stock' : `${product.inventory?.available} available`}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '100px', background: '#344C3D', color: '#fff', whiteSpace: 'nowrap' }}>
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination
        meta={{ page, limit: pageSize, total, totalPages }}
        onPageChange={p => setPage(p)}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '80px 24px',
      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px',
    }}>
      <div style={{ fontSize: '44px', marginBottom: '14px' }}>🔍</div>
      <div style={{ fontWeight: 700, color: '#344C3D', fontSize: '17px', marginBottom: '6px' }}>No results found</div>
      <div style={{ fontSize: '14px', color: '#8EA58C' }}>{message}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '10px',
  border: '1px solid rgba(115,138,110,0.2)', background: '#FAFAF8',
  fontSize: '13px', color: '#344C3D', outline: 'none', cursor: 'pointer', fontWeight: 500,
};
