import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, ShieldCheck, Package } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const BuyerDeliveryRecordPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();

  const { data: record, isLoading } = useQuery({
    queryKey: ['delivery-record', orderId],
    queryFn: () => reportsApi.getDeliveryRecord(orderId || 'ord-001'),
  });

  if (isLoading || !record) return <LoadingSpinner />;

  const rows = [
    { label: 'Carrier', value: record.logistics_partner, strong: true },
    { label: 'Tracking Code', value: <Badge tone="accent">{record.tracking_number}</Badge> },
    { label: 'Dispatched Units', value: `${record.dispatched_quantity} units`, bold: true },
    { label: 'Dispatch Date', value: record.dispatch_date, strong: true },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={`Order #${record.order_number}`}
        title="Delivery Record & Proof"
        subtitle={record.title}
      />

      <MotionContainer className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2" amount={0.15}>
        <MotionItem>
          <Card>
            <CardBody>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  <Truck size={20} />
                </span>
                <h3 className="text-sm font-bold text-ink">Logistics & Tracking</h3>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 text-sm">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3">
                    <span className="text-muted-2">{r.label}:</span>
                    <span className={`text-right ${r.bold ? 'font-bold text-ink' : r.strong ? 'font-semibold text-ink' : 'text-ink'}`}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </MotionItem>

        <MotionItem>
          <Card>
            <CardBody>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/12 text-success">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="text-sm font-bold text-ink">Quality Verification</h3>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-2">Verified By:</span>
                  <span className="font-semibold text-ink">{record.verified_by_checker}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-2">Accepted Quality Rate:</span>
                  <Badge tone="success">100% Passed</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-2">
                  All pieces underwent 100% dimensional and seam inspection before packaging.
                </p>
              </div>
            </CardBody>
          </Card>
        </MotionItem>
      </MotionContainer>

      <h2 className="mb-3 mt-7 flex items-center gap-2 text-base font-bold text-ink">
        <Package size={18} /> Finished Goods Inspection Gallery
      </h2>
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {record.buyer_visible_media?.map((m: any, idx: number) => (
              <div key={idx} className="overflow-hidden rounded-2xl border border-stone-200/70">
                <img src={m.url} alt="Finished Goods" className="h-52 w-full object-cover" />
                <div className="bg-inset px-3 py-2">
                  <p className="text-xs text-muted">{m.file_name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
