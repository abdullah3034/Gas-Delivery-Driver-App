import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { getBanks } from '@/repositories/banks';
import { Bank } from '@/types/models';

export function useBanks() {
  const db = useSQLiteContext();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getBanks(db);
    setBanks(result);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { banks, loading, refresh: load };
}
