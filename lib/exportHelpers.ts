// lib/exportHelpers.ts

export function exportToCSV(auditLogs: any[], filename = 'bpo-audit-report.csv') {
  if (!auditLogs || auditLogs.length === 0) {
    alert('No audit logs available to export.');
    return;
  }

  const headers = ['ID', 'Ticket ID', 'Sender ID', 'Message Type', 'Timestamp', 'Message'];
  
  const rows = auditLogs.map(log => [
    log.id,
    log.ticket_id,
    log.sender_id,
    log.type,
    log.created_at,
    `"${(log.message || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}