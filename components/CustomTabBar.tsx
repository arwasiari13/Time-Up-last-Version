import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import I18n, { subscribeLocaleChange } from '../src/i18n';
import { subscribePendingTabIndex } from '../src/navigation/tabSwipeBridge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 3;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const currentRouteKey = state.routes[state.index].key;
  const currentOptions = descriptors[currentRouteKey]?.options;

  const { effectiveTheme } = useTheme();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [, setLocaleVersion] = useState(0);
  const animatedValue = useRef(new Animated.Value(state.index)).current;
  const tabPositions = useRef<number[]>([]).current;

  useEffect(() => {
    const unsubscribe = subscribePendingTabIndex((index) => {
      setPendingIndex(index);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLocaleChange(() => {
      setLocaleVersion((value) => value + 1);
    });

    return unsubscribe;
  }, []);

  const visualIndex = pendingIndex ?? state.index;

  // تحديث الأنيميشن عند تغيير التبويبة
  useEffect(() => {
    if (pendingIndex !== null) {
      Animated.timing(animatedValue, {
        toValue: visualIndex,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(animatedValue, {
      toValue: visualIndex,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start();
  }, [animatedValue, pendingIndex, visualIndex]);

  const onTabLayout = (event: any, index: number) => {
    const { x } = event.nativeEvent.layout;
    tabPositions[index] = x;
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, TAB_COUNT - 1],
    outputRange: [tabPositions[0] || 0, tabPositions[TAB_COUNT - 1] || (SCREEN_WIDTH - TAB_WIDTH)],
  });

  const styles = getStyles(effectiveTheme);

  const tabBarStyle = currentOptions?.tabBarStyle;
  if (tabBarStyle && typeof tabBarStyle === 'object' && (tabBarStyle as any).display === 'none') {
    return null;
  }

  return (
    <View className='text-2xl' style={styles.tabBar}>
      {/* الخط المتحرك */}
      <Animated.View
        style={[
          styles.animatedIndicatorContainer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['#00B8DB', '#0092B8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeIndicator}
        />
      </Animated.View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined 
          ? options.tabBarLabel 
          : options.title !== undefined 
          ? options.title 
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // تحديد الأيقونة حسب اسم الصفحة
        const getIconName = () => {
          switch (route.name) {
            case 'index':
              return isFocused ? 'grid-outline' : 'grid-outline';
            case 'subscribers':
              return isFocused ? 'people-outline' : 'people-outline';
            case 'settings':
              return isFocused ? 'settings-outline' : 'settings-outline';
            default:
              return 'home-outline';
          }
        };

        // تحديد العنوان حسب اسم الصفحة
        const getLabel = (): string => {
          switch (route.name) {
            case 'index':
              return I18n.t('dashboard');
            case 'subscribers':
              return I18n.t('subscribers');
            case 'settings':
              return I18n.t('settings');
            default:
              return typeof label === 'string' ? label : route.name;
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
            onLayout={(event) => onTabLayout(event, index)}
          >
            <View style={styles.tabContent}>
              <Ionicons
                name={getIconName() as any}
                size={24}
                color={isFocused ? '#0092B8' : (effectiveTheme === 'dark' ? '#B0B0B0' : '#9CA3AF')}
              />
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? '#0092B8' : (effectiveTheme === 'dark' ? '#B0B0B0' : '#9CA3AF') }
              ]}>
                {getLabel()}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (theme: 'light' | 'dark') =>
  StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      // ألوان متناسقة مع تدرّج الخلفية الجديد
      backgroundColor: theme === 'dark' ? '#0d1525' : '#f4fbfd',
      height: 70,
      // borderTopWidth: 1,
      // borderTopColor: theme === 'dark' ? '#0F172B' : '#E5E5E5',
      shadowColor: theme === 'dark' ? '#000' : '#000',
      // shadowOffset: { width: 0, height: -2 },
      // shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
      // shadowRadius: 3,
      elevation: 5,
      position: 'relative',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    animatedIndicatorContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: TAB_WIDTH,
      alignItems: 'center',
    },
    activeIndicator: {
      position: 'absolute',
      top: 0,
      width: 80,
      height: 3,
      borderRadius: 2,
    },
    tabContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'center',
    },
  });