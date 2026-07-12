import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Drawn as a clip-path polygon rather than the "⬡" glyph used elsewhere in
// the app — next/og's renderer (Satori) has limited font coverage and often
// can't render less-common Unicode symbols, so a real vector shape is the
// only way to guarantee this actually renders instead of showing blank.
const HEXAGON_CLIP_PATH = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

export default function Icon() {
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
