import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRequestContext } from "@/lib/request-context";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { ToastProvider } from "@/components/ui/Toast";

interface PageProps {
  params: { serviceId: string };
  searchParams?: { trainerId?: string; locationId?: string };
}

export const dynamic = "force-dynamic";

export default async function BookServicePage({ params, searchParams }: PageProps) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    notFound();
  }

  const service = await prisma.service.findFirst({
    where: { id: params.serviceId, tenantId: ctx.tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      basePrice: true,
      currency: true,
    },
  });
  if (!service) notFound();

  let trainer = null;
  if (searchParams?.trainerId) {
    const t = await prisma.trainerProfile.findFirst({
      where: {
        id: searchParams.trainerId,
        user: { memberships: { some: { tenantId: ctx.tenantId } } },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (t) {
      trainer = {
        id: t.id,
        name: [t.user?.firstName, t.user?.lastName].filter(Boolean).join(" "),
      };
    }
  }

  let location = null;
  if (searchParams?.locationId) {
    const l = await prisma.location.findFirst({
      where: { id: searchParams.locationId, tenantId: ctx.tenantId },
      select: { id: true, name: true },
    });
    if (l) location = l;
  }

  return (
    <ToastProvider>
      <BookingFlow
        service={{
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          basePrice: service.basePrice,
          currency: service.currency,
          description: service.description ?? undefined,
        }}
        trainer={trainer}
        location={location}
      />
    </ToastProvider>
  );
}
