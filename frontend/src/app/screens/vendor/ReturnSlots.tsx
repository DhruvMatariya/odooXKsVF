import { useState, useEffect } from 'react';
import type { ReturnSlot } from '../../lib/types';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';
import { createReturnSlot, getReturnSlots } from '../../lib/api';

const SLOT_ORDER = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

export function ReturnSlots() {
  const [slots, setSlots] = useState<ReturnSlot[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ date: '', slotLabel: 'MORNING' as 'MORNING' | 'AFTERNOON' | 'EVENING', capacity: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlots();
  }, []);

  async function loadSlots() {
    setLoading(true);
    try {
      const res = await getReturnSlots();
      if (res.data) setSlots(res.data);
    } catch (e) {
      toast.error('Failed to load return slots');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setLoading(true);
    try {
      await createReturnSlot(form);
      toast.success('Return slot added');
      setShowAdd(false);
      setForm({ date: '', slotLabel: 'MORNING', capacity: 10 });
      await loadSlots();
    } catch (e) {
      toast.error('Failed to add return slot');
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(id: string) {
    // TODO: delete slot API call
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {visibleDates.map(date => {
          const dateSlots = slots.filter(s => s.date === date);
          return (
            <div key={date} style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
              <div style={{ padding: '16px 24px', background: 'rgba(115,138,110,0.05)', borderBottom: '1px solid rgba(115,138,110,0.15)' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#344C3D' }}>{formatDate(date + 'T00:00:00Z')}</span>
              </div>
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {SLOT_ORDER.map(slotLabel => {
                  const slot = dateSlots.find(s => s.slotLabel === slotLabel);
                  if (!slot) {
                    return (
                      <div key={slotLabel} style={{ padding: '20px', borderRadius: '16px', border: '1px dashed rgba(115,138,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '110px', background: 'rgba(255,255,255,0.3)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#BFCFBB' }}>{slotLabel} Available</span>
                      </div>
                    );
                  }
                  const pct = slot.bookedCount / slot.capacity;
                  const isFull = pct >= 1;
                  const isNearFull = pct >= 0.8;
                  return (
                    <div key={slot.id} style={{ padding: '20px', borderRadius: '16px', border: `1px solid ${isFull ? 'rgba(201,123,61,0.3)' : 'rgba(115,138,110,0.2)'}`, background: isFull ? 'rgba(201,123,61,0.03)' : '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(52,76,61,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#344C3D', letterSpacing: '0.02em' }}>{slotLabel}</span>
                        <button onClick={() => handleDelete(slot.id)} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#8EA58C', padding: '4px', display: 'flex' }}><X size={14} /></button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: isNearFull ? '#C97B3D' : '#344C3D', lineHeight: 1 }}>
                          {slot.bookedCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#8EA58C' }}>/ {slot.capacity}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isNearFull ? '#C97B3D' : '#738A6E', textTransform: 'uppercase' }}>Booked</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(115,138,110,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: isFull ? '#C97B3D' : isNearFull ? '#C97B3D' : 'linear-gradient(90deg, #738A6E, #4a6848)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {dates.length > 2 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button onClick={() => setShowAll(!showAll)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(115,138,110,0.1)', border: 'none', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', color: '#344C3D', fontSize: '13px', fontWeight: 600, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(115,138,110,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(115,138,110,0.1)'}>
              {showAll ? (
                <>Show Less <ChevronUp size={16} /></>
              ) : (
                <>View All ({dates.length - 2} more) <ChevronDown size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
