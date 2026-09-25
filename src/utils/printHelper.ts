// Universal iframe print engine for native browser printing dialog
export const printHtmlViaIframe = (title: string, bodyHtml: string) => {
  const existingFrame = document.getElementById('the-commissary-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'the-commissary-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc || !iframe.contentWindow) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 10mm 12mm 12mm 12mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 16px;
            font-size: 11px;
            line-height: 1.35;
          }
          h1 {
            font-size: 17px;
            font-weight: 800;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: -0.3px;
            color: #0f172a;
          }
          .meta-header {
            font-size: 10px;
            color: #334155;
            font-family: monospace;
            margin: 6px 0 14px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
          }
          .banner-notice {
            background-color: #d1e7dd;
            border: 1px solid #a3cfbb;
            color: #0a3622;
            padding: 5px 8px;
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 10px;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a;
            font-weight: 800;
            text-transform: uppercase;
            font-family: monospace;
            padding: 5px 6px;
            text-align: left;
            border: 1px solid #cbd5e1;
          }
          th.center, td.center {
            text-align: center;
          }
          th.right, td.right {
            text-align: right;
          }
          td {
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          td.green-cell {
            background-color: #d1e7dd !important;
            font-weight: bold;
            color: #0f5132;
            text-align: center;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            font-family: monospace;
          }
          .badge-amber {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          .sig-line {
            display: inline-block;
            width: 180px;
            border-bottom: 1px solid #334155;
            margin-left: 8px;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print invocation error:", err);
      window.print();
    }
  }, 400);
};
