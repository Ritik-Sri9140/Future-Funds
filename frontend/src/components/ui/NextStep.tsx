import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

export function NextStep(props: { children: string; page: Page; action: string }) {
  const setPage = useStore((s) => s.setPage);
  return (
    <p className="muted">
      {props.children}{' '}
      <button className="btn sm" onClick={() => setPage(props.page)}>{props.action}</button>
    </p>
  );
}
