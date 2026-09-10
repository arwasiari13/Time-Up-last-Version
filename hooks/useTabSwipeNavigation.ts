import { useNavigation } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setPendingTabIndex } from '../src/navigation/tabSwipeBridge';

const TAB_ROUTES = ['index', 'subscribers', 'settings'] as const;
type TabRoute = (typeof TAB_ROUTES)[number];

type Options = {
  disabled?: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function useTabSwipeNavigation(currentRoute: TabRoute, options: Options = {}) {
  const navigation = useNavigation<any>();
  const translateX = useSharedValue(0);
  const isTransitioning = useSharedValue(false);
  const lastNavigateTimeRef = useRef(0);

  useEffect(() => {
    translateX.value = 0;
    isTransitioning.value = false;
    setPendingTabIndex(null);
  }, [isTransitioning, translateX]);

  const navigateTo = useCallback((targetRoute: TabRoute) => {
    const now = Date.now();
    if (now - lastNavigateTimeRef.current < 350) {
      translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
      isTransitioning.value = false;
      return;
    }

    lastNavigateTimeRef.current = now;
    navigation.navigate(targetRoute);
    translateX.value = 0;
    isTransitioning.value = false;
    setPendingTabIndex(null);
  }, [isTransitioning, navigation, translateX]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!options.disabled)
        .activeOffsetX([-16, 16])
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          if (isTransitioning.value) {
            return;
          }

          const currentIndex = TAB_ROUTES.indexOf(currentRoute);
          if (currentIndex < 0) {
            return;
          }

          const swipingRightAtFirst = currentIndex === 0 && event.translationX > 0;
          const swipingLeftAtLast = currentIndex === TAB_ROUTES.length - 1 && event.translationX < 0;
          const dampedX = swipingRightAtFirst || swipingLeftAtLast
            ? event.translationX * 0.22
            : event.translationX;

          translateX.value = dampedX;
        })
        .onEnd((event) => {
          if (isTransitioning.value) {
            return;
          }

          const currentIndex = TAB_ROUTES.indexOf(currentRoute);
          if (currentIndex < 0) {
            runOnJS(setPendingTabIndex)(null);
            translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
            return;
          }

          const absX = Math.abs(event.translationX);
          const passedDistance = absX > SCREEN_WIDTH * 0.24;
          const passedVelocity = Math.abs(event.velocityX) > 650;

          if (!passedDistance && !passedVelocity) {
            runOnJS(setPendingTabIndex)(null);
            translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
            return;
          }

          const swipedLeft = event.translationX < 0;
          const targetIndex = swipedLeft ? currentIndex + 1 : currentIndex - 1;

          if (targetIndex < 0 || targetIndex >= TAB_ROUTES.length) {
            runOnJS(setPendingTabIndex)(null);
            translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
            return;
          }

          const targetRoute = TAB_ROUTES[targetIndex];
          runOnJS(setPendingTabIndex)(targetIndex);
          isTransitioning.value = true;
          runOnJS(navigateTo)(targetRoute);
        })
        .onFinalize(() => {
          if (!isTransitioning.value) {
            runOnJS(setPendingTabIndex)(null);
            translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
          }
        }),
    [currentRoute, isTransitioning, navigateTo, options.disabled, translateX]
  );

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { swipeGesture, swipeAnimatedStyle };
}
