import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const CONSUMER_PREFIXES = ['/dashboard', '/scan', '/projects', '/achievements', '/welcome', '/perfil', '/ranking', '/seeds'];
const MERCHANT_PREFIXES = ['/lojista', '/extrato', '/invoice'];
const NGO_PREFIXES = ['/ong'];
const ADMIN_PREFIXES = ['/admin'];

const roleHome: Record<string, string> = {
  consumer: '/dashboard',
  merchant: '/lojista',
  ngo_admin: '/ong',
  platform_admin: '/admin',
};

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isConsumerArea = matchesPrefix(pathname, CONSUMER_PREFIXES);
  const isMerchantArea = matchesPrefix(pathname, MERCHANT_PREFIXES);
  const isNgoArea = matchesPrefix(pathname, NGO_PREFIXES);
  const isAdminArea = matchesPrefix(pathname, ADMIN_PREFIXES);

  if (!isConsumerArea && !isMerchantArea && !isNgoArea && !isAdminArea) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as keyof typeof roleHome | undefined) ?? 'consumer';
  const home = roleHome[role] ?? '/dashboard';

  const allowed =
    (role === 'consumer' && isConsumerArea) ||
    (role === 'merchant' && isMerchantArea) ||
    (role === 'ngo_admin' && isNgoArea) ||
    (role === 'platform_admin' && isAdminArea);

  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard', '/dashboard/:path*',
    '/scan', '/scan/:path*',
    '/projects', '/projects/:path*',
    '/achievements', '/achievements/:path*',
    '/welcome', '/welcome/:path*',
    '/perfil', '/perfil/:path*',
    '/ranking', '/ranking/:path*',
    '/seeds', '/seeds/:path*',
    '/lojista', '/lojista/:path*',
    '/extrato', '/extrato/:path*',
    '/invoice', '/invoice/:path*',
    '/ong', '/ong/:path*',
    '/admin', '/admin/:path*',
  ],
};
