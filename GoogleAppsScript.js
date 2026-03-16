// --- Google Apps Script Code ---

// Substitua pelo ID da sua Planilha Mestra de Licenças
const MASTER_LICENSE_SHEET_ID = '1os_9RhCEqTKEkVqeX30jVO63acP5pCzcqz39w_g_1Hk'; 
const MASTER_LICENSE_SHEET_NAME = 'MasterLicenses';
const CLIENT_TERMINALS_SHEET_NAME = 'TerminalsList';
const CLIENT_DATA_SHEET_NAME = 'ScannerData';

function doGet(e) {
  const action = e.parameter.action;
  const licenseKey = e.parameter.licenseKey;
  const sheetId = e.parameter.sheetId;

  if (action === 'validate' && licenseKey) {
    return handleValidateLicense(licenseKey);
  }
  if (action === 'getSummary' && sheetId) {
    return handleGetSummary(sheetId);
  }
  
  return createJsonResponse({ ok: false, message: 'Ação inválida ou parâmetros ausentes.' });
}

function doPost(e) {
  const action = e.parameter.action;
  const payload = JSON.parse(e.postData.contents);

  if (action === 'sendCode') {
    return handleSendCode(payload);
  } else if (action === 'registerTerminal') {
    return handleRegisterTerminal(payload);
  }

  return createJsonResponse({ ok: false, message: 'Ação inválida ou parâmetros ausentes.' });
}

function handleValidateLicense(licenseKey) {
  const masterSheet = SpreadsheetApp.openById(MASTER_LICENSE_SHEET_ID).getSheetByName(MASTER_LICENSE_SHEET_NAME);
  const data = masterSheet.getDataRange().getValues();
  
  const headers = data[0];
  const licenseKeyCol = headers.indexOf('LicenseKey');
  const ownerEmailCol = headers.indexOf('OwnerEmail');
  const clientSheetIdCol = headers.indexOf('ClientSheetId');
  const maxTerminalsCol = headers.indexOf('MaxTerminals');
  const currentTerminalsCol = headers.indexOf('CurrentTerminals');
  const statusCol = headers.indexOf('Status');
  const registrationDateCol = headers.indexOf('RegistrationDate');
  const lastActivityCol = headers.indexOf('LastActivity'); // Adicionado LastActivity

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[licenseKeyCol] === licenseKey && row[statusCol] === 'Active') {
      let clientSheetId = row[clientSheetIdCol];
      let maxTerminals = row[maxTerminalsCol] || 20; // Padrão de 20 se não definido
      let currentTerminals = row[currentTerminalsCol] || 0;

      // Se o ClientSheetId ainda não foi criado, crie a planilha do cliente
      if (!clientSheetId) {
        const newClientSpreadsheet = SpreadsheetApp.create(`Scanner Data - ${licenseKey}`);
        const newClientSheetId = newClientSpreadsheet.getId();

        // Cria a aba de dados do scanner
        const scannerDataSheet = newClientSpreadsheet.getSheets()[0]; // Pega a primeira aba
        scannerDataSheet.setName(CLIENT_DATA_SHEET_NAME);
        scannerDataSheet.appendRow(['Timestamp', 'TerminalID', 'TerminalName', 'Viatura', 'UTD', 'Code', 'Nota']);
        
        // Cria a aba de lista de terminais
        const terminalsListSheet = newClientSpreadsheet.insertSheet(CLIENT_TERMINALS_SHEET_NAME);
        terminalsListSheet.appendRow(['TerminalID', 'TerminalName', 'Viatura', 'UTD', 'RegistrationDate', 'LastActivity']); // Adicionado LastActivity

        // Atualiza a planilha mestra com o novo ClientSheetId e data de registro
        masterSheet.getRange(i + 1, clientSheetIdCol + 1).setValue(newClientSheetId);
        masterSheet.getRange(i + 1, registrationDateCol + 1).setValue(new Date().toISOString());
        masterSheet.getRange(i + 1, lastActivityCol + 1).setValue(new Date().toISOString()); // Atualiza LastActivity
        clientSheetId = newClientSheetId; // Corrigido: Usar newClientSheetId
      }
      
      // Atualiza a data de última atividade
      masterSheet.getRange(i + 1, headers.indexOf('LastActivity') + 1).setValue(new Date().toISOString());

      return createJsonResponse({ ok: true, sheetId: clientSheetId, maxTerminals: maxTerminals });
    }
  }
  return createJsonResponse({ ok: false, message: 'Licença inválida ou inativa.' });
}

