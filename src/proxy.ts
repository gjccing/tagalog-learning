import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/lib/locales";

function getPreferredLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("lang")?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (
    accept.includes("zh-tw") ||
    accept.includes("zh-hant") ||
    /(^|,)zh\b/.test(accept)
  ) {
    return "zh-TW";
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.next();
  }

  const localeFromPath = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (localeFromPath) {
    const headers = new Headers(request.headers);
    headers.set("x-lang", localeFromPath);
    return NextResponse.next({
      request: { headers },
    });
  }

  const locale = getPreferredLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const proxyConfig = {
  matcher: ["/((?!_next|api|mcp|favicon.ico|.*\\..*).*)"],
};

export const config = proxyConfig;
