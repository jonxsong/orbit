import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '../theme/theme';

export function CheckControl({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.target, { opacity: pressed ? 0.55 : 1 }]}
    >
      <View
        style={[
          styles.circle,
          {
            backgroundColor: checked ? colors.sage : 'transparent',
            borderColor: checked ? colors.sage : colors.border,
          },
        ]}
      >
        {checked ? <SymbolView name="checkmark" size={15} tintColor={colors.background} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

