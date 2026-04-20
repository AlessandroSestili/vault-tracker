import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer door ring */}
        <div
          style={{
            position: 'relative',
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '2.5px solid #f59e0b',
            background: '#0c0a09',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Spoke H */}
          <div style={{ position: 'absolute', width: 14, height: 1.5, background: 'rgba(245,158,11,0.35)', borderRadius: 2 }} />
          {/* Spoke V */}
          <div style={{ position: 'absolute', width: 1.5, height: 14, background: 'rgba(245,158,11,0.35)', borderRadius: 2 }} />
          {/* Center dial */}
          <div style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
          {/* Bolt N */}
          <div style={{ position: 'absolute', top: -3, left: 9, width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', border: '1px solid #09090b' }} />
          {/* Bolt S */}
          <div style={{ position: 'absolute', bottom: -3, left: 9, width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', border: '1px solid #09090b' }} />
          {/* Bolt E */}
          <div style={{ position: 'absolute', right: -3, top: 9, width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', border: '1px solid #09090b' }} />
          {/* Bolt W */}
          <div style={{ position: 'absolute', left: -3, top: 9, width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', border: '1px solid #09090b' }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
