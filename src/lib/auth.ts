import { CompanyStatus, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasMinimumRole } from "@/lib/permissions";
import { hashStaffCodeLookup } from "@/lib/staff-code";
import { adminSignInSchema, staffPortalSignInSchema } from "@/lib/validations";
import { tenantIsActive } from "@/lib/tenant";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "workspace-credentials",
      name: "Workspace credentials",
      credentials: {
        companySlug: { label: "Company", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = adminSignInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const company = await prisma.company.findUnique({
          where: {
            slug: parsed.data.companySlug.toLowerCase(),
          },
        });

        if (!company || !tenantIsActive(company.status)) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            companyId: company.id,
            email: parsed.data.email.toLowerCase(),
            role: {
              in: ["MANAGER", "ADMIN", "SUPER_ADMIN"],
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companySlug: company.slug,
          subscriptionPlan: company.subscriptionPlan,
          companyStatus: company.status,
          departmentId: user.departmentId,
          employeeId: user.employeeId,
        };
      },
    }),
    CredentialsProvider({
      id: "staff-portal",
      name: "Staff portal",
      credentials: {
        companySlug: { label: "Company", type: "text" },
        staffCode: { label: "Staff code", type: "password" },
      },
      async authorize(credentials) {
        const parsed = staffPortalSignInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const company = await prisma.company.findUnique({
          where: {
            slug: parsed.data.companySlug.toLowerCase(),
          },
        });

        if (!company || !tenantIsActive(company.status)) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            companyId: company.id,
            staffCodeLookup: hashStaffCodeLookup(parsed.data.staffCode),
            role: "EMPLOYEE",
          },
        });

        if (!user || !user.isActive || !user.clockPinHash) {
          return null;
        }

        const accessCodeMatches = await bcrypt.compare(parsed.data.staffCode, user.clockPinHash);

        if (!accessCodeMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companySlug: company.slug,
          subscriptionPlan: company.subscriptionPlan,
          companyStatus: company.status,
          departmentId: user.departmentId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
        token.companySlug = user.companySlug;
        token.subscriptionPlan = user.subscriptionPlan;
        token.companyStatus = user.companyStatus;
        token.departmentId = user.departmentId;
        token.employeeId = user.employeeId;
      }

      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        token.sub &&
        token.role &&
        token.companyId &&
        token.companySlug &&
        token.subscriptionPlan &&
        token.companyStatus &&
        token.employeeId
      ) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companySlug = token.companySlug;
        session.user.subscriptionPlan = token.subscriptionPlan;
        session.user.companyStatus = token.companyStatus;
        session.user.departmentId = token.departmentId;
        session.user.employeeId = token.employeeId;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id || !user.companyId) {
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          action: "LOGIN",
          entity: "auth",
          metadata: {
            email: user.email,
          },
        },
      });
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions).then(async (session) => {
    if (!session?.user?.id || !session.user.companyId) {
      return session;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        role: true,
        departmentId: true,
        employeeId: true,
        companyId: true,
        isActive: true,
        company: {
          select: {
            slug: true,
            status: true,
            subscriptionPlan: true,
          },
        },
      },
    });

    if (!user || !user.isActive || user.companyId !== session.user.companyId || !tenantIsActive(user.company.status)) {
      return null;
    }

    session.user.role = user.role;
    session.user.departmentId = user.departmentId;
    session.user.employeeId = user.employeeId;
    session.user.companySlug = user.company.slug;
    session.user.companyStatus = user.company.status;
    session.user.subscriptionPlan = user.company.subscriptionPlan;

    return session;
  });
}

export async function requireAuth() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.companyStatus === CompanyStatus.SUSPENDED) {
    redirect("/login?reason=suspended");
  }

  return session;
}

export async function requireMinimumRole(minimumRole: Role) {
  const session = await requireAuth();

  if (!hasMinimumRole(session.user.role, minimumRole)) {
    redirect("/dashboard");
  }

  return session;
}
