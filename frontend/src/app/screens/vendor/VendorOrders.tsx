import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { listOrders } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Pagination } from '../../components/shared/Pagination';
import type { OrderStatus } from '../../lib/types';
import { formatDate, formatPrice } from '../../lib/utils';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Active', value: 'ACTIVE_RENTAL' },
  { label: 'Return Scheduled', value: 'RETURN_SCHEDULED' },
  { label: 'Pending Inspection', value: 'RETURNED_PENDING_INSPECTION' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Disputed', value: 'DISPUTED' },
];

const PAGE_SIZE = 10;

export function VendorOrders() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, page]);

  async function loadOrders() {
    setLoading(true);
    try {
      const res: any = await listOrders({ status: statusFilter || undefined, page, limit: PAGE_SIZE });
      setOrders(Array.isArray(res.data) ? res.data : []);
      setTotal(res.meta?.total || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Orders</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>{total} orders</p>
        </div>
        <Link to="/vendor/orders/new" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          <Plus size={15} /> Add Offline Order
        </Link>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }} style={{
            padding: '5px 12px', borderRadius: '6px', border: '1px solid',
            borderColor: statusFilter === f.value ? '#738A6E' : '#E4E7E2',
            background: statusFilter === f.value ? 'rgba(115,138,110,0.08)' : '#fff',
            color: statusFilter === f.value ? '#344C3D' : '#8EA58C',
            fontSize: '12px', fontWeight: statusFilter === f.value ? 600 : 400, cursor: 'pointer',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', color: '#8EA58C' }}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', color: '#8EA58C' }}>
          No orders match this filter
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0F3EF', borderBottom: '1px solid #E4E7E2' }}>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Channel</Th>
                <Th>Status</Th>
                <Th>Rental Period</Th>
                <Th>Deposit</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr key={order.id} style={{ borderBottom: idx < orders.length - 1 ? '1px solid #E4E7E2' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={order.product?.thumbnail || order.thumbnail || ''} alt="" style={{ width: '40px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{order.product?.name || order.productName || 'Unknown'}</div>
                        {order.customerEmail && <div style={{ fontSize: '11px', color: '#8EA58C' }}>{order.customerEmail}</div>}
                      </div>
                    </div>
                  </td>
                  <Td>{order.quantity}</Td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: order.channel === 'ONLINE' ? '#4a6848' : '#C97B3D' }}>
                      {order.channel}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={order.status as OrderStatus} size="sm" /></td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#738A6E', whiteSpace: 'nowrap' }}>
                    {formatDate(order.rentalPeriodStart)} → {formatDate(order.rentalPeriodEnd)}
                  </td>
                  <Td>{formatPrice(order.deposit?.amountHeld ?? order.depositAmount ?? 0)}</Td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link to={`/vendor/orders/${order.id}`} style={{ fontSize: '12px', color: '#738A6E', fontWeight: 600, textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E4E7E2' }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={{ page, limit: PAGE_SIZE, total, totalPages }} onPageChange={setPage} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '14px 16px', fontSize: '13px', color: '#344C3D' }}>{children}</td>;
}
