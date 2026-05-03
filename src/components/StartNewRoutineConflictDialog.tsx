'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onStartNew: () => void;
};

export function StartNewRoutineConflictDialog({ open, onOpenChange, onResume, onStartNew }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Routine in progress</AlertDialogTitle>
          <AlertDialogDescription>
            Starting a new routine will permanently delete your routine in progress. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onResume}>Resume routine in progress</Button>
          <Button variant="destructive" onClick={onStartNew}>Start new routine</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
