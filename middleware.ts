import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Verificăm dacă am "apăsat butonul" de offline din Vercel
  if (process.env.MAINTENANCE_MODE === "true") {
    // Redirecționăm tot traficul către pagina elegantă de offline
    request.nextUrl.pathname = "/offline";
    return NextResponse.rewrite(request.nextUrl);
  }

  return NextResponse.next();
}

// Setăm paznicul să patruleze pe absolut toate paginile (mai puțin imagini și resurse de cod)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|offline).*)"],
};
