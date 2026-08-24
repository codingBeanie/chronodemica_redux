import { Group, Select, Switch, Table, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import { partiesApi, popsApi, statementsApi, topicsApi, votingBehaviourApi } from "../api/resources";
import type { Party, Pop, Statement, Topic, VotingBehaviour, VotingBehaviourStatementRow } from "../api/types";
import { PeriodSelector } from "../components/PeriodSelector";
import { SortableTh } from "../components/SortableTh";
import { usePeriodContext } from "../context/PeriodContext";
import { compareSortValues, useSort } from "../hooks/useSort";
import { useTranslation } from "../i18n/I18nProvider";

type SortKey = "topic" | "statement" | "approval" | number;

export function VotingBehaviourPage() {
  const t = useTranslation();
  const { selectedPeriodId } = usePeriodContext();
  const [pops, setPops] = useState<Pop[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedPopId, setSelectedPopId] = useState<number | null>(null);
  const [asPercent, setAsPercent] = useState(false);
  const [behaviour, setBehaviour] = useState<VotingBehaviour | null>(null);
  const { sortKey, sortDir, toggleSort } = useSort<SortKey>("topic");

  useEffect(() => {
    popsApi.list().then(setPops);
    partiesApi.list().then(setParties);
    topicsApi.list().then(setTopics);
    statementsApi.list().then(setStatements);
  }, []);

  useEffect(() => {
    if (!selectedPeriodId || !selectedPopId) {
      setBehaviour(null);
      return;
    }
    votingBehaviourApi.get(selectedPeriodId, selectedPopId).then(setBehaviour);
  }, [selectedPeriodId, selectedPopId]);

  const partyName = (id: number) => parties.find((p) => p.id === id)?.name ?? "-";
  const topicName = (id: number) => topics.find((tp) => tp.id === id)?.name ?? "-";
  const statementText = (id: number) => statements.find((s) => s.id === id)?.text ?? "-";

  const formatValue = (points: number) => {
    if (asPercent) {
      if (!behaviour || behaviour.total_points <= 0) return "-";
      return `${((points / behaviour.total_points) * 100).toFixed(1)}%`;
    }
    return points.toFixed(1);
  };

  const totalsByParty: Record<number, number> = {};
  if (behaviour) {
    for (const partyId of behaviour.party_ids) {
      totalsByParty[partyId] = behaviour.statements.reduce(
        (sum, row) => sum + (row.party_points[String(partyId)] ?? 0),
        0,
      );
    }
  }

  const getSortValue = (row: VotingBehaviourStatementRow, key: SortKey): string | number => {
    if (key === "topic") return topicName(row.topic_id);
    if (key === "statement") return statementText(row.statement_id);
    if (key === "approval") return row.approval;
    return row.party_points[String(key)] ?? 0;
  };

  const sortedStatements = behaviour
    ? [...behaviour.statements].sort((a, b) =>
        compareSortValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir),
      )
    : [];

  return (
    <>
      <Text size="xl" fw={700} mb="md">
        {t.votingBehaviour.pageTitle}
      </Text>

      <Group align="flex-start" mb="md">
        <PeriodSelector />
        {pops.length === 0 ? (
          <Text c="dimmed">{t.votingBehaviour.noPopsYet}</Text>
        ) : (
          <Select
            label={t.votingBehaviour.popSelectorLabel}
            placeholder={t.votingBehaviour.popSelectorPlaceholder}
            data={pops.map((pop) => ({ value: String(pop.id), label: pop.name }))}
            value={selectedPopId ? String(selectedPopId) : null}
            onChange={(value) => setSelectedPopId(value ? Number(value) : null)}
            maw={280}
          />
        )}
      </Group>

      {selectedPeriodId && selectedPopId && behaviour && (
        <>
          <Switch
            label={t.votingBehaviour.percentToggleLabel}
            checked={asPercent}
            onChange={(event) => setAsPercent(event.currentTarget.checked)}
            mb="md"
          />

          {behaviour.statements.length === 0 ? (
            <Text c="dimmed">{t.votingBehaviour.empty}</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh
                    label={t.votingBehaviour.columnTopic}
                    sortKey="topic"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label={t.votingBehaviour.columnStatement}
                    sortKey="statement"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label={t.votingBehaviour.columnApproval}
                    sortKey="approval"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                    align="right"
                  />
                  {behaviour.party_ids.map((partyId) => (
                    <SortableTh
                      key={partyId}
                      label={partyName(partyId)}
                      sortKey={partyId}
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={toggleSort}
                      align="right"
                    />
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedStatements.map((row) => (
                  <Table.Tr key={row.statement_id}>
                    <Table.Td>{topicName(row.topic_id)}</Table.Td>
                    <Table.Td>{statementText(row.statement_id)}</Table.Td>
                    <Table.Td ta="right">{row.approval}%</Table.Td>
                    {behaviour.party_ids.map((partyId) => (
                      <Table.Td key={partyId} ta="right">
                        {formatValue(row.party_points[String(partyId)] ?? 0)}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
                <Table.Tr fw={700}>
                  <Table.Td colSpan={3}>{t.votingBehaviour.totalRowLabel}</Table.Td>
                  {behaviour.party_ids.map((partyId) => (
                    <Table.Td key={partyId} ta="right">
                      {formatValue(totalsByParty[partyId] ?? 0)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          )}
        </>
      )}

      {selectedPeriodId && !selectedPopId && (
        <Text c="dimmed">{t.votingBehaviour.noPopSelected}</Text>
      )}
    </>
  );
}
