import React, { useState } from 'react';
import { membersApi } from '@/lib/api/members';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalClose } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, FormControl, FormLabel } from '@/components/ui/Form';

export const AddMemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [skill, setSkill] = useState('STITCHING');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Please enter the member name', status: 'warning' });
      return;
    }
    setIsLoading(true);
    try {
      await membersApi.create({
        member_name: name,
        phone_number: phone,
        daily_capacity: parseInt(capacity) || 10,
        skills: [{ skill: skill as any, proficiency: 4 }],
      });
      toast({ title: 'Member added successfully', status: 'success' });
      onSuccess();
      onClose();
      setName('');
      setPhone('');
      setCapacity('10');
      setSkill('STITCHING');
    } catch {
      toast({ title: 'Failed to add member', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex w-full items-center justify-between">
          Add SHG Member
          <ModalClose onClose={onClose} />
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <FormControl isRequired>
            <FormLabel isRequired>Full Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meenakshi Bai" />
          </FormControl>
          <FormControl>
            <FormLabel>Phone Number</FormLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </FormControl>
          <FormControl isRequired>
            <FormLabel isRequired>Daily Capacity (units/day)</FormLabel>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel isRequired>Primary Skill</FormLabel>
            <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option value="CUTTING">Cutting</option>
              <option value="STITCHING">Stitching</option>
              <option value="TAILORING">Tailoring</option>
              <option value="EMBROIDERY">Embroidery</option>
              <option value="PACKING">Packing</option>
              <option value="QUALITY_CHECK">Quality Check</option>
            </Select>
          </FormControl>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button tone="ink" onClick={handleSave} isLoading={isLoading}>
          Add Member
        </Button>
      </ModalFooter>
    </Modal>
  );
};
