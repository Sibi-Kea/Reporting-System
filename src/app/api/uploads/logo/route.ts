import { put } from "@vercel/blob";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || !hasMinimumRole(session.user.role, Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const companyId = String(formData.get("companyId") ?? session.user.companyId);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A logo file is required." }, { status: 400 });
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const upload = await put(`logos/${companyId}/${Date.now()}-${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      return NextResponse.json({ url: upload.url });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload logo." },
      { status: 400 },
    );
  }
}
