import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Package } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { Card, CardBody } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Textarea, FormControl, FormLabel } from '@/components/ui/Form';

export const CreateOrderPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('2026-12-10');
  const [items, setItems] = useState([
    { product_name: 'Cotton Handloom Tote Bag', quantity: 100, unit_type: 'piece', agreed_unit_price: 90.0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const addItem = () =>
    setItems([...items, { product_name: '', quantity: 50, unit_type: 'piece', agreed_unit_price: 50.0 }]);

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const order = await ordersApi.create({
        title,
        description,
        required_by_date: dueDate,
        items,
      });
      toast({ title: 'Order created successfully', status: 'success' });
      navigate(`/orders/${order.id}`);
    } catch {
      toast({ title: 'Failed to create order', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Orders"
        title="Create Production Order"
        subtitle="Add order requirements and product line items"
      />

      <Card className="mt-7">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormControl isRequired>
              <FormLabel isRequired>Order Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Corporate Gifts — Jute Bags"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Description & Specifications</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed requirements…"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel isRequired>Required Delivery Date</FormLabel>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormControl>

            <div className="pt-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Package size={16} /> Product Items
                </h3>
                <Button size="xs" variant="soft" tone="ink" leftIcon={<Plus size={14} />} onClick={addItem}>
                  Add Item
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      placeholder="Product Name"
                      value={item.product_name}
                      onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                      className="sm:flex-[3]"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="sm:flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Price (₹)"
                      value={item.agreed_unit_price}
                      onChange={(e) => updateItem(idx, 'agreed_unit_price', parseFloat(e.target.value) || 0)}
                      className="sm:flex-1"
                    />
                    {items.length > 1 && (
                      <IconButton
                        label="Remove item"
                        variant="ghost"
                        tone="danger"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <Button type="submit" size="lg" fullWidth isLoading={isLoading}>
              Confirm Order
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
