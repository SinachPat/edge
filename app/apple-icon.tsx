import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const HEXAGON_CLIP_PATH = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0D1B2A',
        }}
      >
        <div style={{ width: '100%', height: '100%', background: '#C8973A', clipPath: HEXAGON_CLIP_PATH }} />
      </div>
    ),
    { ...size }
  );
}
