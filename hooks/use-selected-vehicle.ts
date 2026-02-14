import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getSetting, setSetting } from '@/repositories/settings';
import { getVehicleById } from '@/repositories/vehicles';
import { Vehicle } from '@/types/models';

const SETTING_KEY = 'selected_vehicle_id';

export function useSelectedVehicle() {
  const db = useSQLiteContext();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const idValue = await getSetting(db, SETTING_KEY);
    if (idValue) {
      const vehicle = await getVehicleById(db, Number(idValue));
      setSelectedVehicle(vehicle ?? null);
    } else {
      setSelectedVehicle(null);
    }
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectVehicle = useCallback(
    async (vehicleId: number) => {
      await setSetting(db, SETTING_KEY, String(vehicleId));
      const vehicle = await getVehicleById(db, vehicleId);
      setSelectedVehicle(vehicle ?? null);
    },
    [db]
  );

  return { selectedVehicle, loading, refresh: load, selectVehicle };
}
