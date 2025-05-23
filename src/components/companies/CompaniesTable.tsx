"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Eye } from "lucide-react";

type Company = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  address: string;
  website_url?: string;
  is_active: boolean;
};

export function CompaniesTable({
  data = [],
  onEdit,
  onDelete,
  onView,
}: {
  data: Company[];
  onEdit?: (company: Company) => void;
  onDelete?: (company: Company) => void;
  onView?: (company: Company) => void;
}) {
  const companies = Array.isArray(data) ? data : [];

  return (
    <div className="rounded-md border border-secondary/10">
      <Table>
        <TableHeader className="bg-secondary/5">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                No companies found
              </TableCell>
            </TableRow>
          ) : (
            companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.phone_number}</TableCell>
                <TableCell>{company.address}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      company.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {company.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView?.(company)}
                    className="text-secondary hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(company)}
                    className="text-secondary hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(company)}
                    className="text-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
