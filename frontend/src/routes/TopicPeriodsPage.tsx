import {
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import {
  partiesApi,
  partyStatementsApi,
  popsApi,
  popStatementsApi,
  statementsApi,
  topicPeriodsApi,
  topicsApi,
} from "../api/resources";
import type {
  Party,
  PartyStatement,
  Pop,
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

  useEffect(() => {
    partiesApi.list().then(setParties);
    popsApi.list().then(setPops);
    topicsApi.list().then(setTopics);
  }, []);

  const topicName = (id: number) => topics.find((topic) => topic.id === id)?.name ?? "-";
  const availableTopics = topics.filter(
    (topic) => editing?.topic_id === topic.id || !items.some((item) => item.topic_id === topic.id),
  );

  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("topic");
  const getSortValue = (entry: TopicPeriod, key: SortKey): string | number =>
    key === "topic" ? topicName(entry.topic_id) : entry.importance;
  const sortedItems = [...items].sort((a, b) =>
    compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
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

  const openCreate = () => {
    setEditing(null);
    setStatements([]);
    setPartyStatements([]);
    setPopApprovalDrafts({});
    setPopStatementIds({});
    form.setValues({ ...emptyValues, period_id: selectedPeriodId ?? 0 });
    open();
  };

  const openEdit = async (entry: TopicPeriod) => {
    setEditing(entry);
    form.setValues({ topic_id: entry.topic_id, period_id: entry.period_id, importance: entry.importance });
    await loadApprovals(entry.topic_id, entry.period_id);
    open();
  };

  const handleSubmit = async (values: TopicPeriodInput) => {
    try {
      if (editing) {
        await update(editing.id, { importance: values.importance });
      } else {
        const created = await create(values);
        setEditing(created);
        await loadApprovals(created.topic_id, created.period_id);
        return;
      }
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
      return;
    }
    close();
  };

  const handleDelete = async (entry: TopicPeriod) => {
    if (!window.confirm(t.topicPeriods.confirmDelete)) return;
    await remove(entry.id);
  };

  // --- Party approvals ---
  const partyApproval = (partyId: number): number | null =>
    partyStatements.find((ps) => ps.party_id === partyId)?.statement_id ?? null;

  const setPartyApproval = async (partyId: number, statementId: number | null) => {
    if (!editing) return;
    const existing = partyStatements.find((ps) => ps.party_id === partyId);
    if (existing && existing.statement_id === statementId) return;

    if (existing) {
      await partyStatementsApi.remove(existing.id);
    }
    if (statementId !== null) {
      await partyStatementsApi.create({
        party_id: partyId,
        statement_id: statementId,
        period_id: editing.period_id,
        approved: true,
      });
    }
    await loadPartyStatements(
      editing.period_id,
      new Set(statements.map((s) => s.id)),
    );
  };

  // --- Pop approvals ---
  const persistPopApproval = async (popId: number, statementId: number) => {
    if (!editing) return;
    const key = approvalKey(popId, statementId);
    const value = popApprovalDrafts[key] ?? 0;
    const existingId = popStatementIds[key];
    if (existingId) {
      await popStatementsApi.update(existingId, { approval: value });
    } else if (value > 0) {
      await popStatementsApi.create({
        pop_id: popId,
        statement_id: statementId,
        period_id: editing.period_id,
        approval: value,
      });
    }
    await loadPopStatements(editing.period_id, new Set(statements.map((s) => s.id)));
  };

  const popApprovalSum = (popId: number): number =>
    statements.reduce((sum, statement) => sum + (popApprovalDrafts[approvalKey(popId, statement.id)] ?? 0), 0);

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {t.topicPeriods.pageTitle}
        </Text>
        <Button onClick={openCreate} disabled={!selectedPeriodId || availableTopics.length === 0}>
          {t.topicPeriods.newButton}
        </Button>
      </Group>

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

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t.topicPeriods.modalEdit : t.topicPeriods.modalNew}
        size="95%"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Select
            label={t.topicPeriods.fieldTopic}
            required
            disabled={!!editing}
            data={availableTopics.map((topic) => ({ value: String(topic.id), label: topic.name }))}
            value={form.values.topic_id ? String(form.values.topic_id) : null}
            onChange={(value) => form.setFieldValue("topic_id", value ? Number(value) : 0)}
          />
          <NumberInput
            label={t.topicPeriods.fieldImportance}
            required
            min={1}
            max={20}
            mt="sm"
            {...form.getInputProps("importance")}
          />
          <Button type="submit" mt="md">
            {t.common.save}
          </Button>
        </form>

        {editing && statements.length === 0 && (
          <Text c="dimmed" size="sm" mt="md">
            {t.topicPeriods.noStatementsYet}
          </Text>
        )}

        {editing && statements.length > 0 && (
          <>
            <Divider my="md" />
            <Text fw={600}>{t.topicPeriods.partyApprovalsTitle}</Text>
            <Text c="dimmed" size="sm" mb="sm">
              {t.topicPeriods.partyApprovalsHint}
            </Text>
            <div style={{ overflowX: "auto" }}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.topicPeriods.columnParty}</Table.Th>
                    <Table.Th>{t.topicPeriods.columnStatement}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parties.map((party) => (
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

            <Divider my="md" />
            <Text fw={600}>{t.topicPeriods.popApprovalsTitle}</Text>
            <Text c="dimmed" size="sm" mb="sm">
              {t.topicPeriods.popApprovalsHint}
            </Text>
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
                  {pops.map((pop) => {
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
                        <Table.Td c={sum === 100 ? "green" : "orange"}>{sum}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
