import { useState } from 'react';
import { View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Banner, Button, Screen, StepProgress, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import { updateProfile } from '@/features/auth';
import { useAuthStore } from '@/stores/authStore';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name'),
  phone: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^[+0-9][0-9 ()-]{6,19}$/.test(value), {
      message: 'Enter a valid phone number, or leave this blank',
    }),
});

type FormValues = z.infer<typeof schema>;

export default function PatientProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!session) return;
    setError(null);
    try {
      const updated = await updateProfile(session.user.id, {
        full_name: values.full_name,
        phone: values.phone.length > 0 ? values.phone : null,
      });
      setProfile(updated);
      router.push('/patient/location');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details.');
    }
  };

  return (
    <Screen
      scroll
      edges={{ top: true, bottom: true }}
      footer={<Button label="Continue" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />}
    >
      <StepProgress
        current={1}
        total={2}
        title="Confirm your details"
        subtitle="We pre-filled what Google gave us. A phone number helps providers reach you about a visit."
      />

      {error ? <Banner tone="danger" title="Could not save" message={error} /> : null}

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Full name"
              required
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              textContentType="name"
              error={errors.full_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Phone number"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholder="+91 98765 43210"
              hint="Optional"
              error={errors.phone?.message}
            />
          )}
        />
      </View>
    </Screen>
  );
}
