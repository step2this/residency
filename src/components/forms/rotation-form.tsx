'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRotationPatternSchema, type CreateRotationPatternInput } from '@/schemas/rotation';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { PATTERN_CONFIGS } from '@/lib/utils/rotation-utils';
import { cn } from '@/lib/utils';

interface RotationFormProps {
  familyId: string;
  parents: Array<{ id: string; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RotationForm({ familyId, parents, onSuccess, onCancel }: RotationFormProps) {
  const form = useForm<CreateRotationPatternInput>({
    resolver: zodResolver(createRotationPatternSchema),
    defaultValues: {
      familyId,
      name: '',
      patternType: '2-2-3',
      startDate: '',
      endDate: undefined,
      primaryParentId: '',
      secondaryParentId: '',
    },
  });

  const createMutation = trpc.rotation.create.useMutation({
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
  });

  const selectedPattern = form.watch('patternType');
  const patternConfig = selectedPattern ? PATTERN_CONFIGS[selectedPattern] : null;

  const handleSubmit = (data: CreateRotationPatternInput) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Pattern Type */}
        <FormField
          control={form.control}
          name="patternType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schedule Pattern</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pattern" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PATTERN_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {patternConfig && (
                <FormDescription>{patternConfig.description}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rotation Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rotation Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer 2024 Schedule" {...field} />
              </FormControl>
              <FormDescription>
                Give this rotation a descriptive name for easy reference
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Primary Parent */}
        <FormField
          control={form.control}
          name="primaryParentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Parent (starts cycle)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                This parent gets the first segment in the rotation pattern
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Secondary Parent */}
        <FormField
          control={form.control}
          name="secondaryParentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secondary Parent</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(new Date(field.value), 'PPP') : 'Pick a date'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>When should this rotation pattern begin?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date (Optional) */}
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>End Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(new Date(field.value), 'PPP') : 'No end date'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(date ? date.toISOString().split('T')[0] : undefined)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>Leave blank for an ongoing rotation</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pattern Preview */}
        {patternConfig && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="text-sm font-medium mb-2">Pattern Preview</h4>
            <div className="flex gap-1 flex-wrap">
              {patternConfig.pattern.map((parent, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center text-xs font-medium',
                    parent === 'A' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                  )}
                  title={`Day ${index + 1}: Parent ${parent}`}
                >
                  {parent}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {patternConfig.cycleDays}-day cycle • A = Primary Parent • B = Secondary Parent
            </p>
          </div>
        )}

        {/* Error Display */}
        {createMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive font-medium">Error creating rotation</p>
            <p className="text-sm text-destructive/80 mt-1">
              {createMutation.error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Rotation'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
