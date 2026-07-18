import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getInventory, updateInventory, getProductById } from '../../lib/api';

export function ManageInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [available, setAvailable] = useState(0);
  const [maintenance, setMaintenance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  async function loadData(productId: string) {
    try {
      const [productRes, inventoryRes] = await Promise.all([
        getProductById(productId),
        getInventory(productId)
      ]);
      if (productRes.data?.data) setProduct(productRes.data.data);
      if (inventoryRes.data?.data) {
        setInventory(inventoryRes.data.data);
        setAvailable(inventoryRes.data.data.available);
        setMaintenance(inventoryRes.data.data.maintenance);
      }
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setInitialLoad(false);
    }
  }

  async function handleSave() {
    if (!id) return;
    setLoading(true);
    try {
      await updateInventory(id, { available, maintenance });
      toast.success('Inventory updated successfully');
      await loadData(id);
    } catch (e) {
      toast.error('Failed to update inventory');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <div style={{ color: '#8EA58C', padding: '32px', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  if (!product || !inventory) {
    return <div style={{ color: '#8EA58C', padding: '32px' }}>Product not found</div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Manage Inventory</h1>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px' }}>{product.name}</p>

      <div style={{ background: '#BFCFBB', border: '1px solid #8EA58C', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#344C3D' }}>
        <strong>Note:</strong> Reserved and rented counts are system-managed and cannot be edited directly. Contact support if there is a discrepancy.
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#F0F3EF', borderBottom: '1px solid #E4E7E2' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inventory Breakdown</div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Editable: available */}
          <InventoryField
            label="Available"
            value={available}
            onChange={setAvailable}
            editable
            description="Units ready to rent"
          />

          {/* Locked: reserved */}
          <InventoryField
            label="Reserved"
            value={inventory.reserved}
            editable={false}
            locked
            description="Held for confirmed orders (system-managed)"
          />

          {/* Locked: rented */}
          <InventoryField
            label="Rented Out"
            value={inventory.rented}
            editable={false}
            locked
            description="Currently with customers (system-managed)"
          />

          {/* Editable: maintenance */}
          <InventoryField
            label="Under Maintenance"
            value={maintenance}
            onChange={setMaintenance}
            editable
            description="Units being serviced or repaired"
          />
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #E4E7E2', background: '#F0F3EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: '#738A6E' }}>
            Total: <strong style={{ color: '#344C3D' }}>{available + inventory.reserved + inventory.rented + maintenance}</strong> units
          </div>
          <button onClick={handleSave} disabled={loading} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryField({ label, value, onChange, editable, locked, description }: {
  label: string; value: number; onChange?: (v: number) => void;
  editable: boolean; locked?: boolean; description?: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: locked ? '#BFCFBB' : '#344C3D' }}>{label}</span>
          {locked && <Lock size={12} color="#BFCFBB" />}
        </div>
        {description && <div style={{ fontSize: '11px', color: '#8EA58C' }}>{description}</div>}
      </div>
      <div>
        {editable ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => onChange?.(Math.max(0, value - 1))} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: 'pointer', fontSize: '16px', color: '#344C3D' }}>−</button>
            <input
              type="number" value={value} min={0}
              onChange={e => onChange?.(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: '56px', textAlign: 'center', padding: '6px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '14px', fontWeight: 600, color: '#344C3D', outline: 'none' }}
            />
            <button onClick={() => onChange?.(value + 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: 'pointer', fontSize: '16px', color: '#344C3D' }}>+</button>
          </div>
        ) : (
          <div style={{ width: '56px', textAlign: 'center', padding: '6px', borderRadius: '6px', background: '#F0F3EF', fontSize: '14px', fontWeight: 600, color: '#BFCFBB', border: '1px solid #E4E7E2' }}>
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
