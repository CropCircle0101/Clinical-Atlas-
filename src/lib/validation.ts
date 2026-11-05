import { z } from "zod";
import { services, specialties } from "./catalog";
import { states } from "./us-states";

const catalogId = (items: { id: string }[]) =>
  z.string().refine((id) => items.some((s) => s.id === id), "Unknown catalog value");
export const searchRequestSchema = z
  .object({
    query: z.string().max(500).default(""),
    useAI: z.boolean().default(false),
    filters: z
      .object({
        location: z.string().max(100).optional(),
        radiusMiles: z.number().min(1).max(2000).optional(),
        specialtyId: catalogId(specialties).optional(),
        serviceId: catalogId(services).optional(),
        telehealth: z.boolean().optional(),
        insurance: z.string().max(100).optional(),
        maxPrice: z.number().min(0).max(100000).optional(),
        bounds: z
          .tuple([
            z.number().min(-180).max(180),
            z.number().min(-90).max(90),
            z.number().min(-180).max(180),
            z.number().min(-90).max(90),
          ])
          .refine(([w, s, e, n]) => w < e && s < n, "Invalid map bounds")
          .optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export const intentSchema = z
  .object({
    specialtyIds: z.array(catalogId(specialties)).max(5),
    serviceIds: z.array(catalogId(services)).max(8),
    terms: z.array(z.string().min(1).max(60)).max(8),
    location: z.string().max(100).nullable(),
    radiusMiles: z.number().min(1).max(2000).nullable(),
    telehealth: z.boolean().nullable(),
    insurance: z.string().max(100).nullable(),
    maxPrice: z.number().min(0).max(100000).nullable(),
    unsupported: z.boolean(),
  })
  .strict();
export const safeUrl = z
  .url()
  .max(2048)
  .refine((s) => {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use an HTTPS URL without credentials");
export const draftSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    description: z.string().trim().min(15).max(2000),
    website: safeUrl.nullable(),
    phone: z
      .string()
      .regex(/^[+()\d .-]{7,30}$/)
      .nullable(),
    telehealth: z.boolean().nullable(),
    priceFrom: z.number().min(0).max(100000).nullable(),
    priceNote: z.string().max(500).nullable(),
    insurance: z.array(z.string().trim().min(1).max(100)).max(20),
    specialtyIds: z.array(catalogId(specialties)).min(1).max(9),
    serviceIds: z.array(catalogId(services)).min(1).max(12),
    location: z
      .object({
        address: z.string().trim().min(3).max(200),
        city: z.string().trim().min(2).max(100),
        state: z.string().refine((s) => Boolean(states[s]), "Choose a valid US state abbreviation"),
        postalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
        latitude: z.number().min(18).max(72),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .refine((n) => n <= -60 || n >= 170, "Coordinates must be in the US geographic range"),
      })
      .strict(),
    evidence: z
      .array(
        z
          .object({
            label: z.string().trim().min(3).max(200),
            url: safeUrl,
            scope: z.enum([
              "identity",
              "address",
              "specialty",
              "service",
              "insurance",
              "price",
              "license",
            ]),
            serviceId: catalogId(services).nullable(),
          })
          .strict()
          .refine(
            (v) => (v.scope === "service") === (v.serviceId !== null),
            "Service evidence needs a service",
          ),
      )
      .max(30),
  })
  .strict();
