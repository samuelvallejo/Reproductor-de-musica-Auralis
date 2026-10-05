import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { library } from './library';

type Placement = 'before' | 'after';
interface DragState { nodeId: string; targetId: string | null; placement: Placement }
interface PointerSession { pointerId: number; nodeId: string; startX: number; startY: number }

/** Own pointer drag for mouse, touch and pen; ordering stays in domain links. */
export function useQueueDrag(playlistId: string, onNotify: (message: string) => void) {
  const listRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DragState | null>(null);
  const current = useRef<DragState | null>(null);
  const pointer = useRef<PointerSession | null>(null);
  const clear = () => { current.current = null; pointer.current = null; setState(null); };
  useEffect(() => {
    current.current = null; pointer.current = null; setState(null);
    return () => { current.current = null; pointer.current = null; };
  }, [playlistId]);
  const update = (next: DragState) => { current.current = next; setState(next); };
  const finish = () => {
    const drag = current.current;
    clear();
    if (!drag?.targetId || drag.targetId === drag.nodeId || library.active.playlistId !== playlistId) return;
    try {
      if (library.move(drag.nodeId, drag.targetId, drag.placement)) onNotify('Orden actualizado. La canción sigue en tu playlist.');
    } catch { onNotify('La playlist cambió durante el arrastre. Vuelve a intentarlo.'); }
  };
  const pointerTarget = (x: number, y: number) => {
    const drag = current.current; if (!drag) return;
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-node-id]');
    if (!element || !listRef.current?.contains(element)) { update({ ...drag, targetId: null }); return; }
    const rect = element.getBoundingClientRect();
    update({ ...drag, targetId: element.dataset.nodeId ?? null, placement: y < rect.top + rect.height / 2 ? 'before' : 'after' });
    const listRect = listRef.current.getBoundingClientRect();
    if (y < listRect.top + 32) listRef.current.scrollTop -= 18;
    else if (y > listRect.bottom - 32) listRef.current.scrollTop += 18;
  };
  const handleProps = (nodeId: string): ButtonHTMLAttributes<HTMLButtonElement> => ({
    // Disable HTML drag so the browser cannot take over with a forbidden cursor.
    draggable: false,
    onDragStart: event => event.preventDefault(),
    onPointerDown: event => {
      if (event.button !== 0 || !event.isPrimary || library.active.playlistId !== playlistId) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      pointer.current = { pointerId: event.pointerId, nodeId, startX: event.clientX, startY: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: event => {
      const session = pointer.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (!current.current && Math.hypot(event.clientX - session.startX, event.clientY - session.startY) < 6) return;
      event.preventDefault();
      current.current ??= { nodeId: session.nodeId, targetId: null, placement: 'before' };
      pointerTarget(event.clientX, event.clientY);
    },
    onPointerUp: event => {
      if (pointer.current?.pointerId !== event.pointerId) return;
      if (current.current) pointerTarget(event.clientX, event.clientY);
      finish();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: clear,
    onLostPointerCapture: clear,
    onKeyDown: event => {
      if (event.key === 'Escape') { clear(); return; }
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const node = library.active.list.getNodeById(nodeId);
      const neighbor = event.key === 'ArrowUp' ? node?.previous : node?.next;
      if (neighbor) {
        library.move(nodeId, neighbor.nodeId, event.key === 'ArrowUp' ? 'before' : 'after');
        onNotify('Orden actualizado con el teclado.');
      }
    },
  });
  const rowProps = (): HTMLAttributes<HTMLDivElement> => ({ onDragStart: event => event.preventDefault() });
  return { listRef, state, handleProps, rowProps };
}
