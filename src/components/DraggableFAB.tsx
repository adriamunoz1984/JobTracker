// src/components/DraggableFAB.tsx - Context-aware draggable action button
import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, Vibration, Dimensions } from 'react-native';
import { FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme, makeStyles } from '../theme';

const { width, height } = Dimensions.get('window');

type DraggableFABVariant = 'default' | 'invoice' | 'finder';

interface DraggableFABProps {
  variant?: DraggableFABVariant;
}

const DraggableFAB: React.FC<DraggableFABProps> = ({ variant = 'default' }) => {
  const styles = useStyles();
  const { colors: Colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const isInvoiceVariant = variant === 'invoice';
  const isFinderVariant = variant === 'finder';

  const action = isInvoiceVariant
    ? {
        route: 'Invoice',
        icon: 'file-document-plus-outline',
        label: 'Create Invoice',
      }
    : isFinderVariant
      ? {
          route: 'PostJob',
          icon: 'map-marker-plus-outline',
          label: 'Post Pump Finder Job',
        }
      : {
          route: 'AddJob',
          icon: 'plus',
          label: 'Add Job',
        };

  // Initial position at bottom center of screen
  const position = useRef(new Animated.ValueXY({
    x: width / 2 - 28,
    y: height - 120
  })).current;

  // Track whether we're dragging
  const isDragging = useRef(false);
  const timeoutRef = useRef<any>(null);

  const actionRef = useRef(action);
  actionRef.current = action;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        Vibration.vibrate(50);

        position.setOffset({
          x: (position.x as any)._value,
          y: (position.y as any)._value
        });
        position.setValue({ x: 0, y: 0 });

        isDragging.current = false;
        timeoutRef.current = setTimeout(() => {
          Vibration.vibrate(50);
          isDragging.current = true;
        }, 200);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          isDragging.current = true;
        }

        if (isDragging.current) {
          Animated.event(
            [null, { dx: position.x, dy: position.y }],
            { useNativeDriver: false }
          )(evt, gestureState);
        }
      },

      onPanResponderRelease: () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (!isDragging.current) {
          navigation.navigate(actionRef.current.route);
          return;
        }

        position.flattenOffset();

        const posX = (position.x as any)._value;
        const posY = (position.y as any)._value;

        let toX = posX;
        let toY = posY;

        if (posX < 0) toX = 0;
        if (posX > width - 56) toX = width - 56;

        if (posY < 0) toY = 0;
        if (posY > height - 56) toY = height - 56;

        if (toX !== posX || toY !== posY) {
          Animated.spring(position, {
            toValue: { x: toX, y: toY },
            useNativeDriver: false,
            friction: 5
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <FAB
        style={[
          styles.fab,
          isInvoiceVariant && styles.invoiceFab,
          isFinderVariant && styles.finderFab,
        ]}
        icon={action.icon}
        color={
          isInvoiceVariant || isFinderVariant
            ? Colors.primary
            : Colors.textInverse
        }
        customSize={52}
        accessibilityLabel={action.label}
      />
    </Animated.View>
  );
};

const useStyles = makeStyles((Colors) => ({
  fabContainer: {
    position: 'absolute',
    zIndex: 999,
  },
  fab: {
    backgroundColor: Colors.primary,
    borderRadius: 26,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
  },
  invoiceFab: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  finderFab: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
}));

export default DraggableFAB;
