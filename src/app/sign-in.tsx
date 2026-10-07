import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavButton } from '@/components/nav-button';
import { LabeledTextInput } from '@/components/labeled-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionCard } from '@/components/transit-loss/section-card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { signInWithEmailPassword } from '@/utils/auth';

type Status = 'idle' | 'submitting';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { session, isAdmin, isCheckingAdmin, signOut } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navigate once the admin check lands in context, not when the sign-in call
  // resolves — until then the Stack.Protected guard still blocks
  // admin-vehicles. A valid account that isn't in public.admins is signed
  // straight back out.
  useEffect(() => {
    if (!session || isCheckingAdmin) {
      return;
    }
    if (isAdmin) {
      router.replace('/admin-vehicles');
    } else {
      setErrorMessage('This account doesn’t have admin access.');
      signOut();
    }
  }, [session, isAdmin, isCheckingAdmin, router, signOut]);

  const onSubmit = async () => {
    setStatus('submitting');
    setErrorMessage(null);
    const outcome = await signInWithEmailPassword(email.trim(), password);
    setStatus('idle');
    if (outcome.status === 'not-configured') {
      setErrorMessage('Sign-in isn’t set up for this app yet.');
    } else if (outcome.status === 'error') {
      setErrorMessage(outcome.message);
    }
  };

  const canSubmit = Boolean(email.trim() && password);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedView style={styles.container}>
          <NavButton label="← Back to calculator" href="/" />

          <ThemedText type="title" style={styles.title}>
            Sign In
          </ThemedText>

          <SectionCard title="Admin sign in">
            <LabeledTextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <LabeledTextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
            />

            {errorMessage ? (
              <ThemedText type="small" style={{ color: theme.negative }}>
                {errorMessage}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={status === 'submitting' || !canSubmit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {status === 'submitting' ? 'Please wait…' : 'Sign In'}
              </ThemedText>
            </Pressable>

          </SectionCard>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  button: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
