import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const CIRCLE = 36;
const CIRCLE_EMPHASIZED = 60;

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  color: string;
  icon: MaterialIconName;
  /** Matches "current location" on the Current tab — larger pin and stronger outline. */
  emphasized?: boolean;
  /** Circle border color; defaults to white. Use school primary for the highlighted stop. */
  outlineColor?: string;
};

/**
 * Map pin: colored circle (like the default pin head) with a type icon inside and a small pointer below.
 */
export function LocationMapPin({ color, icon, emphasized, outlineColor }: Props) {
  const circle = emphasized ? CIRCLE_EMPHASIZED : CIRCLE;
  const iconSize = emphasized ? 40 : 20;
  const borderWidth = emphasized ? 5 : 2;
  const pointerSide = emphasized ? 12 : 8;
  const pointerTop = emphasized ? 12 : 10;
  const pointerMarginTop = emphasized ? -5 : -4;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.circle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: color,
            borderColor: outlineColor ?? '#FFFFFF',
            borderWidth,
          },
        ]}
      >
        <MaterialIcons name={icon} size={iconSize} color="#FFFFFF" />
      </View>
      <View
        style={[
          styles.pointer,
          {
            marginTop: pointerMarginTop,
            borderLeftWidth: pointerSide,
            borderRightWidth: pointerSide,
            borderTopWidth: pointerTop,
            borderTopColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  circle: {
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
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
