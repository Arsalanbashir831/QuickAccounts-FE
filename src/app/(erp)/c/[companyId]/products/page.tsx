import type { Metadata } from "next";
import { ProductsWorkspace } from "@/features/catalog/products-workspace";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <ProductsWorkspace companyId={companyId} />;
}
