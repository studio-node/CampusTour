import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface HamburgerMenuProps {
  primaryColor: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ primaryColor }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnimation = useRef(new Animated.Value(-Dimensions.get('window').width)).current;

  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnimation, {
      toValue: -Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsMenuVisible(false);
    });
  };

  const handleMenuItemPress = (item: string) => {
    console.log(`${item} pressed`);
    // TODO: Implement actual functionality
    closeMenu();
  };

  const dynamicStyles = {
    menuItem: {
      borderLeftColor: primaryColor,
    },
  };

  return (
    <>
      {/* Hamburger Button */}
      <TouchableOpacity style={styles.hamburgerButton} onPress={openMenu}>
        <IconSymbol name="line.horizontal.3" size={30} color="white" />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
      >
        {/* Backdrop */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={closeMenu}
        >
          {/* Menu Container */}
          <Animated.View 
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: slideAnimation }],
              },
            ]}
          >
            {/* Prevent backdrop touch when touching menu */}
            <TouchableOpacity activeOpacity={1} style={styles.menuContent}>
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                  <IconSymbol name="xmark" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Menu Items */}
              <View style={styles.menuItems}>
                <TouchableOpacity 
                  style={[styles.menuItem, dynamicStyles.menuItem]}
                  onPress={() => handleMenuItemPress('Account')}
                >
                  <IconSymbol name="person.circle" size={24} color="#333" style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Account</Text>
                  <IconSymbol name="chevron.right" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, dynamicStyles.menuItem]}
                  onPress={() => handleMenuItemPress('Settings')}
                >
                  <IconSymbol name="gearshape" size={24} color="#333" style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Settings</Text>
                  <IconSymbol name="chevron.right" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, dynamicStyles.menuItem]}
                  onPress={() => handleMenuItemPress('Pause Tour')}
                >
                  <IconSymbol name="pause.circle" size={24} color="#333" style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Pause Tour</Text>
                  <IconSymbol name="chevron.right" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    padding: 10,
    marginLeft: 5,
    marginTop: 5, // Additional top margin to avoid sensor housing
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 60,
    bottom: 0,
    width: Dimensions.get('window').width * 0.75, // 75% of screen width
    maxWidth: 300,
    backgroundColor: '#FFFFFF',

  },
  menuContent: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 5,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
  },
});

export default HamburgerMenu; 