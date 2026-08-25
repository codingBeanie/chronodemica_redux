import { useCallback, useEffect, useState } from "react";

import { useWorldContext } from "../context/WorldContext";

type Filters = Record<string, number | undefined>;

interface CrudResource<T, TInput> {
  list: (filters?: Filters) => Promise<T[]>;
  create: (input: TInput) => Promise<T>;
  update: (id: number, input: Partial<TInput>) => Promise<T>;
  remove: (id: number) => Promise<void>;
}

export function useCrud<T extends { id: number }, TInput>(
  resource: CrudResource<T, TInput>,
  filters?: Filters,
) {
  const { selectedWorldId } = useWorldContext();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await resource.list(filters));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, filterKey, selectedWorldId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (input: TInput) => {
    const created = await resource.create(input);
    await refresh();
    return created;
  };

  const update = async (id: number, input: Partial<TInput>) => {
    const updated = await resource.update(id, input);
    await refresh();
    return updated;
  };

  const remove = async (id: number) => {
    await resource.remove(id);
    await refresh();
  };

  return { items, loading, error, create, update, remove, refresh };
}
