'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PATTERN_CONFIGS } from '@/lib/utils/rotation-utils';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Rotation = {
  id: string;
  name: string;
  patternType: '2-2-3' | '2-2-5-5' | '3-4-4-3' | 'alternating-weeks' | 'every-weekend';
  startDate: string;
  endDate: string | null;
  primaryParent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  secondaryParent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type RotationListProps = {
  rotations: Rotation[];
};

export function RotationList({ rotations }: RotationListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rotationToDelete, setRotationToDelete] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.rotation.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.rotation.list.cancel();

      // Snapshot current value for rollback
      const previousRotations = utils.rotation.list.getData();

      // Optimistically update the cache
      utils.rotation.list.setData(undefined, (old) =>
        old?.filter((r) => r.id !== variables.rotationId)
      );

      return { previousRotations };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousRotations) {
        utils.rotation.list.setData(undefined, context.previousRotations);
      }
      toast({
        title: 'Error deleting rotation',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Rotation deleted',
        description: 'The rotation pattern has been successfully removed.',
      });
      setDeleteDialogOpen(false);
      setRotationToDelete(null);
    },
    onSettled: () => {
      // Refetch to ensure cache is in sync with server
      utils.rotation.list.invalidate();
    },
  });

  const handleDeleteClick = (rotationId: string) => {
    setRotationToDelete(rotationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (rotationToDelete) {
      deleteMutation.mutate({ rotationId: rotationToDelete });
    }
  };

  const formatParentName = (parent: { firstName: string | null; lastName: string | null }) => {
    const firstName = parent.firstName ?? '';
    const lastName = parent.lastName ?? '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  };

  if (rotations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            No rotation patterns yet. Create your first one to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rotations.map((rotation) => {
          const patternConfig = PATTERN_CONFIGS[rotation.patternType];

          return (
            <Card key={rotation.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{rotation.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {patternConfig.displayName}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(rotation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pattern Preview */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Pattern Preview
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {patternConfig.pattern.map((parent, index) => (
                      <div
                        key={index}
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center text-xs font-medium',
                          parent === 'A'
                            ? 'bg-blue-500 text-white'
                            : 'bg-purple-500 text-white'
                        )}
                        title={`Day ${index + 1}: ${parent === 'A' ? 'Primary' : 'Secondary'} Parent`}
                      >
                        {parent}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {patternConfig.cycleDays}-day cycle
                  </p>
                </div>

                {/* Date Range */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Date Range
                  </p>
                  <p className="text-sm">
                    {format(new Date(rotation.startDate), 'MMM d, yyyy')} -{' '}
                    {rotation.endDate
                      ? format(new Date(rotation.endDate), 'MMM d, yyyy')
                      : 'Ongoing'}
                  </p>
                </div>

                {/* Parents */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Parents
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500" />
                      <p className="text-sm">
                        Primary: {formatParentName(rotation.primaryParent)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-500" />
                      <p className="text-sm">
                        Secondary: {formatParentName(rotation.secondaryParent)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rotation Pattern</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rotation pattern? This will remove all
              future events generated from this pattern. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
