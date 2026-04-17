import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD

  console.log('[auth] user defined:', !!user, '| pass defined:', !!pass)

  if (!user || !pass) return NextResponse.next()

  const auth = req.headers.get('authorization')
  console.log('[auth] header present:', !!auth)

  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const colon = decoded.indexOf(':')
      const u = decoded.slice(0, colon)
      const p = decoded.slice(colon + 1)
      console.log('[auth] u match:', u === user, '| p match:', p === pass)
      if (u === user && p === pass) return NextResponse.next()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Vault"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
