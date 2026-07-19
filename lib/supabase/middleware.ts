import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const RUTE_PUBLIK = ["/login", "/auth"];

/** Menyegarkan sesi Supabase & memproteksi rute privat. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // JANGAN hapus: getUser() memvalidasi token ke server Supabase.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publik = RUTE_PUBLIK.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!user && !publik) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
