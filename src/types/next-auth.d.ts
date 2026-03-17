import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "EMPLOYEE" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";
      companyId: string;
      companySlug: string;
      subscriptionPlan: "STARTER" | "GROWTH" | "PREMIUM";
      companyStatus: "ACTIVE" | "SUSPENDED";
      departmentId?: string | null;
      employeeId: string;
    };
  }

  interface User {
    role: "EMPLOYEE" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";
    companyId: string;
    companySlug: string;
    subscriptionPlan: "STARTER" | "GROWTH" | "PREMIUM";
    companyStatus: "ACTIVE" | "SUSPENDED";
    departmentId?: string | null;
    employeeId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "EMPLOYEE" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";
    companyId?: string;
    companySlug?: string;
    subscriptionPlan?: "STARTER" | "GROWTH" | "PREMIUM";
    companyStatus?: "ACTIVE" | "SUSPENDED";
    departmentId?: string | null;
    employeeId?: string;
  }
}
