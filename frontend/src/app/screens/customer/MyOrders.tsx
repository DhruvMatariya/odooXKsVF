import { useState } from 'react';
import { Link } from 'react-router';
import { ORDERS } from '../../lib/mockData';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Pagination } from '../../components/shared/Pagination';
import type { OrderStatus } from '../../lib/types';
import { formatDate, formatPrice } from '../../lib/utils';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE_RENTAL' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Return Scheduled', value: 'RETURN_SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Disputed', value: 'DISPUTED' },
];

const PAGE_SIZE = 5;

export function MyOrders() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = ORDERS.filter(o => !statusFilter || o.status === statusFilter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>My Orders</h1>
        <p style={{ color: '#738A6E', fontSize: '14px' }}>{filtered.length} orders found</p>
      </div>

      {/* Status filter tabs */}
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

      {paged.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>No orders yet</div>
          <div style={{ fontSize: '14px', color: '#8EA58C', marginBottom: '20px' }}>Your rental orders will appear here</div>
          <Link to="/customer/products" style={{ padding: '8px 20px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Browse Products</Link>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0F3EF', borderBottom: '1px solid #E4E7E2' }}>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Status</Th>
                <Th>Rental Period</Th>
                <Th>Channel</Th>
                <Th>Deposit</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((order, idx) => (
                <tr key={order.id} style={{ borderBottom: idx < paged.length - 1 ? '1px solid #E4E7E2' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={order.product.thumbnail} alt={order.product.name} style={{ width: '40px', height: '32px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{order.product.name}</span>
                    </div>
                  </td>
                  <Td>{order.quantity}</Td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={order.status as OrderStatus} size="sm" /></td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#738A6E', whiteSpace: 'nowrap' }}>
                    {formatDate(order.rentalPeriodStart)} → {formatDate(order.rentalPeriodEnd)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: order.channel === 'ONLINE' ? 'rgba(115,138,110,0.1)' : 'rgba(201,123,61,0.1)', color: order.channel === 'ONLINE' ? '#4a6848' : '#C97B3D' }}>
                      {order.channel}
                    </span>
                  </td>
                  <Td>{formatPrice(order.deposit.amountHeld)}</Td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link to={`/customer/orders/${order.id}`} style={{ fontSize: '12px', color: '#738A6E', fontWeight: 600, textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E4E7E2' }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={{ page, limit: PAGE_SIZE, total: filtered.length, totalPages }} onPageChange={setPage} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '14px 16px', fontSize: '13px', color: '#344C3D' }}>{children}</td>;
}
