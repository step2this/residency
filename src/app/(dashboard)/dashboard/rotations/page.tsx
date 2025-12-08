'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import { RotationList } from '@/components/rotation/rotation-list';
import { RotationDialog } from '@/components/rotation/rotation-dialog';
import { Plus } from 'lucide-react';

export default function RotationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all rotations for the user's families
  const { data: rotations = [], isLoading } = trpc.rotation.list.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rotations</h1>
          <p className="text-muted-foreground">
            Manage custody schedule patterns
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rotation
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Rotation List */}
      {!isLoading && <RotationList rotations={rotations} />}

      {/* Create Rotation Dialog */}
      <RotationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
