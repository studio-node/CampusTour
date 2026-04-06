import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const CIRCLE = 36;

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  color: string;
  icon: MaterialIconName;
};

/**
 * Map pin: colored circle (like the default pin head) with a type icon inside and a small pointer below.
 */
export function LocationMapPin({ color, icon }: Props) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.circle, { backgroundColor: color, borderColor: '#FFFFFF' }]}>
        <MaterialIcons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={[styles.pointer, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 5,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -4,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
