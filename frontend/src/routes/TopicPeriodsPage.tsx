import {
  Button,
  Divider,
  Modal,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  partiesApi,
  partyPeriodsApi,
  partyStatementsApi,
  popPeriodsApi,
  popsApi,
  popStatementsApi,
  statementsApi,
  topicPeriodsApi,
  topicsApi,
} from "../api/resources";
import type {
  Party,
  PartyPeriod,
  PartyStatement,
  Pop,
  PopPeriod,
  Statement,
  Topic,
  TopicPeriod,
  TopicPeriodInput,
} from "../api/types";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: TopicPeriodInput = { topic_id: 0, period_id: 0, importance: 10 };
const NONE_VALUE = "__none__";

type SortKey = "topic" | "importance";

function approvalKey(popId: number, statementId: number): string {
  return `${popId}-${statementId}`;
}

export function TopicPeriodsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const { items, loading, create, update, remove } = useCrud(topicPeriodsApi, {
    period_id: selectedPeriodId ?? 0,
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<TopicPeriod | null>(null);
  const form = useForm<TopicPeriodInput>({ initialValues: emptyValues });

  const [statements, setStatements] = useState<Statement[]>([]);
  const [partyStatements, setPartyStatements] = useState<PartyStatement[]>([]);
  const [popApprovalDrafts, setPopApprovalDrafts] = useState<Record<string, number>>({});
  const [popStatementIds, setPopStatementIds] = useState<Record<string, number>>({});
  const [partyPeriods, setPartyPeriods] = useState<PartyPeriod[]>([]);
  const [popPeriods, setPopPeriods] = useState<PopPeriod[]>([]);

  useEffect(() => {
    partiesApi.list().then(setParties);
    popsApi.list().then(setPops);
    topicsApi.list().then(setTopics);
  }, []);

  // Only parties/pops already assigned to this period (via Party Period / Pop Period)
  // can meaningfully approve statements here.
  useEffect(() => {
    if (!selectedPeriodId) {
      setPartyPeriods([]);
      setPopPeriods([]);
      return;
    }
    partyPeriodsApi.list({ period_id: selectedPeriodId }).then(setPartyPeriods);
    popPeriodsApi.list({ period_id: selectedPeriodId }).then(setPopPeriods);
  }, [selectedPeriodId]);

  const partiesInPeriod = parties.filter((party) => partyPeriods.some((pp) => pp.party_id === party.id));
  const popsInPeriod = pops.filter((pop) => popPeriods.some((pp) => pp.pop_id === pop.id));

  const topicName = (id: number) => topics.find((topic) => topic.id === id)?.name ?? "-";

  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("topic");
  const getSortValue = (entry: TopicPeriod, key: SortKey): string | number =>
    key === "topic" ? topicName(entry.topic_id) : entry.importance;
  const sortedItems = [...items].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
  );

  // --- Available topics (not yet added to this period) ---
  const [availableFilter, setAvailableFilter] = useState("");
  const {
    sortKey: availableSortKey,
    sortDir: availableSortDir,
    toggleSort: toggleAvailableSort,
  } = useSort<"name" | "description">("name");

  const availableTopics = topics.filter((topic) => !items.some((item) => item.topic_id === topic.id));
  const filteredAvailableTopics = availableTopics.filter((topic) => {
    const needle = availableFilter.trim().toLowerCase();
    if (!needle) return true;
    return topic.name.toLowerCase().includes(needle) || topic.description.toLowerCase().includes(needle);
  });
  const sortedAvailableTopics = [...filteredAvailableTopics].sort((a, b) =>
    compareSortValues(a[availableSortKey], b[availableSortKey], availableSortDir),
  );

  const loadStatements = async (topicId: number) => {
    const stmts = await statementsApi.list({ topic_id: topicId });
    setStatements(stmts);
    return stmts;
  };

  const loadPartyStatements = async (periodId: number, stmtIds: Set<number>) => {
    const allPartyStatements = await partyStatementsApi.list({ period_id: periodId });
    setPartyStatements(allPartyStatements.filter((ps) => stmtIds.has(ps.statement_id)));
  };

  const loadPopStatements = async (periodId: number, stmtIds: Set<number>) => {
    const allPopStatements = await popStatementsApi.list({ period_id: periodId });
    const drafts: Record<string, number> = {};
    const ids: Record<string, number> = {};
    allPopStatements
      .filter((ps) => stmtIds.has(ps.statement_id))
      .forEach((ps) => {
        const key = approvalKey(ps.pop_id, ps.statement_id);
        drafts[key] = ps.approval;
        ids[key] = ps.id;
      });
    setPopApprovalDrafts(drafts);
    setPopStatementIds(ids);
  };

  const loadApprovals = async (topicId: number, periodId: number) => {
    const stmts = await loadStatements(topicId);
    const stmtIds = new Set(stmts.map((s) => s.id));
    await Promise.all([loadPartyStatements(periodId, stmtIds), loadPopStatements(periodId, stmtIds)]);
  };

  const startAdd = async (topic: Topic) => {
    if (!selectedPeriodId) return;
    setEditing(null);
    form.setValues({ topic_id: topic.id, period_id: selectedPeriodId, importance: 10 });
    open();
    await loadApprovals(topic.id, selectedPeriodId);
  };

  const openEdit = async (entry: TopicPeriod) => {
    setEditing(entry);
    form.setValues({ topic_id: entry.topic_id, period_id: entry.period_id, importance: entry.importance });
    open();
    await loadApprovals(entry.topic_id, entry.period_id);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await update(editing.id, { importance: form.values.importance });
      } else {
        await create(form.values);
      }
      close();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleDelete = async (entry: TopicPeriod) => {
    if (!window.confirm(t.topicPeriods.confirmDelete)) return;
    await remove(entry.id);
  };

  // --- Party approvals ---
  const partyApproval = (partyId: number): number | null =>
    partyStatements.find((ps) => ps.party_id === partyId)?.statement_id ?? null;

  // Party/pop approvals only need a period + statement, not the TopicPeriod row itself,
  // so they save immediately — even before the topic has been added via the bottom
  // Save button — same as they already do while editing an existing entry.
  const setPartyApproval = async (partyId: number, statementId: number | null) => {
    const periodId = form.values.period_id;
    if (!periodId) return;
    const existing = partyStatements.find((ps) => ps.party_id === partyId);
    if (existing && existing.statement_id === statementId) return;

    if (existing) {
      await partyStatementsApi.remove(existing.id);
    }
    if (statementId !== null) {
      await partyStatementsApi.create({
        party_id: partyId,
        statement_id: statementId,
        period_id: periodId,
        approved: true,
      });
    }
    await loadPartyStatements(periodId, new Set(statements.map((s) => s.id)));
  };

  // --- Pop approvals ---
  const persistPopApproval = async (popId: number, statementId: number) => {
    const periodId = form.values.period_id;
    if (!periodId) return;
    const key = approvalKey(popId, statementId);
    const value = popApprovalDrafts[key] ?? 0;
    const existingId = popStatementIds[key];
    if (existingId) {
      await popStatementsApi.update(existingId, { approval: value });
    } else if (value > 0) {
      await popStatementsApi.create({
        pop_id: popId,
        statement_id: statementId,
        period_id: periodId,
        approval: value,
      });
    }
    await loadPopStatements(periodId, new Set(statements.map((s) => s.id)));
  };

  const popApprovalSum = (popId: number): number =>
    statements.reduce((sum, statement) => sum + (popApprovalDrafts[approvalKey(popId, statement.id)] ?? 0), 0);

  return (
    <>
      <Text size="xl" fw={700} mb="xs">
        {t.topicPeriods.pageTitle}
      </Text>

      <PeriodSelector />

      {selectedPeriodId && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <SortableTh
                label={t.topicPeriods.columnTopic}
                sortKey="topic"
                activeKey={sortKey}
                direction={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label={t.topicPeriods.columnImportance}
                sortKey="importance"
                activeKey={sortKey}
                direction={sortDir}
                onSort={toggleSort}
              />
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedItems.map((entry) => (
              <Table.Tr key={entry.id} onClick={() => openEdit(entry)} style={{ cursor: "pointer" }}>
                <Table.Td>{topicName(entry.topic_id)}</Table.Td>
                <Table.Td>{entry.importance}</Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(entry);
                    }}
                  >
                    {t.common.delete}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {selectedPeriodId && !loading && items.length === 0 && (
        <Text c="dimmed" mt="md">
          {t.topicPeriods.empty}
        </Text>
      )}

      {selectedPeriodId && (
        <>
          <Divider my="lg" label={t.topicPeriods.availableTopicsTitle} labelPosition="left" />

          <TextInput
            placeholder={t.topicPeriods.filterPlaceholder}
            value={availableFilter}
            onChange={(event) => setAvailableFilter(event.currentTarget.value)}
            maw={360}
            mb="sm"
          />

          {sortedAvailableTopics.length === 0 ? (
            <Text c="dimmed">{t.topicPeriods.noAvailableTopics}</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh
                    label={t.topicPeriods.columnTopic}
                    sortKey="name"
                    activeKey={availableSortKey}
                    direction={availableSortDir}
                    onSort={toggleAvailableSort}
                  />
                  <SortableTh
                    label={t.topicPeriods.columnDescription}
                    sortKey="description"
                    activeKey={availableSortKey}
                    direction={availableSortDir}
                    onSort={toggleAvailableSort}
                  />
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedAvailableTopics.map((topic) => (
                  <Table.Tr key={topic.id} onClick={() => startAdd(topic)} style={{ cursor: "pointer" }}>
                    <Table.Td>{topic.name}</Table.Td>
                    <Table.Td>{topic.description}</Table.Td>
                    <Table.Td>
                      <IconPlus size={16} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t.topicPeriods.modalEdit : t.topicPeriods.modalNew}
        size="95%"
      >
        <Text size="sm" c="dimmed">
          {t.topicPeriods.fieldTopic}
        </Text>
        <Text fw={600} mb="sm">
          {topicName(form.values.topic_id)}
        </Text>

        <NumberInput
          label={t.topicPeriods.fieldImportance}
          required
          min={1}
          max={20}
          mt="sm"
          value={form.values.importance}
          onChange={(value) => form.setFieldValue("importance", typeof value === "number" ? value : 0)}
        />

        {statements.length === 0 && (
          <Text c="dimmed" size="sm" mt="md">
            {t.topicPeriods.noStatementsYet}
          </Text>
        )}

        {statements.length > 0 && (
          <>
            <Divider my="md" />
            <Text fw={600}>{t.topicPeriods.partyApprovalsTitle}</Text>
            <Text c="dimmed" size="sm" mb="sm">
              {t.topicPeriods.partyApprovalsHint}
            </Text>
            {partiesInPeriod.length === 0 && (
              <Text c="dimmed" size="sm" mb="sm">
                {t.topicPeriods.noPartiesInPeriod}
              </Text>
            )}
            {partiesInPeriod.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.topicPeriods.columnParty}</Table.Th>
                    <Table.Th>{t.topicPeriods.columnStatement}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {partiesInPeriod.map((party) => (
                    <Table.Tr key={party.id}>
                      <Table.Td>{party.name}</Table.Td>
                      <Table.Td>
                        <Select
                          data={[
                            { value: NONE_VALUE, label: t.common.none },
                            ...statements.map((statement) => ({
                              value: String(statement.id),
                              label: statement.text,
                            })),
                          ]}
                          value={
                            partyApproval(party.id) !== null ? String(partyApproval(party.id)) : NONE_VALUE
                          }
                          onChange={(value) =>
                            setPartyApproval(
                              party.id,
                              !value || value === NONE_VALUE ? null : Number(value),
                            )
                          }
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
            )}

            <Divider my="md" />
            <Text fw={600}>{t.topicPeriods.popApprovalsTitle}</Text>
            <Text c="dimmed" size="sm" mb="sm">
              {t.topicPeriods.popApprovalsHint}
            </Text>
            {popsInPeriod.length === 0 && (
              <Text c="dimmed" size="sm" mb="sm">
                {t.topicPeriods.noPopsInPeriod}
              </Text>
            )}
            {popsInPeriod.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.topicPeriods.columnPop}</Table.Th>
                    {statements.map((statement) => (
                      <Table.Th key={statement.id}>{statement.text}</Table.Th>
                    ))}
                    <Table.Th>{t.topicPeriods.sumLabel}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {popsInPeriod.map((pop) => {
                    const sum = popApprovalSum(pop.id);
                    return (
                      <Table.Tr key={pop.id}>
                        <Table.Td>{pop.name}</Table.Td>
                        {statements.map((statement) => {
                          const key = approvalKey(pop.id, statement.id);
                          return (
                            <Table.Td key={statement.id}>
                              <NumberInput
                                min={0}
                                max={100}
                                step={1}
                                w={100}
                                value={popApprovalDrafts[key] ?? 0}
                                onChange={(value) =>
                                  setPopApprovalDrafts((prev) => ({
                                    ...prev,
                                    [key]: typeof value === "number" ? value : 0,
                                  }))
                                }
                                onBlur={() => persistPopApproval(pop.id, statement.id)}
                              />
                            </Table.Td>
                          );
                        })}
                        <Table.Td c={sum === 100 ? "green.9" : "orange.9"} fw={600}>
                          {sum}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
            )}
          </>
        )}

        <Button size="md" fullWidth mt="xl" onClick={handleSave}>
          {t.common.save}
        </Button>
      </Modal>
    </>
  );
}
