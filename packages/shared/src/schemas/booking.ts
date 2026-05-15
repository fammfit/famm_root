import { z } from "zod";

export const CreateBookingSchema = z.object({
  serviceId: z.string().cuid(),
  trainerId: z.string().cuid().optional(),
  locationId: z.string().cuid().optional(),
  startAt: z.string().datetime(),
  timezone: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const UpdateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(2000).optional(),
  cancellationReason: z.string().max(500).optional(),
});

export const RescheduleBookingSchema = z.object({
  startAt: z.string().datetime(),
  timezone: z.string().min(1),
});

export const GetSlotsSchema = z.object({
  serviceId: z.string().cuid(),
  trainerId: z.string().cuid().optional(),
  locationId: z.string().cuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof RescheduleBookingSchema>;
export type GetSlotsInput = z.infer<typeof GetSlotsSchema>;
