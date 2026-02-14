import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getInventoryForVehicle } from '@/repositories/inventory';
import { InventoryItem } from '@/types/models';

export function useInventory(vehicleId: number | null) {
  const db = useSQLiteContext();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setInventory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getInventoryForVehicle(db, vehicleId);
    setInventory(result);
    setLoading(false);
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { inventory, loading, refresh: load };
}
