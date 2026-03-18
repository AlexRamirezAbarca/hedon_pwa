import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: You *must* return the supabaseResponse object as it might contain
  // the refreshed auth cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- AUTOMATIC 24H SESSION EXPIRATION ---
  if (user && user.last_sign_in_at) {
      const lastSignIn = new Date(user.last_sign_in_at).getTime()
      const diffHours = (Date.now() - lastSignIn) / (1000 * 60 * 60)
      if (diffHours >= 24) {
          // Destruir credenciales de inmediato
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
      }
  }

  // Protected Routes Logic
  // 1. If user is NOT logged in and tries to access protected pages (everything except /login, /auth, public assets)
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
     const isPublic = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.');
     
     // For now, let's protect the Dashboard (ROOT /) and any other route
     // But maybe we want a Landing Page at root? 
     // For this MVP, assume ROOT is the App Dashboard.
     if (!isPublic) {
         // Create an absolute URL for the redirect
         const url = request.nextUrl.clone()
         url.pathname = '/login'
         return NextResponse.redirect(url)
     }
  }

  // 2. If user IS logged in and tries to access Login, redirect to specific Dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 3. Security for Admin Panel is handled inside app/admin/layout.tsx via env var ADMIN_EMAILS.

  return response
}
