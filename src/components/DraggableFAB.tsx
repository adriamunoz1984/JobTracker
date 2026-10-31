// src/components/DraggableFAB.tsx - Alternative implementation
import React, { useRef, useEffect, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Vibration, Dimensions } from 'react-native';
import { FAB, Portal } from 'react-native-paper';
import ConcretePourOverlay, { PourMark, calculatePourScore } from './ConcretePourOverlay';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme, makeStyles } from '../theme';

const { width, height } = Dimensions.get('window');

interface DraggableFABProps {
  variant?: 'default' | 'invoice';
}

const DraggableFAB: React.FC<DraggableFABProps> = ({ variant = 'default' }) => {
  const styles = useStyles();
  const { colors: Colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const isInvoiceVariant = variant === 'invoice';
  // PanResponder is created only once. Keep the active tab's action current.
  const activeVariantRef = useRef(variant);
  activeVariantRef.current = variant;
  
  // Initial position at bottom center of screen
  const position = useRef(new Animated.ValueXY({
    x: width / 2 - 28,
    y: height - 120
  })).current;
  
  // Track whether we're dragging
  const isDragging = useRef(false);
  const currentPosition = useRef({ x: width / 2 - 28, y: height - 120 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pourTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameActive = useRef(false);
  const gameStart = useRef(0);
  const lastMark = useRef(0);
  const touch = useRef({ x: width / 2, y: height - 94 });
  const marksRef = useRef<PourMark[]>([]);
  const scrollRef = useRef(0);
  const [game, setGame] = useState<{ active: boolean; ending: boolean; marks: PourMark[]; scroll: number; elapsed: number; score: number; now: number }>({
    active: false, ending: false, marks: [], scroll: 0, elapsed: 0, score: 0, now: 0,
  });
  const finishGame = () => {
    if (pourTimer.current) clearInterval(pourTimer.current);
    pourTimer.current = null;
    const score = calculatePourScore(marksRef.current, scrollRef.current, width, height);
    setGame(old => ({ ...old, ending: true, score }));
    endTimer.current = setTimeout(() => {
      gameActive.current = false;
      setGame({ active: false, ending: false, marks: [], scroll: 0, elapsed: 0, score: 0, now: 0 });
    }, 1350);
  };
  const startGame = () => {
    gameActive.current = true;
    marksRef.current = [];
    scrollRef.current = 0;
    gameStart.current = Date.now();
    lastMark.current = 0;
    setGame({ active: true, ending: false, marks: [], scroll: 0, elapsed: 0, score: 0, now: Date.now() });
    Vibration.vibrate(80);
    pourTimer.current = setInterval(() => {
      const now = Date.now(), elapsed = now - gameStart.current;
      if (now - lastMark.current >= 110) {
        marksRef.current = [...marksRef.current.slice(-135), {
          id: now, x: touch.current.x, y: touch.current.y + scrollRef.current,
          radius: 43, created: now,
        }];
        lastMark.current = now;
      }
      if (elapsed > 3000) scrollRef.current += 12;
      setGame({ active: true, ending: false, marks: marksRef.current, scroll: scrollRef.current, elapsed, score: 0, now });
    }, 110);
  };
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        // Vibrate when touched
        Vibration.vibrate(50);
        touch.current = { x: currentPosition.current.x + 28, y: currentPosition.current.y + 28 };
        
        // Set up for potential dragging
        position.extractOffset();
        
        // Start timer to detect long press
        isDragging.current = false;
        timeoutRef.current = setTimeout(() => {
          if (activeVariantRef.current === 'default') startGame();
          else isDragging.current = true;
        }, 3000);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        touch.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        if (gameActive.current) return;
        // If moved significantly, consider it dragging
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          isDragging.current = true;
        }
        
        // Update position if dragging
        if (isDragging.current) {
          Animated.event(
            [null, { dx: position.x, dy: position.y }],
            { useNativeDriver: false }
          )(evt, gestureState);
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        if (gameActive.current) {
          finishGame();
          position.flattenOffset();
          position.setValue({ x: currentPosition.current.x, y: currentPosition.current.y });
          return;
        }
        // Clear the timeout if still running
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // If we're not dragging, it was a tap
        if (!isDragging.current) {
          // Reset before opening the form so the button is back in its home
          // position regardless of whether the user saves, cancels, or goes back.
          position.flattenOffset();
          position.setValue({ x: width / 2 - 28, y: height - 120 });
          navigation.navigate(activeVariantRef.current === 'invoice' ? 'Invoice' : 'AddJob');
          return;
        }
        
        
        // Finalize the position
        position.flattenOffset();
        
        // Keep within bounds
        const { x: posX, y: posY } = currentPosition.current;
        
        let toX = posX;
        let toY = posY;
        
        if (posX < 0) toX = 0;
        if (posX > width - 56) toX = width - 56;
        
        if (posY < 0) toY = 0;
        if (posY > height - 56) toY = height - 56;
        
        // Snap if needed
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
  
  // Clean up timeouts
  useEffect(() => {
    const listener = position.addListener(value => { currentPosition.current = value; });
    return () => {
      position.removeListener(listener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pourTimer.current) clearInterval(pourTimer.current);
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, []);
  
  return (
    <>
    {game.active && (
      <Portal>
        <ConcretePourOverlay width={width} height={height} marks={game.marks}
          scroll={game.scroll} elapsed={game.elapsed} ending={game.ending}
          score={game.score} now={game.now} />
      </Portal>
    )}
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
        ]}
        icon={isInvoiceVariant ? 'file-plus' : 'plus'}
        color={isInvoiceVariant ? Colors.primary : Colors.textInverse}
        customSize={52}
        accessibilityLabel={isInvoiceVariant ? 'Create Invoice' : 'Add Job'}
      />
    </Animated.View>
    </>
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
}));

export default DraggableFAB;
