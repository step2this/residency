'use client';

import { trpc } from '@/lib/trpc/provider';
import { RotationForm } from '@/components/forms/rotation-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

type RotationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RotationDialog({ open, onOpenChange }: RotationDialogProps) {
  const utils = trpc.useUtils();

  // Fetch current user's family data
  const { data: family, isLoading } = trpc.family.get.useQuery(undefined, {
    enabled: open, // Only fetch when dialog is open
  });

  const handleSuccess = () => {
    toast({
      title: 'Rotation created',
      description: 'Your rotation pattern has been successfully created.',
    });
    utils.rotation.list.invalidate();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Show loading state while fetching family data
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Rotation Pattern</DialogTitle>
            <DialogDescription>
              Loading family information...
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state if no family found
  if (!family) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Family Found</DialogTitle>
            <DialogDescription>
              You need to create or join a family before creating rotation patterns.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Get parents from family members (filter for parent roles)
  const parents = family.members
    .filter((member) => member.role === 'parent_1' || member.role === 'parent_2')
    .map((member) => ({
      id: member.userId,
      name: `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim() || 'Unknown',
    }));

  // Check if there are at least 2 parents
  if (parents.length < 2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insufficient Parents</DialogTitle>
            <DialogDescription>
              You need at least 2 parents in your family to create a rotation pattern.
              Please add another parent to your family first.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Rotation Pattern</DialogTitle>
          <DialogDescription>
            Set up a recurring visitation schedule using preset patterns.
          </DialogDescription>
        </DialogHeader>
        <RotationForm
          familyId={family.id}
          parents={parents}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
