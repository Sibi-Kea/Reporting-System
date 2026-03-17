export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/clock/:path*", "/employees/:path*", "/reports/:path*", "/settings/:path*"],
};
