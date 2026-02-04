import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";

export default function AdminProducts() {
  const { toast } = useToast();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: api.adminProducts,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: api.adminCreateProduct,
    onSuccess: () => {
      toast({ title: "Product created successfully" });
      setAddProductOpen(false);
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: api.adminUpdateProduct,
    onSuccess: () => {
      toast({ title: "Product updated successfully" });
      setEditProductOpen(false);
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: api.adminDeleteProduct,
    onSuccess: () => {
      toast({ title: "Product deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const products = productsData?.products || [];

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setEditProductOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Package className="h-8 w-8" />
            Product Management
          </h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Button onClick={() => setAddProductOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Unit Measure</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category || 'N/A'}</TableCell>
                    <TableCell>₦{product.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>{product.unitMeasure || 'N/A'}</TableCell>
                    <TableCell>{product.stockQuantity}</TableCell>
                    <TableCell>
                      <Badge variant={product.isAvailable ? "default" : "secondary"}>
                        {product.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteProductMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <ProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSubmit={createProductMutation.mutate}
        isLoading={createProductMutation.isPending}
        title="Add New Product"
      />

      {/* Edit Product Dialog */}
      <ProductDialog
        open={editProductOpen}
        onOpenChange={setEditProductOpen}
        onSubmit={updateProductMutation.mutate}
        isLoading={updateProductMutation.isPending}
        title="Edit Product"
        product={selectedProduct}
      />
    </div>
  );
}

// Product Dialog Component
function ProductDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  title,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  title: string;
  product?: any;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "Fertilizer",
    unitPrice: product?.unitPrice?.toString() || "",
    unitMeasure: product?.unitMeasure || "50kg bag",
    stockQuantity: product?.stockQuantity?.toString() || "0",
    isAvailable: product?.isAvailable !== undefined ? product.isAvailable : true,
  });

  // Update form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "Fertilizer",
        unitPrice: product.unitPrice?.toString() || "",
        unitMeasure: product.unitMeasure || "50kg bag",
        stockQuantity: product.stockQuantity?.toString() || "0",
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "Fertilizer",
        unitPrice: "",
        unitMeasure: "50kg bag",
        stockQuantity: "0",
        isAvailable: true,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: {
      name: string;
      description: string;
      category: string;
      unitPrice: number;
      unitMeasure: string;
      stockQuantity: number;
      isAvailable: boolean;
      id?: string;
    } = {
      ...formData,
      unitPrice: parseFloat(formData.unitPrice),
      stockQuantity: parseInt(formData.stockQuantity),
    };
    
    if (product) {
      data.id = product.id;
    }
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {product ? "Update product information" : "Add a new product to your catalog"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Gladfore Fertilizer NPK 15:15:15"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Fertilizer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (₦) *</Label>
              <Input
                id="unitPrice"
                type="number"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="30000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitMeasure">Unit Measure</Label>
              <Input
                id="unitMeasure"
                value={formData.unitMeasure}
                onChange={(e) => setFormData({ ...formData, unitMeasure: e.target.value })}
                placeholder="e.g., 50kg bag"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Stock Quantity</Label>
              <Input
                id="stockQuantity"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isAvailable" className="cursor-pointer">
                Available for orders
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
