import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

interface DeleteWithPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pin: string) => Promise<void>;
  title: string;
  description: string;
  deviceName?: string;
}

export function DeleteWithPinModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  deviceName,
}: DeleteWithPinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      await onConfirm(pin);
      setPin('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete. Check your PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {deviceName && (
              <span className="block mt-2 font-medium text-foreground">
                Device: {deviceName}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="security-pin">Security PIN</Label>
          <Input
            id="security-pin"
            type="password"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Enter your 4-digit home security PIN to confirm deletion
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || pin.length !== 4}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deleting...' : 'Delete Device'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
