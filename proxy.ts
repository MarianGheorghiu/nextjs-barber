import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Verificăm dacă suntem în Mod Mentenanță din Vercel
  if (process.env.MAINTENANCE_MODE === "true") {
    // Redirecționăm curat către /offline
    return NextResponse.redirect(new URL("/offline", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludem rutele statice, API-urile și pagina însăși de offline ca să nu intre într-o buclă infinită
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|offline).*)"],
};
