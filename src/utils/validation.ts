import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid mobile number")
    .refine((value) => {
      const phone = parsePhoneNumberFromString(value, "IN");
      return phone?.isValid() ?? false;
    }, "Invalid mobile number"),
});

export type PhoneForm = z.infer<typeof phoneSchema>;