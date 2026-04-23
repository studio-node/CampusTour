import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  leadsService,
  schoolService,
  tourGroupSelectionService,
  userTypeService,
  TourParticipant,
} from '@/services/supabase';
import { formatInterest } from '@/constants/labels';
import { formatLeadDisplayName } from '@/lib/leadDisplayName';
import { wsManager } from '@/services/ws';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Row = TourParticipant & { isAttending: boolean };

function sortRosterRows(participants: TourParticipant[], joinedIds: Set<string>): Row[] {
  const rows: Row[] = participants.map((p) => ({
    ...p,
    isAttending: !!(p.id && joinedIds.has(p.id)),
  }));
  return rows.sort((a, b) => {
    if (a.isAttending !== b.isAttending) return a.isAttending ? -1 : 1;
    return formatLeadDisplayName(a).localeCompare(formatLeadDisplayName(b), undefined, {
      sensitivity: 'base',
    });
  });
}

export default function TourRosterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [noTour, setNoTour] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const schoolId = await schoolService.getSelectedSchool();
      if (!schoolId || cancelled) return;
      const school = await schoolService.getSchoolById(schoolId);
      if (!cancelled && school?.primary_color) {
        setPrimaryColor(school.primary_color);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRoster = useCallback(async () => {
    try {
      const ok = await userTypeService.isAmbassador();
      if (!ok) {
        setForbidden(true);
        setRows([]);
        return;
      }
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) {
        setNoTour(true);
        setRows([]);
        return;
      }
      setNoTour(false);
      setForbidden(false);

      const [participants, joinedMembers] = await Promise.all([
        leadsService.getTourParticipants(tourId),
        leadsService.getJoinedMembers(tourId),
      ]);
      const joinedSet = new Set(joinedMembers);
      setRows(sortRosterRows(participants, joinedSet));
    } catch (e) {
      console.error('Tour roster: failed to load', e);
      setRows([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      wsManager.connect();
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          await loadRoster();
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadRoster])
  );

  useEffect(() => {
    const onMemberChange = () => {
      void loadRoster();
    };
    wsManager.on('member_joined', onMemberChange);
    wsManager.on('member_left', onMemberChange);
    return () => {
      wsManager.off('member_joined', onMemberChange);
      wsManager.off('member_left', onMemberChange);
    };
  }, [loadRoster]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRoster();
    } finally {
      setRefreshing(false);
    }
  }, [loadRoster]);

  if (forbidden) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
            <IconSymbol name="chevron.left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Tour roster</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerMessage}>
          <Text style={styles.centerText}>Only ambassadors can open the tour roster.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (noTour) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
            <IconSymbol name="chevron.left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Tour roster</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerMessage}>
          <Text style={styles.centerText}>
            No tour is selected. Start or resume a tour from your ambassador tour details first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Row }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.name}>{formatLeadDisplayName(item)}</Text>
        <View
          style={[
            styles.badge,
            item.isAttending ? [styles.badgeOn, { backgroundColor: primaryColor }] : styles.badgeOff,
          ]}
        >
          <Text style={[styles.badgeText, item.isAttending ? styles.badgeTextOn : styles.badgeTextOff]}>
            {item.isAttending ? 'Connected' : 'Not connected'}
          </Text>
        </View>
      </View>
      {item.interests && item.interests.length > 0 ? (
        <View style={styles.interestsBlock}>
          <Text style={styles.metaLabel}>Interests</Text>
          <View style={styles.tags}>
            {item.interests.map((id) => (
              <View key={id} style={[styles.tag, { borderColor: primaryColor }]}>
                <Text style={styles.tagText}>{formatInterest(id)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.noInterests}>No interests submitted yet</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <IconSymbol name="chevron.left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Tour roster</Text>
        <TouchableOpacity
          onPress={() => void onRefresh()}
          style={styles.backBtn}
          disabled={loading || refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh roster"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <IconSymbol
              name="arrow.clockwise"
              size={22}
              color={loading ? 'rgba(255,255,255,0.35)' : '#FFFFFF'}
            />
          )}
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Loading roster…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item.id ?? `row-${index}`}
          renderItem={renderItem}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              title="Pull to refresh"
              titleColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No participants are signed up for this tour yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#282828',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listPad: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeOn: {},
  badgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextOn: {
    color: '#fff',
  },
  badgeTextOff: {
    color: '#ccc',
  },
  metaLine: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  metaLabel: {
    fontWeight: '600',
    color: '#e0e0e0',
  },
  interestsBlock: {
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagText: {
    fontSize: 13,
    color: '#f0f0f0',
  },
  noInterests: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#ccc',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#aaa',
    lineHeight: 22,
  },
  centerMessage: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
});
