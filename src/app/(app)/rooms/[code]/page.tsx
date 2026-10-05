import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRoomByCode } from "@/server/queries";
import { RoomClient } from "@/components/room-client";

export const metadata: Metadata = { title: "Focus Room" };
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { code } = await params;
  const room = await getRoomByCode(code.toUpperCase());
  if (!room) notFound();

  return (
    <RoomClient
      code={room.code}
      meId={user.id}
      isHostMe={room.hostId === user.id}
      iAmAdmin={user.role === "admin"}
    />
  );
}
