import { Button, Divider, Modal, NumberInput, Select, Table, Text, TextInput } from "@mantine/core";
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
import { confirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodContext } from "../context/PeriodContext";
import { useCrud } from "../hooks/useCrud";
import { useTranslation } from "../i18n/I18nProvider";

const emptyValues: TopicPeriodInput = { topic_id: 0, period_id: 0, importance: 10 };
const NONE_VALUE = "__none__";

type AddedSortKey = "topic" | "importance" | "actions";
type AvailableSortKey = "name" | "description";

function approvalKey(popId: number, statementId: number): string {
  return `${popId}-${statementId}`;
}

export function TopicPeriodsPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const { items, loading, error, create, update, remove } = useCrud(topicPeriodsApi, {
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
  const [partyApprovalDrafts, setPartyApprovalDrafts] = useState<Record<number, number | null>>({});
  const [popApprovalDrafts, setPopApprovalDrafts] = useState<Record<string, number>>({});
  const [popApprovalOriginal, setPopApprovalOriginal] = useState<Record<string, number>>({});
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

  // --- Available topics (not yet added to this period) ---
  const [availableFilter, setAvailableFilter] = useState("");

  const availableTopics = topics.filter((topic) => !items.some((item) => item.topic_id === topic.id));
  const filteredAvailableTopics = availableTopics.filter((topic) => {
    const needle = availableFilter.trim().toLowerCase();
    if (!needle) return true;
    return topic.name.toLowerCase().includes(needle) || topic.description.toLowerCase().includes(needle);
  });

  const loadStatements = async (topicId: number) => {
    const stmts = await statementsApi.list({ topic_id: topicId });
    setStatements(stmts);
    return stmts;
  };

  const loadApprovals = async (topicId: number, periodId: number) => {
    const stmts = await loadStatements(topicId);
    const stmtIds = new Set(stmts.map((s) => s.id));

    const allPartyStatements = await partyStatementsApi.list({ period_id: periodId });
    const relevantPartyStatements = allPartyStatements.filter((ps) => stmtIds.has(ps.statement_id));
    setPartyStatements(relevantPartyStatements);
    const partyDrafts: Record<number, number | null> = {};
    relevantPartyStatements.forEach((ps) => {
      partyDrafts[ps.party_id] = ps.statement_id;
    });
    setPartyApprovalDrafts(partyDrafts);

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
    setPopApprovalOriginal(drafts);
    setPopStatementIds(ids);
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

  // Party/pop approvals are edited as local drafts while the modal is open and are
  // only written to the API together with the topic/importance, when the bottom
  // Save button is clicked — one consistent submit-on-save model for the whole
  // mask, matching every other modal in the app, instead of saving each approval
  // edit immediately.
  const persistApprovals = async (periodId: number) => {
    await Promise.all(
      partiesInPeriod.map(async (party) => {
        const draftValue = partyApprovalDrafts[party.id] ?? null;
        const existing = partyStatements.find((ps) => ps.party_id === party.id);
        const existingValue = existing?.statement_id ?? null;
        if (draftValue === existingValue) return;
        if (existing) await partyStatementsApi.remove(existing.id);
        if (draftValue !== null) {
          await partyStatementsApi.create({
            party_id: party.id,
            statement_id: draftValue,
            period_id: periodId,
            approved: true,
          });
        }
      }),
    );

    await Promise.all(
      popsInPeriod.flatMap((pop) =>
        statements.map(async (statement) => {
          const key = approvalKey(pop.id, statement.id);
          const draftValue = popApprovalDrafts[key] ?? 0;
          const originalValue = popApprovalOriginal[key] ?? 0;
          if (draftValue === originalValue) return;
          const existingId = popStatementIds[key];
          if (existingId) {
            await popStatementsApi.update(existingId, { approval: draftValue });
          } else if (draftValue > 0) {
            await popStatementsApi.create({
              pop_id: pop.id,
              statement_id: statement.id,
              period_id: periodId,
              approval: draftValue,
            });
          }
        }),
      ),
    );
  };

  const handleSave = async () => {
    try {
      const periodId = form.values.period_id;
      if (editing) {
        await update(editing.id, { importance: form.values.importance });
      } else {
        await create(form.values);
      }
      await persistApprovals(periodId);
      close();
    } catch (error) {
      notifications.show({ color: "red", message: String(error) });
    }
  };

  const handleDelete = (entry: TopicPeriod) => {
    confirmDialog({
      tier: "routine",
      title: t.common.delete,
      message: t.topicPeriods.confirmDelete,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: () => remove(entry.id),
    });
  };

  const popApprovalSum = (popId: number): number =>
    statements.reduce((sum, statement) => sum + (popApprovalDrafts[approvalKey(popId, statement.id)] ?? 0), 0);

  const addedColumns: DataTableColumn<TopicPeriod, AddedSortKey>[] = [
    { key: "topic", label: t.topicPeriods.columnTopic, render: (entry) => topicName(entry.topic_id) },
    { key: "importance", label: t.topicPeriods.columnImportance, render: (entry) => entry.importance },
    {
      key: "actions",
      label: null,
      sortable: false,
      render: (entry) => (
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
      ),
    },
  ];

  const availableColumns: DataTableColumn<Topic, AvailableSortKey>[] = [
    { key: "name", label: t.topicPeriods.columnTopic, render: (topic) => topic.name },
    { key: "description", label: t.topicPeriods.columnDescription, render: (topic) => topic.description },
  ];

  return (
    <>
      <PageHeader title={t.topicPeriods.pageTitle} />

      <PeriodSelector />

      {selectedPeriodId && (
        <DataTable
          columns={addedColumns}
          items={items}
          getRowKey={(entry) => entry.id}
          getSortValue={(entry, key) =>
            key === "topic" ? topicName(entry.topic_id) : key === "importance" ? entry.importance : ""
          }
          initialSortKey="topic"
          loading={loading}
          error={error}
          errorText={t.common.loadError}
          emptyText={t.topicPeriods.empty}
          onRowClick={openEdit}
        />
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

          <DataTable
            columns={availableColumns}
            items={filteredAvailableTopics}
            getRowKey={(topic) => topic.id}
            getSortValue={(topic, key) => (key === "name" ? topic.name : topic.description)}
            initialSortKey="name"
            emptyText={t.topicPeriods.noAvailableTopics}
            onRowClick={startAdd}
            rowActionLabel={t.common.add}
            rowActionIcon={IconPlus}
          />
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
                            partyApprovalDrafts[party.id] != null ? String(partyApprovalDrafts[party.id]) : NONE_VALUE
                          }
                          onChange={(value) =>
                            setPartyApprovalDrafts((prev) => ({
                              ...prev,
                              [party.id]: !value || value === NONE_VALUE ? null : Number(value),
                            }))
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
