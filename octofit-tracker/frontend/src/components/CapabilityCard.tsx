import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  title: string;
  description: string;
  loadItems: () => Promise<T[]>;
  emptyMessage: string;
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({
  title,
  description,
  loadItems,
  emptyMessage,
  itemKey,
  renderItem,
}: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadItems()
      .then((loadedItems) => {
        if (active) setItems(loadedItems);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => { active = false; };
  }, [loadItems]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {items === null && !error && <p role="status">Loading {title.toLowerCase()}...</p>}
        {error && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
        {items?.length === 0 && <p>{emptyMessage}</p>}
        {items && items.length > 0 && (
          <ul>
            {items.map((item, index) => <li key={itemKey(item, index)}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
