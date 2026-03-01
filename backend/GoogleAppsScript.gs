/**
 * Google Apps Script - Colar no editor do script (Extensions > Apps Script)
 * da planilha que receberá os dados do scanner.
 *
 * 1. Crie uma planilha no Google Sheets.
 * 2. Na primeira linha, coloque os cabeçalhos: Coluna A = "Código", B = "Data", C = "Imagem".
 * 3. Extensions > Apps Script, cole este código.
 * 4. Implante como Web App: Deploy > New deployment > Type: Web app.
 *    - Execute as: Me (sua conta)
 *    - Quem tem acesso: Qualquer pessoa (para o app poder enviar POST)
 * 5. Copie a URL do Web App e use como VITE_API_URL no .env do projeto React.
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let result = { success: false, message: '' };

  try {
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    const code = body.code || '';
    const timestamp = body.timestamp || new Date().toISOString();

    if (!code) {
      result.message = 'Campo "code" é obrigatório';
      return response(result, 400);
    }

    const lastRow = sheet.getLastRow();
    const nextRow = lastRow + 1;

    sheet.getRange('A' + nextRow).setValue(code);
    sheet.getRange('B' + nextRow).setValue(timestamp);
    sheet.getRange('C' + nextRow).setFormula(
      '=IMAGE("https://bwipjs-api.metafloor.com/?bcid=code128&text=" & A' + nextRow + ')'
    );

    result.success = true;
    result.message = 'Registro salvo';
    return response(result, 200);
  } catch (err) {
    result.message = err.toString();
    return response(result, 500);
  }
}

function response(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
