import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Rect, Line, G } from 'react-native-svg';

export type PourMark = { id: number; x: number; y: number; radius: number; created: number };
type Props = { width: number; height: number; marks: PourMark[]; scroll: number; elapsed: number; ending: boolean; score: number; now: number };

const RADIUS = 42;
const SCREED = 0.25;
// Retro 32-bit-inspired concrete palette: deeper = darker, piled = lighter.
const CONCRETE = ['#41464A', '#555B60', '#697176', '#80898C', '#98A2A3', '#B2B9B6', '#CDD1C9', '#E1DED1'];
const formatColor = (depth: number, x: number, y: number) => {
  const grain = ((x * 19 + y * 13) % 7 === 0) ? 1 : 0;
  const index = Math.max(0, Math.min(CONCRETE.length - 1, Math.floor(depth * 1.9) + grain));
  return CONCRETE[index];
};

export default function ConcretePourOverlay({ width, height, marks, scroll, elapsed, ending, score, now }: Props) {
  // The secret starts with rings only; after five more seconds they become poured concrete.
  const solidStarted = elapsed >= 5000;
  const screedY = elapsed < 9000 ? 72 : height * SCREED;
  const started = elapsed >= 9000;
  const cell = 11;
  const countX = Math.ceil(width / cell);
  const countY = Math.ceil(height / cell);
  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < countY; y++) {
    for (let x = 0; x < countX; x++) {
      const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
      let depth = 0;
      marks.forEach(mark => {
        const dy = mark.y - scroll - cy;
        const distance = Math.hypot(mark.x - cx, dy);
        if (distance < mark.radius) depth += 1 - distance / mark.radius;
      });
      if (depth > 0.08) {
        const leveled = started && cy < screedY;
        const color = leveled ? (depth >= 1.5 && depth <= 3.2 ? '#929C99' : depth < 1.5 ? '#515E65' : '#D1C7B6') : formatColor(depth, x, y);
        tiles.push(<Rect key={x + '-' + y} x={x * cell} y={y * cell} width={cell + 0.4} height={cell + 0.4} fill={color} />);
      }
    }
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10000, backgroundColor: 'rgba(20,22,24,0.70)' }]}>
      <Svg width={width} height={height}>
        {solidStarted && <G opacity={Math.min(1, (elapsed - 5000) / 650)}>{tiles}</G>}
        {marks.filter(mark => now - mark.created < (solidStarted ? 650 : 1200)).map(mark => (
          <Circle key={'ring-' + mark.id} cx={mark.x} cy={mark.y - scroll} r={mark.radius * Math.min(1, (now - mark.created) / 450)}
            stroke="#D8E0DA" strokeWidth={2} fill="none" opacity={Math.max(0, 1 - (now - mark.created) / (solidStarted ? 650 : 1200))} />
        ))}
        <Line x1={0} y1={screedY + 4} x2={width} y2={screedY + 4} stroke="#182126" strokeOpacity={0.85} strokeWidth={7} />
        <Line x1={0} y1={screedY} x2={width} y2={screedY} stroke={started && marks.some(mark => Math.abs(mark.y - scroll - screedY) < mark.radius) ? '#72dc83' : '#eb6060'} strokeWidth={4} />
      </Svg>
      <View style={{ position: 'absolute', top: screedY + 10, alignSelf: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{started ? 'KEEP THE GRADE' : solidStarted ? 'BUILD THE DEPTH' : 'HOLD TO POUR'}</Text>
      </View>
      {ending && (
        <View style={{ position: 'absolute', top: height * .42, alignSelf: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 16 }}>
          <Text style={{ color: '#eee', fontSize: 14 }}>POUR COMPLETE</Text>
          <Text style={{ color: '#fff', fontSize: 38, fontWeight: 'bold' }}>{score.toFixed(1)}%</Text>
          <Text style={{ color: '#ddd', fontSize: 13 }}>Level accuracy</Text>
        </View>
      )}
    </View>
  );
}

export function calculatePourScore(marks: PourMark[], scroll: number, width: number, height: number) {
  let total = 0, correct = 0;
  const rowY = height * SCREED;
  for (let x = 6; x < width; x += 12) {
    let depth = 0;
    marks.forEach(mark => {
      const dist = Math.hypot(mark.x - x, mark.y - scroll - rowY);
      if (dist < mark.radius) depth += 1 - dist / mark.radius;
    });
    correct += Math.max(0, 1 - Math.abs(depth - 2.2) / 2.2);
    total += 1;
  }
  return total ? Math.max(0, Math.min(100, 100 * correct / total)) : 0;
}
