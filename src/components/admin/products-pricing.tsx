'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createProduct, createPrice, getProducts, getPrices } from '@/lib/stripeService';
import { Plus, DollarSign, Package, Loader2 } from 'lucide-react';

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

export default function ProductsPricing() {
  const { companyProfile } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
  });
  const [createProductLoading, setCreateProductLoading] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  
  // Price form state
  const [priceForm, setPriceForm] = useState({
    productId: '',
    amount: '',
    currency: 'usd',
  });
  const [createPriceLoading, setCreatePriceLoading] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  const stripeAccountId = mode === 'test' 
    ? companyProfile?.stripeAccountId_test 
    : companyProfile?.stripeAccountId_live;

  const isStripeConnected = mode === 'test' 
    ? companyProfile?.stripeAccountOnboarded_test 
    : companyProfile?.stripeAccountOnboarded_live;

  // Load products and prices
  useEffect(() => {
    const loadData = async () => {
      if (!stripeAccountId || !isStripeConnected) {
        setLoading(false);
        return;
      }

      try {
        const [productsResult, pricesResult] = await Promise.all([
          getProducts(stripeAccountId, mode),
          getPrices(stripeAccountId, mode)
        ]);

        if (productsResult.error) {
          setError(productsResult.error);
          return;
        }

        if (pricesResult.error) {
          setError(pricesResult.error);
          return;
        }

        setProducts(productsResult.products || []);
        setPrices(pricesResult.prices || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [stripeAccountId, isStripeConnected, mode]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeAccountId || !productForm.name.trim()) return;

    setCreateProductLoading(true);
    try {
      const result = await createProduct(
        stripeAccountId,
        productForm.name.trim(),
        productForm.description.trim(),
        mode
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      // Add new product to list
      setProducts(prev => [result.product, ...prev]);
      setProductForm({ name: '', description: '' });
      setProductDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setCreateProductLoading(false);
    }
  };

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeAccountId || !priceForm.productId || !priceForm.amount) return;

    setCreatePriceLoading(true);
    try {
      const unitAmount = Math.round(parseFloat(priceForm.amount) * 100); // Convert to cents
      const result = await createPrice(
        stripeAccountId,
        priceForm.productId,
        unitAmount,
        priceForm.currency,
        mode
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      // Add new price to list
      setPrices(prev => [result.price, ...prev]);
      setPriceForm({ productId: '', amount: '', currency: 'usd' });
      setPriceDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create price');
    } finally {
      setCreatePriceLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  if (!isStripeConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products & Pricing
          </CardTitle>
          <CardDescription>
            Manage your products and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Connect your Stripe account first to manage products and pricing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products & Pricing
              </CardTitle>
              <CardDescription>
                Manage your products and pricing in {mode} mode
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={(value: 'test' | 'live') => setMode(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mb-6">
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g., Coaching Session"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productDescription">Description</Label>
                    <Textarea
                      id="productDescription"
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your product..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={createProductLoading}>
                    {createProductLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Price
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Price</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePrice} className="space-y-4">
                  <div>
                    <Label htmlFor="priceProduct">Product</Label>
                    <Select
                      value={priceForm.productId}
                      onValueChange={(value) => setPriceForm(prev => ({ ...prev, productId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priceAmount">Amount</Label>
                    <Input
                      id="priceAmount"
                      type="number"
                      step="0.01"
                      value={priceForm.amount}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      placeholder="99.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceCurrency">Currency</Label>
                    <Select
                      value={priceForm.currency}
                      onValueChange={(value) => setPriceForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="eur">EUR</SelectItem>
                        <SelectItem value="gbp">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={createPriceLoading}>
                    {createPriceLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Price'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Loading products and pricing...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Products Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Products</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600">{product.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.active ? 'default' : 'secondary'}>
                            {product.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(product.created * 1000).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Prices Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Prices</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.map(price => (
                      <TableRow key={price.id}>
                        <TableCell>{getProductName(price.product)}</TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(price.unit_amount, price.currency)}
                        </TableCell>
                        <TableCell>
                          {new Date(price.created * 1000).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}