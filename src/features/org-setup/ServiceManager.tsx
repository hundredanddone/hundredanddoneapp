import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';

import { Button, Card, EmptyState, Text, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import {
  addService,
  deleteService,
  onboardingKeys,
  useOrgServices,
  type ServiceOfferingInput,
} from '@/features/onboarding';
import { useTheme } from '@/hooks/useTheme';
import type { VisitType } from '@/types';

interface OfferingDraft {
  enabled: boolean;
  price: string;
  duration: string;
}

const EMPTY_DRAFT: Record<VisitType, OfferingDraft> = {
  clinic: { enabled: true, price: '', duration: '15' },
  home: { enabled: false, price: '', duration: '30' },
};

export const VISIT_LABELS: Record<VisitType, string> = {
  clinic: 'Clinic visit',
  home: 'Home visit',
};

export interface ServiceManagerProps {
  organizationId: string | null;
  onError?: (message: string | null) => void;
}

/**
 * List + add form for an org's services and their per-visit-type pricing.
 * Shared by the onboarding wizard step and the dashboard's Services screen so the
 * two can never drift apart.
 */
export function ServiceManager({ organizationId, onError }: ServiceManagerProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data: services = [] } = useOrgServices(organizationId ?? undefined);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [offerings, setOfferings] = useState<Record<VisitType, OfferingDraft>>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);

  const patchOffering = (visitType: VisitType, patch: Partial<OfferingDraft>) =>
    setOfferings((prev) => ({ ...prev, [visitType]: { ...prev[visitType], ...patch } }));

  const draftOfferings = (): ServiceOfferingInput[] =>
    (Object.keys(offerings) as VisitType[])
      .filter((visitType) => offerings[visitType].enabled)
      .map((visitType) => ({
        visit_type: visitType,
        price: Number(offerings[visitType].price || 0),
        duration_minutes: Number(offerings[visitType].duration || 0),
      }));

  const canAdd =
    name.trim().length > 1 &&
    draftOfferings().length > 0 &&
    draftOfferings().every((o) => o.price >= 0 && o.duration_minutes > 0);

  const refresh = async () => {
    if (organizationId) {
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.services(organizationId) });
    }
  };

  const handleAdd = async () => {
    if (!organizationId || !canAdd) return;
    setAdding(true);
    onError?.(null);
    try {
      await addService(organizationId, {
        name: name.trim(),
        description: description.trim() || null,
        offerings: draftOfferings(),
      });
      await refresh();
      setName('');
      setDescription('');
      setOfferings(EMPTY_DRAFT);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not add that service.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    onError?.(null);
    try {
      await deleteService(serviceId);
      await refresh();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not remove that service.');
    }
  };

  return (
    <>
      <View style={styles.section}>
        {services.length === 0 ? (
          <EmptyState
            icon="pricetags-outline"
            title="No services yet"
            message="Add at least one so patients know what they can book."
          />
        ) : (
          services.map((service) => (
            <Card key={service.id}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceBody}>
                  <Text variant="bodyStrong">{service.name}</Text>
                  {service.description ? (
                    <Text variant="caption" color="textMuted">
                      {service.description}
                    </Text>
                  ) : null}
                  {service.service_offerings.map((offering) => (
                    <Text key={offering.id} variant="caption" color="textMuted">
                      {VISIT_LABELS[offering.visit_type]} · {offering.price} ·{' '}
                      {offering.duration_minutes} min
                    </Text>
                  ))}
                </View>
                <Pressable
                  onPress={() => void handleDelete(service.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${service.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </View>

      <Card>
        <View style={styles.section}>
          <Text variant="heading">Add a service</Text>
          <TextField
            label="Service name"
            required
            value={name}
            onChangeText={setName}
            placeholder="General consultation"
          />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What this appointment covers"
            multiline
          />

          {(Object.keys(offerings) as VisitType[]).map((visitType) => (
            <View key={visitType} style={styles.offeringBlock}>
              <View style={styles.toggleRow}>
                <Text variant="bodyStrong">{VISIT_LABELS[visitType]}</Text>
                <Switch
                  value={offerings[visitType].enabled}
                  onValueChange={(enabled) => patchOffering(visitType, { enabled })}
                  trackColor={{ true: colors.primary, false: colors.borderStrong }}
                />
              </View>
              {offerings[visitType].enabled ? (
                <View style={styles.inlineFields}>
                  <TextField
                    label="Price"
                    value={offerings[visitType].price}
                    onChangeText={(price) => patchOffering(visitType, { price })}
                    keyboardType="numeric"
                    placeholder="500"
                    containerStyle={styles.flex}
                  />
                  <TextField
                    label="Duration (min)"
                    value={offerings[visitType].duration}
                    onChangeText={(duration) => patchOffering(visitType, { duration })}
                    keyboardType="numeric"
                    placeholder="15"
                    containerStyle={styles.flex}
                  />
                </View>
              ) : null}
            </View>
          ))}

          <Button
            label="Add service"
            variant="secondary"
            size="md"
            icon="add"
            disabled={!canAdd}
            loading={adding}
            onPress={() => void handleAdd()}
          />
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  serviceRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  serviceBody: { flex: 1, gap: spacing.xs },
  offeringBlock: { gap: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineFields: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