function handleRegisterTerminal(payload) {
  const { clientSheetId, terminalName, viatura, utd, licenseKey } = payload;

  if (!clientSheetId || !terminalName || !viatura || !utd || !licenseKey) {
    return createJsonResponse({ ok: false, message: 'Dados de registro de terminal incompletos.' });
  }

  const masterSheet = SpreadsheetApp.openById(MASTER_LICENSE_SHEET_ID).getSheetByName(MASTER_LICENSE_SHEET_NAME);
  const masterData = masterSheet.getDataRange().getValues();
  const headers = masterData[0];
  const licenseKeyCol = headers.indexOf('LicenseKey');
  const clientSheetIdCol = headers.indexOf('ClientSheetId');
  const maxTerminalsCol = headers.indexOf('MaxTerminals');
  const currentTerminalsCol = headers.indexOf('CurrentTerminals');
  const lastActivityCol = headers.indexOf('LastActivity'); // Adicionado LastActivity

  let licensedUserRowIndex = -1;
  let currentTerminals = 0;
  let maxTerminals = 0;

  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][licenseKeyCol] === licenseKey && masterData[i][clientSheetIdCol] === clientSheetId) {
      licensedUserRowIndex = i;
      currentTerminals = masterData[i][currentTerminalsCol] || 0;
      maxTerminals = masterData[i][maxTerminalsCol] || 20;
      break;
    }
  }

  if (licensedUserRowIndex === -1) {
    return createJsonResponse({ ok: false, message: 'Licença ou planilha do cliente não encontrada para registro.' });
  }

  // Verifica se o terminal já está registrado para esta planilha
  const clientSpreadsheet = SpreadsheetApp.openById(clientSheetId);
  const terminalsListSheet = clientSpreadsheet.getSheetByName(CLIENT_TERMINALS_SHEET_NAME);
  const existingTerminals = terminalsListSheet.getDataRange().getValues();
  const existingTerminalNames = existingTerminals.map(row => row[1]); // Assumindo TerminalName na coluna 1 (B)

  if (existingTerminalNames.includes(terminalName)) {
    // Se o terminal já existe, retorna o ID existente
    const terminalRow = existingTerminals.find(row => row[1] === terminalName);
    return createJsonResponse({ ok: true, terminalId: terminalRow[0], message: 'Terminal já registrado.' });
  }

  if (currentTerminals >= maxTerminals) {
    return createJsonResponse({ ok: false, message: `Limite de ${maxTerminals} terminais atingido. Faça upgrade da licença.` });
  }

  // Gera um ID de terminal único (por exemplo, baseado em timestamp ou um UUID simplificado)
  const newTerminalId = `term-${Utilities.getUuid().substring(0, 8)}`; 
  
  // Adiciona os dados de registro do terminal à aba TerminalsList da planilha do cliente
  terminalsListSheet.appendRow([newTerminalId, terminalName, viatura, utd, new Date().toISOString(), new Date().toISOString()]); // Adicionado LastActivity

  // Atualiza a contagem de terminais atuais na planilha mestra
  masterSheet.getRange(licensedUserRowIndex + 1, currentTerminalsCol + 1).setValue(currentTerminals + 1);
  // Atualiza a data de última atividade
  masterSheet.getRange(licensedUserRowIndex + 1, headers.indexOf('LastActivity') + 1).setValue(new Date().toISOString());

  return createJsonResponse({ ok: true, terminalId: newTerminalId });
}

function handleSendCode(payload) {
  const { clientSheetId, terminalId, code, timestamp, nota, viatura, utd, licenseKey } = payload;

  if (!clientSheetId || !terminalId || !code || !timestamp || !licenseKey) {
    return createJsonResponse({ ok: false, message: 'Dados de envio incompletos.' });
  }

  try {
    const clientSpreadsheet = SpreadsheetApp.openById(clientSheetId);
    const scannerDataSheet = clientSpreadsheet.getSheetByName(CLIENT_DATA_SHEET_NAME);
    
    if (!scannerDataSheet) {
      return createJsonResponse({ ok: false, message: 'Planilha de dados do scanner não encontrada na planilha do cliente.' });
    }

    // Adiciona os dados escaneados
    scannerDataSheet.appendRow([timestamp, terminalId, nota, viatura, utd, code]);

    // Atualiza a data de última atividade na planilha mestra
    const masterSheet = SpreadsheetApp.openById(MASTER_LICENSE_SHEET_ID).getSheetByName(MASTER_LICENSE_SHEET_NAME);
    const masterData = masterSheet.getDataRange().getValues();
    const headers = masterData[0]; // Obter cabeçalhos novamente para garantir que 'LastActivity' esteja presente
    const licenseKeyCol = headers.indexOf('LicenseKey'); 
    const lastActivityCol = headers.indexOf('LastActivity'); // Adicionado LastActivity
    
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][licenseKeyCol] === licenseKey) {
        masterSheet.getRange(i + 1, headers.indexOf('LastActivity') + 1).setValue(new Date().toISOString());
        break;
      }
    }

    return createJsonResponse({ ok: true });
  } catch (error) {
    return createJsonResponse({ ok: false, message: `Erro ao salvar dados: ${error.message}` });
  }
}

function handleGetSummary(clientSheetId) {
  try {
    const ss = SpreadsheetApp.openById(clientSheetId);
    const sheet = ss.getSheetByName(CLIENT_DATA_SHEET_NAME);
    if (!sheet) return createJsonResponse({ ok: false, message: 'Aba de dados não encontrada.' });

    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove cabeçalho
    
    // Retorna as últimas 20 leituras (invertendo para mostrar as mais recentes primeiro)
    const latestData = data.reverse().slice(0, 20);
    return createJsonResponse({ ok: true, data: latestData });
  } catch (error) {
    return createJsonResponse({ ok: false, message: error.message });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- End of Google Apps Script Code ---
