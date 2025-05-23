import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {Company} from "@/types/company";

const companyFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone_number: z
    .string()
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format"),
  email: z.string().email("Invalid email address"),
  website_url: z
    .string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("")),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  readonly initialData?: Company;
  readonly onSubmit: (data: CompanyFormData) => Promise<void>;
  readonly isSubmitting?: boolean;
}

export function CompanyForm({
  initialData,
  onSubmit,
  isSubmitting,
}: CompanyFormProps) {
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      phone_number: initialData?.phone_number ?? "",
      email: initialData?.email ?? "",
      website_url: initialData?.website_url ?? "",
    },
  });
  const [active, setActive] = useState(initialData?.is_active ?? true);

  const getSubmitButtonText = () => {
    if (isSubmitting) return "Saving...";
    return initialData ? "Update Company" : "Create Company";
  };

  // Only show toggler if editing
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          onSubmit({ ...data, is_active: active })
        )}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter company address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter email address"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter website URL" type="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {initialData && (
          <div className="flex items-center gap-2">
            <Switch
              checked={active}
              onCheckedChange={setActive}
              id="is_active"
              disabled={isSubmitting}
            />
            <label htmlFor="is_active" className="text-sm">
              {active ? "Active" : "Inactive"}
            </label>
          </div>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {getSubmitButtonText()}
        </Button>
      </form>
    </Form>
  );
}
