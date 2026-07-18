import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Pagination } from '../../components/shared/Pagination';
import { Plus, Edit2, Trash2, Package, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { listProducts, deleteProduct } from '../../lib/api';

const PAGE_SIZE = 8;

export function ProductList() {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, [page]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await listProducts({ page, limit: PAGE_SIZE });
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

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      loadProducts();
    } catch (e) {
      toast.error('Failed to delete product');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Products</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>{total} products in catalog</p>
        </div>
        <Link to="/vendor/products/new" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          <Plus size={15} /> Add Product
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F0F3EF', borderBottom: '1px solid #E4E7E2' }}>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Brand</Th>
              <Th>Status</Th>
              <Th>Available</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const isInactive = product.status === 'INACTIVE';
              return (
                <tr key={product.id} style={{ borderBottom: idx < products.length - 1 ? '1px solid #E4E7E2' : 'none', opacity: isInactive ? 0.55 : 1 }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={product.thumbnail} alt={product.name} style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0, filter: isInactive ? 'grayscale(1)' : 'none' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{product.name}</div>
                        <div style={{ fontSize: '11px', color: '#8EA58C' }}>{product.id}</div>
                      </div>
                    </div>
                  </td>
                  <Td>{product.category.name}</Td>
                  <Td>{product.brand}</Td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: product.status === 'ACTIVE' ? '#4a6848' : '#6b7280',
                    }}>
                      {product.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: product.inventory.available === 0 ? '#C97B3D' : '#344C3D',
                    }}>
                      {product.inventory.available}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <ActionIconBtn title="Edit" icon={<Edit2 size={13} />} onClick={() => navigate(`/vendor/products/${product.id}/edit`)} />
                      <ActionIconBtn title="Inventory" icon={<Package size={13} />} onClick={() => navigate(`/vendor/products/${product.id}/inventory`)} />
                      <ActionIconBtn title="Pricing" icon={<BarChart3 size={13} />} onClick={() => navigate(`/vendor/products/${product.id}/pricing`)} />
                      {!isInactive && <ActionIconBtn title="Deactivate" icon={<Trash2 size={13} />} onClick={() => handleDelete(product.id)} danger />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination meta={{ page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) }} onPageChange={setPage} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '14px 16px', fontSize: '13px', color: '#344C3D' }}>{children}</td>;
}

function ActionIconBtn({ title, icon, onClick, danger }: { title: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid', borderColor: danger ? 'rgba(201,123,61,0.3)' : '#E4E7E2', background: danger ? 'rgba(201,123,61,0.06)' : '#fff', color: danger ? '#C97B3D' : '#738A6E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </button>
  );
}
