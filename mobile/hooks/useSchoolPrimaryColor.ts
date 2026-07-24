import { useEffect, useState } from 'react';
import { schoolService } from '@/services/supabase';

// Brand-neutral (not any one school's actual color) — matches the fallback already used
// in mobile/app/(tabs)/map.tsx before this was centralized.
export const DEFAULT_PRIMARY_COLOR = '#334155';

interface UseSchoolPrimaryColorResult {
  schoolId: string | null;
  primaryColor: string;
  loading: boolean;
  /** True once loading finishes and no school could be resolved (only possible when explicitSchoolId is omitted). */
  notFound: boolean;
}

/**
 * Resolves a school (an explicit ID, or the currently selected school when
 * omitted) and loads its brand primary color, falling back to defaultColor
 * until it does.
 */
export function useSchoolPrimaryColor(
  explicitSchoolId?: string | null,
  defaultColor: string = DEFAULT_PRIMARY_COLOR
): UseSchoolPrimaryColorResult {
  const [schoolId, setSchoolId] = useState<string | null>(explicitSchoolId ?? null);
  const [primaryColor, setPrimaryColor] = useState<string>(defaultColor);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const resolvedId = explicitSchoolId ?? (await schoolService.getSelectedSchool());
        if (cancelled) return;
        if (!resolvedId) {
          setNotFound(true);
          return;
        }
        setSchoolId(resolvedId);

        const school = await schoolService.getSchoolById(resolvedId);
        if (!cancelled && school?.primary_color) {
          setPrimaryColor(school.primary_color);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [explicitSchoolId]);

  return { schoolId, primaryColor, loading, notFound };
}
