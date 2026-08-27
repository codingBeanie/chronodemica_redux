import { Button, Center, Paper, Stack, Text, Title } from "@mantine/core";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/I18nProvider";

export function AuthGate() {
  const t = useTranslation();
  const { startLogin } = useAuth();

  return (
    <Center mih="100vh">
      <Paper withBorder shadow="sm" p="xl" radius="md" w={360}>
        <Stack gap="sm" align="center">
          <Title order={3}>{t.auth.loginTitle}</Title>
          <Text size="sm" c="dimmed" ta="center">
            {t.auth.loginSubtitle}
          </Text>
          <Button onClick={startLogin} fullWidth mt="sm">
            {t.auth.loginButton}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
