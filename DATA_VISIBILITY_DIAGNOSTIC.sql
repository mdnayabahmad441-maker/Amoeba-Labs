-- READ-ONLY diagnostic. This script does not update or delete any data.
-- Run after the migration sequence in docs/SQL_RUN_ORDER_AND_DATA_RECOVERY.md.

SELECT
  venture.id AS venture_id,
  venture.venture_name,
  venture.status,
  venture.is_default,
  venture.archived_at,
  COUNT(DISTINCT client.id) FILTER (WHERE client.archived_at IS NULL) AS visible_clients,
  COUNT(DISTINCT client.id) FILTER (WHERE client.archived_at IS NOT NULL) AS archived_clients,
  COUNT(DISTINCT lead.id) FILTER (WHERE lead.archived_at IS NULL) AS visible_leads,
  COUNT(DISTINCT project.id) FILTER (WHERE project.archived_at IS NULL) AS visible_projects,
  COUNT(DISTINCT invoice.id) FILTER (WHERE invoice.archived_at IS NULL) AS visible_invoices
FROM ventures venture
LEFT JOIN clients client ON client.venture_id = venture.id
LEFT JOIN leads lead ON lead.venture_id = venture.id
LEFT JOIN projects project ON project.venture_id = venture.id
LEFT JOIN invoices invoice ON invoice.venture_id = venture.id
GROUP BY venture.id, venture.venture_name, venture.status, venture.is_default, venture.archived_at
ORDER BY venture.is_default DESC, venture.venture_name;

SELECT
  users.email,
  membership.venture_id,
  venture.venture_name,
  membership.role,
  membership.status
FROM auth.users users
LEFT JOIN portal_memberships membership ON membership.user_id = users.id
LEFT JOIN ventures venture ON venture.id = membership.venture_id
WHERE lower(users.email) IN (
  lower('groenics@gmail.com'),
  lower('mdnayabahmad441@gmail.com')
)
ORDER BY venture.venture_name;

SELECT
  client.id,
  client.client_name,
  venture.venture_name,
  client.status,
  client.archived_at
FROM clients client
JOIN ventures venture ON venture.id = client.venture_id
ORDER BY client.archived_at NULLS FIRST, venture.venture_name, client.client_name;
