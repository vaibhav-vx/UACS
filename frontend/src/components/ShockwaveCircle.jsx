import { useState, useEffect } from 'react';
import { Circle } from 'react-leaflet';

export default function ShockwaveCircle({ center, color = '#ef4444', maxRadius = 150000, duration = 4000 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animId;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      setProgress((elapsed % duration) / duration); // 0 to 1
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [duration]);

  // Wave 1
  const radius1 = progress * maxRadius;
  const opacity1 = Math.max(0, 0.35 * (1 - radius1 / maxRadius));

  // Wave 2 (50% phase offset)
  const progress2 = (progress + 0.5) % 1;
  const radius2 = progress2 * maxRadius;
  const opacity2 = Math.max(0, 0.35 * (1 - radius2 / maxRadius));

  return (
    <>
      <Circle
        center={center}
        radius={radius1}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: opacity1,
          weight: 1.5,
          dashArray: '4, 4'
        }}
      />
      <Circle
        center={center}
        radius={radius2}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: opacity2,
          weight: 1.5,
          dashArray: '4, 4'
        }}
      />
    </>
  );
}
