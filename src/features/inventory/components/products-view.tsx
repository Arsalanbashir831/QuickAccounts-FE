"use client";

import { Barcode, Boxes, CheckCircle2, PackagePlus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockFormDialog } from "./stock-form-dialog";

interface ProductCatalogItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  uom: string;
  tracking: "Serialized" | "Standard";
  warranty: string;
}

const mockProducts: ProductCatalogItem[] = [
  {
    id: "prod-1",
    sku: "SAM-A55-BLK",
    barcode: "8806091829102",
    name: "Samsung Galaxy A55 5G (8/256GB)",
    category: "Smartphones",
    costPrice: 98000,
    salePrice: 114500,
    uom: "Unit",
    tracking: "Serialized",
    warranty: "1 Year Official",
  },
  {
    id: "prod-2",
    sku: "XIA-RN13-BLU",
    barcode: "6941812739182",
    name: "Redmi Note 13 Pro (12/512GB)",
    category: "Smartphones",
    costPrice: 68500,
    salePrice: 78900,
    uom: "Unit",
    tracking: "Serialized",
    warranty: "1 Year Official",
  },
  {
    id: "prod-3",
    sku: "ANK-65W-WHT",
    barcode: "0848061048291",
    name: "Anker 65W GaN Fast Charger",
    category: "Accessories",
    costPrice: 4800,
    salePrice: 6800,
    uom: "Piece",
    tracking: "Standard",
    warranty: "6 Months Replacement",
  },
  {
    id: "prod-4",
    sku: "APL-20W-ORIG",
    barcode: "190199588500",
    name: "Apple 20W USB-C Power Adapter",
    category: "Accessories",
    costPrice: 3900,
    salePrice: 5200,
    uom: "Piece",
    tracking: "Standard",
    warranty: "1 Year Official",
  },
];

export const ProductsView = () => {
  const [products, setProducts] = useState<ProductCatalogItem[]>(mockProducts);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Smartphones");
  const [costPrice, setCostPrice] = useState(5000);
  const [salePrice, setSalePrice] = useState(7500);
  const [tracking, setTracking] = useState<"Serialized" | "Standard">("Standard");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search),
  );

  const handleAddProduct = () => {
    if (!name.trim() || !sku.trim()) return;
    const newProd: ProductCatalogItem = {
      id: `prod-${Date.now()}`,
      sku,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name,
      category,
      costPrice,
      salePrice,
      uom: "Piece",
      tracking,
      warranty: tracking === "Serialized" ? "1 Year Official" : "6 Months",
    };
    setProducts([...products, newProd]);
    setShowAddModal(false);
    setName("");
    setSku("");
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Product Catalog & Master SKUs</CardTitle>
            <CardDescription>
              Maintain product identifiers, costs, selling prices, and serial tracking rules
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, SKU, or barcode..."
                className="pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-center">Tracking</TableHead>
                <TableHead>Warranty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell className="font-mono font-bold text-primary">{prod.sku}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {prod.barcode}
                  </TableCell>
                  <TableCell className="font-semibold text-heading">{prod.name}</TableCell>
                  <TableCell className="text-xs">{prod.category}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    ${prod.costPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-heading">
                    ${prod.salePrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge tone={prod.tracking === "Serialized" ? "info" : "neutral"}>
                      {prod.tracking}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{prod.warranty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAddModal && (
        <StockFormDialog
          eyebrow="Product catalog"
          title="Register new product"
          description="Set the product identity, pricing, and how each unit will be tracked."
          icon={PackagePlus}
          wide
          onClose={() => setShowAddModal(false)}
          footer={<><Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button><Button type="button" onClick={handleAddProduct}><CheckCircle2 className="size-4" />Save product</Button></>}
        >
          <div className="grid gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-7">
            <section className="space-y-4" aria-labelledby="product-identity-heading">
              <div><h3 id="product-identity-heading" className="text-sm font-semibold text-heading">Product identity</h3><p className="mt-1 text-sm text-muted-foreground">The name and SKU used across stock, sales, and purchases.</p></div>
              <label className="block space-y-2 text-sm font-medium text-heading">Product name<Input data-dialog-autofocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sony WH-1000XM5 Headphones" className="h-11 text-base" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium text-heading">SKU code<Input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="e.g. SNY-WH1000-BLK" className="h-11 font-mono text-base" /></label>
                <label className="block space-y-2 text-sm font-medium text-heading">Category<select className="h-11 w-full rounded-md border border-input bg-background px-3 text-base text-heading focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20" value={category} onChange={(event) => setCategory(event.target.value)}><option>Smartphones</option><option>Accessories</option><option>Audio</option><option>Laptops & Tablets</option></select></label>
              </div>
            </section>

            <section className="space-y-4 border-t pt-6" aria-labelledby="product-pricing-heading">
              <div><h3 id="product-pricing-heading" className="text-sm font-semibold text-heading">Pricing</h3><p className="mt-1 text-sm text-muted-foreground">Default prices can be adjusted when creating a transaction.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium text-heading">Cost price <span className="font-normal text-muted-foreground">(USD)</span><Input type="number" value={costPrice} onChange={(event) => setCostPrice(Number(event.target.value) || 0)} className="h-11 text-base tabular-nums" /></label>
                <label className="block space-y-2 text-sm font-medium text-heading">Selling price <span className="font-normal text-muted-foreground">(USD)</span><Input type="number" value={salePrice} onChange={(event) => setSalePrice(Number(event.target.value) || 0)} className="h-11 text-base font-semibold tabular-nums text-primary" /></label>
              </div>
            </section>
            </div>

            <fieldset className="min-w-0 space-y-4 border-t pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <legend className="text-sm font-semibold text-heading">Unit tracking</legend>
              <p className="text-sm text-muted-foreground">Choose how stock for this product is recorded.</p>
              <div className="grid gap-3">
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/20 ${tracking === "Serialized" ? "border-primary bg-primary/5" : "hover:bg-muted/35"}`}><input type="radio" name="tracking" checked={tracking === "Serialized"} onChange={() => setTracking("Serialized")} className="mt-1 size-4 accent-primary" /><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold text-heading"><Barcode className="size-4 text-primary" />Serialized</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Track each unit by its unique IMEI or serial number.</span></span></label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/20 ${tracking === "Standard" ? "border-primary bg-primary/5" : "hover:bg-muted/35"}`}><input type="radio" name="tracking" checked={tracking === "Standard"} onChange={() => setTracking("Standard")} className="mt-1 size-4 accent-primary" /><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold text-heading"><Boxes className="size-4 text-primary" />Standard batch</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Track total quantity without individual serials.</span></span></label>
              </div>
            </fieldset>
          </div>
        </StockFormDialog>
      )}
    </div>
  );
};
