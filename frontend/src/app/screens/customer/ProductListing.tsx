import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { PRODUCTS, CATEGORIES } from '../../lib/mockData';
import { formatPrice, getPricingStartingPrice } from '../../lib/utils';
import { Pagination } from '../../components/shared/Pagination';
import { Search } from 'lucide-react';

const PAGE_SIZE = 6;

export function ProductListing() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter(p => p.status === 'ACTIVE');
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (categoryId) list = list.filter(p => p.categoryId === categoryId);
    list = list.sort((a, b) => {
      const va = sort === 'price' ? getPricingStartingPrice(a.pricing) : a.name;
      const vb = sort === 'price' ? getPricingStartingPrice(b.pricing) : b.name;
      return order === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [search, categoryId, sort, order]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Browse Products</h1>
        <p style={{ color: '#738A6E', fontSize: '14px' }}>{filtered.length} products available for rent</p>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} color="#8EA58C" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }}
          />
        </div>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
        </select>
        <button onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#FAFAF8', color: '#344C3D', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
          {order === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>

      {/* Product grid */}
      {paged.length === 0 ? (
        <EmptyState message="No products match your filters." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '8px' }}>
          {paged.map(product => {
            const startingPrice = getPricingStartingPrice(product.pricing);
            const isUnavailable = product.inventory.available === 0;
            return (
              <Link key={product.id} to={`/customer/products/${product.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px',
                  overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
                }}>
                  <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#F0F3EF' }}>
                    <img src={product.thumbnail} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(52,76,61,0.85)', color: '#BFCFBB' }}>
                        {product.category.name}
                      </span>
                    </div>
                    {isUnavailable && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(201,123,61,0.9)', color: '#fff' }}>
                          Unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#344C3D', fontSize: '14px', marginBottom: '4px', lineHeight: 1.4 }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8EA58C', marginBottom: '10px' }}>
                      {product.brand} · {product.vendorName}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#8EA58C' }}>from </span>
                        <span style={{ fontWeight: 700, color: '#344C3D', fontSize: '16px' }}>{formatPrice(startingPrice)}</span>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 500, padding: '2px 8px',
                        borderRadius: '999px',
                        background: isUnavailable ? 'rgba(201,123,61,0.12)' : 'rgba(115,138,110,0.12)',
                        color: isUnavailable ? '#C97B3D' : '#4a6848',
                      }}>
                        {isUnavailable ? '0 available' : `${product.inventory.available} available`}
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
        meta={{ page, limit: PAGE_SIZE, total: filtered.length, totalPages }}
        onPageChange={p => setPage(p)}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: '#8EA58C' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
      <div style={{ fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>No results</div>
      <div style={{ fontSize: '14px' }}>{message}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#FAFAF8', fontSize: '13px', color: '#344C3D', outline: 'none', cursor: 'pointer' };
