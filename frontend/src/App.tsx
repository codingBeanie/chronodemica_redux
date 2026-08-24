import {
  ActionIcon,
  AppShell,
  Burger,
  Center,
  Group,
  Loader,
  NavLink,
  Select,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLogout, IconMoon, IconSun } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import logoUrl from "./assets/chronodemica_logo.svg";
import { AuthGate } from "./routes/AuthGate";
import { useAuth } from "./context/AuthContext";
import { PeriodProvider } from "./context/PeriodContext";
import { useWorldContext, WorldProvider } from "./context/WorldContext";
import { useTranslation } from "./i18n/I18nProvider";
import { CoalitionsPage } from "./routes/CoalitionsPage";
import { ParliamentPeriodsPage } from "./routes/ParliamentPeriodsPage";
import { PartiesPage } from "./routes/PartiesPage";
import { PartyPeriodsPage } from "./routes/PartyPeriodsPage";
import { PeriodsPage } from "./routes/PeriodsPage";
import { PopPeriodsPage } from "./routes/PopPeriodsPage";
import { PopsPage } from "./routes/PopsPage";
import { SimulationPage } from "./routes/SimulationPage";
import { TopicPeriodsPage } from "./routes/TopicPeriodsPage";
import { TopicsPage } from "./routes/TopicsPage";
import { VotingBehaviourPage } from "./routes/VotingBehaviourPage";
import { WorldsPage } from "./routes/WorldsPage";

interface NavLeaf {
  label: string;
  path: string;
  element: ReactNode;
}

interface NavCategory {
  label: string;
  children: NavLeaf[];
}

function FullScreenLoader() {
  return (
    <Center mih="100vh">
      <Loader />
    </Center>
  );
}

export default function App() {
  const auth = useAuth();

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "needs-setup") return <AuthGate mode="needs-setup" />;
  if (auth.status === "needs-login") return <AuthGate mode="needs-login" />;

  return (
    <WorldProvider>
      <AuthenticatedApp />
    </WorldProvider>
  );
}

function AuthenticatedApp() {
  const worldCtx = useWorldContext();

  if (worldCtx.loading) return <FullScreenLoader />;
  if (worldCtx.selectedWorldId === null) {
    return <NoWorldsShell />;
  }

  return (
    <PeriodProvider key={worldCtx.selectedWorldId}>
      <MainShell />
    </PeriodProvider>
  );
}

function NoWorldsShell() {
  const t = useTranslation();
  return (
    <Center mih="100vh">
      <div style={{ width: 600 }}>
        <Text size="xl" fw={700} mb="md">
          {t.worlds.pageTitle}
        </Text>
        <WorldsPage />
      </div>
    </Center>
  );
}

function MainShell() {
  const t = useTranslation();
  const { logout } = useAuth();
  const { worlds, selectedWorldId, setSelectedWorldId } = useWorldContext();
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const toggleColorScheme = () => setColorScheme(computedColorScheme === "dark" ? "light" : "dark");

  const navTree: NavCategory[] = [
    {
      label: t.nav.masterData,
      children: [
        { label: t.nav.periods, path: "/master-data/periods", element: <PeriodsPage /> },
        { label: t.nav.parties, path: "/master-data/parties", element: <PartiesPage /> },
        {
          label: t.nav.populationGroups,
          path: "/master-data/pops",
          element: <PopsPage />,
        },
        { label: t.nav.topics, path: "/master-data/topics", element: <TopicsPage /> },
      ],
    },
    {
      label: t.nav.periodData,
      children: [
        { label: t.nav.partyPeriod, path: "/period-data/party-periods", element: <PartyPeriodsPage /> },
        { label: t.nav.popPeriod, path: "/period-data/pop-periods", element: <PopPeriodsPage /> },
        { label: t.nav.topicPeriod, path: "/period-data/topic-periods", element: <TopicPeriodsPage /> },
      ],
    },
    {
      label: t.nav.electionData,
      children: [
        { label: t.nav.simulation, path: "/election-data/simulation", element: <SimulationPage /> },
        {
          label: t.nav.coalitions,
          path: "/election-data/coalitions",
          element: <CoalitionsPage />,
        },
        {
          label: t.nav.parliament,
          path: "/election-data/parliament",
          element: <ParliamentPeriodsPage />,
        },
        {
          label: t.nav.votingBehaviour,
          path: "/election-data/voting-behaviour",
          element: <VotingBehaviourPage />,
        },
      ],
    },
  ];

  const worldsRoute: NavLeaf = { label: t.nav.worlds, path: "/worlds", element: <WorldsPage /> };
  const flatRoutes: NavLeaf[] = [worldsRoute, ...navTree.flatMap((category) => category.children)];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <img src={logoUrl} alt="" height={32} width={32} />
            <Title order={3}>{t.app.title}</Title>
          </Group>
          <Group>
            <Select
              aria-label={t.worldSelector.label}
              placeholder={t.worldSelector.placeholder}
              data={worlds.map((world) => ({ value: String(world.id), label: world.name }))}
              value={selectedWorldId ? String(selectedWorldId) : null}
              onChange={(value) => value && setSelectedWorldId(Number(value))}
              w={220}
            />
            <ActionIcon
              variant="default"
              size="lg"
              onClick={toggleColorScheme}
              aria-label={t.app.toggleColorScheme}
            >
              {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <ActionIcon variant="default" size="lg" onClick={logout} aria-label={t.auth.logoutButton}>
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label={t.nav.worlds}
          active={location.pathname === worldsRoute.path}
          onClick={() => navigate(worldsRoute.path)}
        />
        {navTree.map((category) => (
          <NavLink key={category.label} label={category.label} defaultOpened>
            {category.children.map((child) => (
              <NavLink
                key={child.path}
                label={child.label}
                active={location.pathname === child.path}
                onClick={() => navigate(child.path)}
              />
            ))}
          </NavLink>
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to={worldsRoute.path} replace />} />
          {flatRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
