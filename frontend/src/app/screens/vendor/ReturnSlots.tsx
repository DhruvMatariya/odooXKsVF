import { useState } from 'react';
import { RETURN_SLOTS } from '../../lib/mockData';
import type { ReturnSlot } from '../../lib/types';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

const SLOT_ORDER = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

export function ReturnSlots() {
  const [slots, setSlots] = useState<ReturnSlot[]>(RETURN_SLOTS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: '', slotLabel: 'MORNING' as 'MORNING' | 'AFTERNOON' | 'EVENING', capacity: 10 });

  const dates = [...new Set(slots.map(s => s.date))].sort();

  function handleAdd() {
    const newSlot: ReturnSlot = { id: `rs-${Date.now()}`, ...form, bookedCount: 0 };
    setSlots(ss => [...ss, newSlot]);
    toast.success('Return slot added');
    setShowAdd(false);
    setForm({ date: '', slotLabel: 'MORNING', capacity: 10 });
  }

  function handleDelete(id: string) {
    setSlots(ss => ss.filter(s => s.id !== id));
    toast.success('Slot removed');
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Return Slots</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>Manage available return time slots</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#738A6E', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Slot
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>New Return Slot</span>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '5px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '5px' }}>Slot</label>
              <select value={form.slotLabel} onChange={e => setForm(f => ({ ...f, slotLabel: e.target.value as any }))} style={inputStyle}>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '5px' }}>Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Add Slot</button>
          </div>
        </div>
      )}

      {/* Date-based calendar view */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {dates.map(date => {
          const dateSlots = slots.filter(s => s.date === date);
          return (
            <div key={date} style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: '#F0F3EF', borderBottom: '1px solid #E4E7E2' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{formatDate(date + 'T00:00:00Z')}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {SLOT_ORDER.map(slotLabel => {
                  const slot = dateSlots.find(s => s.slotLabel === slotLabel);
                  if (!slot) {
                    return (
                      <div key={slotLabel} style={{ padding: '12px', borderRadius: '8px', border: '1px dashed #E4E7E2', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                        <span style={{ fontSize: '12px', color: '#BFCFBB' }}>{slotLabel}</span>
                      </div>
                    );
                  }
                  const pct = slot.bookedCount / slot.capacity;
                  const isFull = pct >= 1;
                  const isNearFull = pct >= 0.8;
                  return (
                    <div key={slot.id} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${isFull ? 'rgba(201,123,61,0.3)' : '#E4E7E2'}`, background: '#FAFAF8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D' }}>{slotLabel}</span>
                        <button onClick={() => handleDelete(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BFCFBB', padding: 0 }}><X size={12} /></button>
                      </div>
                      <div style={{ fontSize: '11px', color: isNearFull ? '#C97B3D' : '#8EA58C', marginBottom: '6px' }}>
                        {slot.bookedCount}/{slot.capacity} booked
                      </div>
                      <div style={{ height: '4px', background: '#E4E7E2', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: isFull ? '#C97B3D' : isNearFull ? '#C97B3D' : '#738A6E', borderRadius: '2px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
