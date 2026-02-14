import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getCommissionConfig, setCommissionConfig } from '@/repositories/commission';
import { CommissionConfig } from '@/types/models';

export function useCommissionConfig() {
  const db = useSQLiteContext();
  const [config, setConfig] = useState<CommissionConfig>({
    rate_per_unit: 0,
    daily_target_qty: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCommissionConfig(db);
    setConfig(result);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = useCallback(
    async (nextConfig: CommissionConfig) => {
      await setCommissionConfig(db, nextConfig);
      setConfig(nextConfig);
    },
    [db]
  );

  return { config, loading, refresh: load, save };
}
