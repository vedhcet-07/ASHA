import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { membersApi } from '@/lib/api/members';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { Badge } from '@/components/ui';
import { LoadingSpinner, SkeletonGrid } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useDisclosure } from '@/components/ui/useDisclosure';
import { AddMemberModal } from './AddMemberModal';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const MembersPage: React.FC = () => {
  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const [search, setSearch] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const filtered = members.filter((m) =>
    m.member_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="SHG Members"
        subtitle="Manage member capacities, skills, and daily availability"
        action={
          <Button tone="ink" leftIcon={<Plus size={16} />} onClick={onOpen}>
            Add Member
          </Button>
        }
      />

      <Card className="mb-6" tone="default">
        <div className="p-4 sm:p-5">
          <div className="relative max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <Input
              placeholder="Search member by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <SkeletonGrid cols="sm:grid-cols-2 lg:grid-cols-3" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title="No members found"
          description={search ? 'Try a different name, or clear the search.' : 'Add your first SHG member to start allocating work.'}
          action={!search ? (
            <Button tone="ink" leftIcon={<Plus size={16} />} onClick={onOpen}>
              Add Member
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setSearch('')}>
              Clear search
            </Button>
          )}
        />
      ) : (
        <Card tone="default" className="overflow-hidden">
          <Table>
            <Thead>
              <Tr>
                <Th>Member Name</Th>
                <Th>Skills</Th>
                <Th isNumeric>Daily Cap</Th>
                <Th isNumeric>Quality Rate</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((m) => (
                <Tr key={m.id}>
                  <Td className="font-medium">{m.member_name}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {m.skills?.map((s) => (
                        <Badge key={s.skill} tone="accent" variant="soft">
                          {s.skill} ({s.proficiency}★)
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td isNumeric>{m.daily_capacity} pcs</Td>
                  <Td isNumeric>{m.past_acceptance_rate}%</Td>
                  <Td>
                    <StatusBadge status={m.availability_status} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      <AddMemberModal isOpen={isOpen} onClose={onClose} onSuccess={refetch} />
    </div>
  );
};
