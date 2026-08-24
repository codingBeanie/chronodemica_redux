import { Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/I18nProvider";

interface FormValues {
  username: string;
  password: string;
  confirmPassword: string;
}

export function AuthGate({ mode }: { mode: "needs-setup" | "needs-login" }) {
  const t = useTranslation();
  const { setup, login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    initialValues: { username: "", password: "", confirmPassword: "" },
  });

  const handleSubmit = async (values: FormValues) => {
    if (mode === "needs-setup" && values.password !== values.confirmPassword) {
      form.setFieldError("confirmPassword", t.auth.passwordMismatch);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "needs-setup") {
        await setup(values.username.trim(), values.password);
      } else {
        await login(values.username.trim(), values.password);
      }
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Center mih="100vh">
      <Paper withBorder shadow="sm" p="xl" radius="md" w={360}>
        <Title order={3} mb={4}>
          {mode === "needs-setup" ? t.auth.setupTitle : t.auth.loginTitle}
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          {mode === "needs-setup" ? t.auth.setupSubtitle : t.auth.loginSubtitle}
        </Text>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="sm">
            <TextInput
              label={t.auth.fieldUsername}
              required
              autoFocus
              {...form.getInputProps("username")}
            />
            <PasswordInput label={t.auth.fieldPassword} required {...form.getInputProps("password")} />
            {mode === "needs-setup" && (
              <PasswordInput
                label={t.auth.fieldConfirmPassword}
                required
                {...form.getInputProps("confirmPassword")}
              />
            )}
            <Button type="submit" loading={submitting} fullWidth mt="sm">
              {mode === "needs-setup" ? t.auth.setupButton : t.auth.loginButton}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
