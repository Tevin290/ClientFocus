'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Package, DollarSign, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createProduct, createPrice, getProducts, getPrices } from '@/lib/stripeService';
import { getStripeMode } from '@/lib/stripeClient';
import type { CompanyProfile } from '@/lib/firestoreService';

interface StripeProductsManagementProps {
  companyProfile: CompanyProfile;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
}

interface Price {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  active: boolean;
  created: number;
}

export function StripeProductsManagement({ companyProfile }: StripeProductsManagementProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingPrice, setIsCreatingPrice] = useState(false);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<string>('');

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: ''
  });

  // Price form state
  const [priceForm, setPriceForm] = useState({
    productId: '',
    amount: '',
    currency: 'usd'
  });

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  useEffect(() => {
    setStripeMode(getStripeMode());
  }, []);

  const accountId = stripeMode === 'test' ? companyProfile.stripeAccountId_test : companyProfile.stripeAccountId_live;
  const isAccountOnboarded = stripeMode === 'test' ? companyProfile.stripeAccountOnboarded_test : companyProfile.stripeAccountOnboarded_live;

  useEffect(() => {
    if (isAccountOnboarded && accountId) {
      loadProductsAndPrices();
    } else {
      setIsLoading(false);
    }
  }, [isAccountOnboarded, accountId, stripeMode]);

  const loadProductsAndPrices = async () => {
    if (!accountId) return;
    
    setIsLoading(true);
    try {
      const [productsResult, pricesResult] = await Promise.all([
        getProducts(accountId, stripeMode),
        getPrices(accountId, stripeMode)
      ]);

      if (productsResult.error) {
        throw new Error(productsResult.error);
      }
      if (pricesResult.error) {
        throw new Error(pricesResult.error);
      }

      setProducts(productsResult.products || []);
      setPrices(pricesResult.prices || []);
    } catch (error: any) {
      console.error('Error loading products and prices:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load products and prices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!accountId || !productForm.name.trim()) return;

    setIsCreatingProduct(true);
    try {
      const { product, error } = await createProduct(
        accountId,
        productForm.name.trim(),
        productForm.description.trim(),
        stripeMode
      );

      if (error || !product) {
        throw new Error(error || 'Failed to create product');
      }

      toast({
        title: 'Success',
        description: 'Product created successfully',
      });

      // Reset form and close dialog
      setProductForm({ name: '', description: '' });
      setShowProductDialog(false);
      
      // Reload products
      await loadProductsAndPrices();
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleCreatePrice = async () => {
    if (!accountId || !priceForm.productId || !priceForm.amount) return;

    const unitAmount = Math.round(parseFloat(priceForm.amount) * 100); // Convert to cents
    if (isNaN(unitAmount) || unitAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid price amount',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingPrice(true);
    try {
      const { price, error } = await createPrice(
        accountId,
        priceForm.productId,
        unitAmount,
        priceForm.currency,
        stripeMode
      );

      if (error || !price) {
        throw new Error(error || 'Failed to create price');
      }

      toast({
        title: 'Success',
        description: 'Price created successfully',
      });

      // Reset form and close dialog
      setPriceForm({ productId: '', amount: '', currency: 'usd' });
      setShowPriceDialog(false);
      setSelectedProductForPrice('');
      
      // Reload prices
      await loadProductsAndPrices();
    } catch (error: any) {
      console.error('Error creating price:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create price',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPrice(false);
    }
  };

  const formatPrice = (unitAmount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(unitAmount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!isAccountOnboarded || !accountId) {
    return (
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Package className="mr-2 h-6 w-6 text-primary" />
            Products & Pricing
          </CardTitle>
          <CardDescription>
            Complete your Stripe onboarding to manage products and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect and complete your Stripe account setup to create and manage products and prices.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Package className="mr-2 h-6 w-6 text-primary" />
            Products & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Products Section */}
      <Card className="shadow-light">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline flex items-center">
                <Package className="mr-2 h-6 w-6 text-primary" />
                Products ({stripeMode} mode)
              </CardTitle>
              <CardDescription>
                Manage your service offerings and products.
              </CardDescription>
            </div>
            <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Add a new service or product to your Stripe catalog.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input
                      id="product-name"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., 1-hour Coaching Session"
                    />
                  </div>
                  <div>
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea
                      id="product-description"
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your product or service..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProduct} disabled={isCreatingProduct || !productForm.name.trim()}>
                    {isCreatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Product
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products created yet.</p>
              <p className="text-sm text-muted-foreground">Create your first product to start setting up pricing.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(product.created)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProductForPrice(product.id);
                          setPriceForm(prev => ({ ...prev, productId: product.id }));
                          setShowPriceDialog(true);
                        }}
                      >
                        <DollarSign className="mr-1 h-3 w-3" />
                        Add Price
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Prices Section */}
      <Card className="shadow-light">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline flex items-center">
                <DollarSign className="mr-2 h-6 w-6 text-primary" />
                Pricing ({stripeMode} mode)
              </CardTitle>
              <CardDescription>
                Manage pricing for your products and services.
              </CardDescription>
            </div>
            <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
              <DialogTrigger asChild>
                <Button disabled={products.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Price
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Price</DialogTitle>
                  <DialogDescription>
                    Set pricing for one of your products.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="price-product">Product</Label>
                    <select
                      id="price-product"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={priceForm.productId}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, productId: e.target.value }))}
                    >
                      <option value="">Select a product...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="price-amount">Price Amount</Label>
                    <Input
                      id="price-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.amount}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-currency">Currency</Label>
                    <select
                      id="price-currency"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={priceForm.currency}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="cad">CAD</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePrice} 
                    disabled={isCreatingPrice || !priceForm.productId || !priceForm.amount}
                  >
                    {isCreatingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Price
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {prices.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prices created yet.</p>
              <p className="text-sm text-muted-foreground">Create products first, then add pricing options.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => {
                  const product = products.find(p => p.id === price.product);
                  return (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">
                        {product?.name || 'Unknown Product'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPrice(price.unit_amount, price.currency)}
                      </TableCell>
                      <TableCell className="uppercase">{price.currency}</TableCell>
                      <TableCell>
                        <Badge variant={price.active ? "default" : "secondary"}>
                          {price.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(price.created)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}