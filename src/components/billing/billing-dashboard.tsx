'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/billingService';

interface BillingRecord {
  id: string;
  sessionId: string;
  paymentIntentId: string;
  clientName: string;
  clientEmail: string;
  coachName: string;
  sessionType: string;
  amountCharged: number;
  currency: string;
  stripeMode: string;
  billedAt: any;
  status: 'succeeded' | 'failed';
  error?: string;
}

interface BillingDashboardProps {
  companyId: string;
  stripeMode: 'test' | 'live';
}

export function BillingDashboard({ companyId, stripeMode }: BillingDashboardProps) {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [failedTransactions, setFailedTransactions] = useState(0);

  useEffect(() => {
    async function fetchBillingRecords() {
      try {
        const q = query(
          collection(db, 'billing_records'),
          where('companyId', '==', companyId),
          where('stripeMode', '==', stripeMode),
          orderBy('billedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const records: BillingRecord[] = [];
        let revenue = 0;
        let total = 0;
        let failed = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const record: BillingRecord = {
            id: doc.id,
            sessionId: data.sessionId,
            paymentIntentId: data.paymentIntentId,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            coachName: data.coachName,
            sessionType: data.sessionType,
            amountCharged: data.amountCharged,
            currency: data.currency,
            stripeMode: data.stripeMode,
            billedAt: data.billedAt,
            status: data.status,
            error: data.error,
          };

          records.push(record);
          total++;

          if (record.status === 'succeeded') {
            revenue += record.amountCharged;
          } else {
            failed++;
          }
        });

        setBillingRecords(records);
        setTotalRevenue(revenue);
        setTotalTransactions(total);
        setFailedTransactions(failed);
      } catch (error) {
        console.error('Error fetching billing records:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillingRecords();
  }, [companyId, stripeMode]);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingRecords.length > 0 
                ? formatCurrency(totalRevenue, billingRecords[0].currency)
                : '$0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              In {stripeMode} mode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Sessions billed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Billing Activity</CardTitle>
          <CardDescription>
            All billing transactions for your company in {stripeMode} mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No billing records found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Billing records will appear here after clients are charged for sessions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Session Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.billedAt?.toDate ? 
                        record.billedAt.toDate().toLocaleDateString() : 
                        new Date(record.billedAt).toLocaleDateString()
                      }
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.clientName}</p>
                        <p className="text-sm text-muted-foreground">{record.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{record.coachName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.sessionType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(record.amountCharged, record.currency)}
                    </TableCell>
                    <TableCell>
                      {record.status === 'succeeded' ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}