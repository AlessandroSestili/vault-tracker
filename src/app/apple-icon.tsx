import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        {/* Outer steel frame */}
        <div
          style={{
            position: 'relative',
            width: 148,
            height: 148,
            borderRadius: '50%',
            border: '5px solid #44403c',
            background: '#0c0a09',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner gold ring (door) */}
          <div
            style={{
              position: 'relative',
              width: 122,
              height: 122,
              borderRadius: '50%',
              border: '4px solid #f59e0b',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Spoke H */}
            <div style={{ position: 'absolute', width: 72, height: 3, background: 'rgba(245,158,11,0.3)', borderRadius: 4 }} />
            {/* Spoke V */}
            <div style={{ position: 'absolute', width: 3, height: 72, background: 'rgba(245,158,11,0.3)', borderRadius: 4 }} />
            {/* Spoke diagonal 1 */}
            <div style={{ position: 'absolute', width: 72, height: 2.5, background: 'rgba(245,158,11,0.18)', borderRadius: 4, transform: 'rotate(45deg)' }} />
            {/* Spoke diagonal 2 */}
            <div style={{ position: 'absolute', width: 72, height: 2.5, background: 'rgba(245,158,11,0.18)', borderRadius: 4, transform: 'rotate(-45deg)' }} />
            {/* Center hub outer ring */}
            <div
              style={{
                position: 'absolute',
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#1c1917',
                border: '2.5px solid #f59e0b',
              }}
            />
            {/* Center hub inner dot */}
            <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#f59e0b' }} />
          </div>

          {/* Bolts at NESW on outer frame */}
          {/* N */}
          <div style={{ position: 'absolute', top: 4, left: 62, width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', border: '3px solid #09090b' }} />
          {/* S */}
          <div style={{ position: 'absolute', bottom: 4, left: 62, width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', border: '3px solid #09090b' }} />
          {/* E */}
          <div style={{ position: 'absolute', right: 4, top: 62, width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', border: '3px solid #09090b' }} />
          {/* W */}
          <div style={{ position: 'absolute', left: 4, top: 62, width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', border: '3px solid #09090b' }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
