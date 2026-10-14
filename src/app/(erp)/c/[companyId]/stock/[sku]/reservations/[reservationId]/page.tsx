import type { Metadata } from "next";
import { StockReservationDetails } from "@/features/inventory/components/stock-reservation-details";

export const metadata: Metadata = { title: "Stock Reservation Details" };

export default async function StockReservationDetailsPage({ params }: { params: Promise<{ companyId: string; sku: string; reservationId: string }> }) {
  const { companyId, sku, reservationId } = await params;
  return <StockReservationDetails companyId={companyId} sku={sku} reservationId={reservationId} />;
}
