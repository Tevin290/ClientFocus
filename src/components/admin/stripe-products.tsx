'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRole } from '@/context/role-context';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  prices: Price[];
}

interface Price {
  id: string;
  amount: number;
  currency: string;
  interval?: 'month' | 'year';
  active: boolean;
}

export default function StripeProducts() {
  const { companyProfile } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', currency: 'usd', interval: 'month' });

  const isStripeConnected = companyProfile?.stripeAccountId_test || companyProfile?.stripeAccountId_live;

  useEffect(() => {
    if (isStripeConnected) {
      loadProducts();
    }
  }, [isStripeConnected]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch Stripe products
      console.log('Loading products for company:', companyProfile?.id);
      // Mock data for now
      setProducts([
        {
          id: 'prod_1',
          name: 'Coaching Session',
          description: 'One-on-one coaching session',
          active: true,
          prices: [
            { id: 'price_1', amount: 10000, currency: 'usd', interval: undefined, active: true }
          ]
        },
        {
          id: 'prod_2',
          name: 'Monthly Coaching Package',
          description: 'Monthly subscription for coaching',
          active: true,
          prices: [
            { id: 'price_2', amount: 20000, currency: 'usd', interval: 'month', active: true }
          ]
        }
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      // TODO: Implement API call to create Stripe product
      console.log('Creating product:', newProduct);
      setIsCreateDialogOpen(false);
      setNewProduct({ name: '', description: '', price: '', currency: 'usd', interval: 'month' });
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (!isStripeConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Products</CardTitle>
          <CardDescription>
            Connect your Stripe account to manage products and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please connect your Stripe account first to manage products and pricing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Products & Pricing</h2>
          <p className="text-gray-600">Manage your coaching products and pricing</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your Stripe account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Coaching Session"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Brief description of the product"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (in dollars)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="interval">Billing Interval</Label>
                <select
                  id="interval"
                  value={newProduct.interval}
                  onChange={(e) => setNewProduct({ ...newProduct, interval: e.target.value as 'month' | 'year' })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">One-time</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProduct}>Create Product</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading products...</div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {product.name}
                      {product.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </h4>
                  {product.prices.map((price) => (
                    <div key={price.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{formatPrice(price.amount, price.currency)}</span>
                      <span className="text-sm text-gray-600">
                        {price.interval ? `per ${price.interval}` : 'one-time'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}