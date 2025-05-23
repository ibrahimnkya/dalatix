import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Company } from "@/lib/services/company";
import { CompanyForm, type CompanyFormData } from "./company-form";

interface CompanyListProps {
  readonly companies: Company[];
  readonly onEdit: (company: Company) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}

export function CompanyList({ companies, onEdit, onDelete }: CompanyListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = async (data: CompanyFormData) => {
    if (!selectedCompany) return;

    try {
      setIsSubmitting(true);
      await onEdit({ ...selectedCompany, ...data });
      setIsEditDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;

    try {
      setIsSubmitting(true);
      await onDelete(selectedCompany.id);
      setIsDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search companies..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium">
                Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Address
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Phone
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Email
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Website
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Status
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="border-b">
                <td className="p-4">{company.name}</td>
                <td className="p-4">{company.address}</td>
                <td className="p-4">{company.phone_number}</td>
                <td className="p-4">{company.email}</td>
                <td className="p-4">
                  {company.website_url ? (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit Website
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      company.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {company.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Edit Company
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-500">
              Update the company information below.
            </Dialog.Description>
            {selectedCompany && (
              <div className="mt-4">
                <CompanyForm
                  initialData={selectedCompany}
                  onSubmit={handleEdit}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Delete Company
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete {selectedCompany?.name}? This
              action cannot be undone.
            </Dialog.Description>
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
