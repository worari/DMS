// Code.gs
// Backend Google Apps Script (GAS) สำหรับ ระบบข้อมูลหนี้สินกำลังพล (DMS)

function doGet(e) {
  console.log("doGet() ถูกเรียกใช้งาน");
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจัดการหนี้สินกำลังพล (DMS)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const DB_USERS = 'Users';
const DB_RECORDS = 'Records';

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === DB_USERS) {
      sheet.appendRow(["id", "username", "password", "firstName", "lastName", "rank", "department", "role", "status", "createdAt"]);
    } else if (sheetName === DB_RECORDS) {
      sheet.appendRow(["id", "userId", "date", "status", "borrowerName", "borrowerId", "borrowerRank", "borrowerDept", "contractNumber", "loanType", "principalAmount", "interestRate", "installmentAmount", "totalInstallments", "remainingInstallments", "totalDebt", "monthlyIncome", "monthlyDeduction", "guarantors", "attachments", "createdAt", "updatedAt"]);
    }
  }
  return sheet;
}

function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      try {
        obj[h] = (typeof row[i] === 'string' && (row[i].startsWith('{') || row[i].startsWith('['))) ? JSON.parse(row[i]) : row[i];
      } catch(e) { obj[h] = row[i]; }
    });
    return obj;
  });
}

function writeSheetData(sheetName, updateFn) {
  console.log("กำลังเข้าถึงข้อมูลเพื่อเขียนลงชีต: " + sheetName);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); 
  try {
    const sheet = getSheet(sheetName);
    const headers = sheet.getDataRange().getValues()[0];
    
    const currentData = getSheetData(sheetName);
    const newRowsRaw = updateFn(currentData);
    
    const newRows = newRowsRaw.map(obj => {
      return headers.map(h => {
        let val = obj[h];
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return val === undefined || val === null ? '' : val;
      });
    });
    
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
    
    if (newRows.length > 0) {
      sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
    }
    
    console.log("บันทึกข้อมูลชีต " + sheetName + " สำเร็จ! จำนวนแถว: " + newRows.length);
    return true;
  } catch (e) {
    console.error("เกิดข้อผิดพลาดในการเขียนชีต " + sheetName + ": " + e.message);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function gasLogin(username, password) {
  try {
    if (!username || !password) {
      return { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
    }
    const users = getSheetData(DB_USERS);
    const user = users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase() && String(u.password) === String(password));
    if (!user) return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    if (user.status === 'PENDING') return { success: false, message: "บัญชียังไม่อนุมัติ กรุณาติดต่อแอดมิน" };
    if (user.status === 'REJECTED') return { success: false, message: "บัญชีถูกปฏิเสธ" };
    if (user.status === 'SUSPENDED') return { success: false, message: "บัญชีถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" };
    
    const result = { ...user };
    delete result.password; 
    return { success: true, message: "เข้าสู่ระบบสำเร็จ", user: result, token: "gas-token-" + Date.now() };
  } catch (e) { return { success: false, message: e.message }; }
}

function gasRegister(userData) {
  try {
    if (!userData.username || !userData.password) {
      return { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
    }
    writeSheetData(DB_USERS, (users) => {
      const exists = users.find(u => String(u.username).toLowerCase() === String(userData.username).toLowerCase());
      if (exists) throw new Error("มีชื่อผู้ใช้นี้ในระบบแล้ว");
      
      const newUser = {
        ...userData,
        id: "USR" + Date.now() + Math.floor(Math.random()*1000),
        status: "PENDING",
        role: "USER",
        createdAt: new Date().toISOString()
      };
      
      if (users.length === 0) {
        newUser.role = "ADMIN";
        newUser.status = "APPROVED";
      }
      
      users.push(newUser);
      return users;
    });
    return { success: true, message: "ลงทะเบียนสำเร็จ รอการอนุมัติ" };
  } catch (e) { return { success: false, message: e.message }; }
}

function gasGetRecords(userId, role) {
  try {
    const rawRecords = getSheetData(DB_RECORDS);
    const records = rawRecords.map(r => {
      let reconstructed = {
        id: r.id, userId: r.userId, status: r.status,
        createdAt: r.createdAt, updatedAt: r.updatedAt
      };
      
      // Parse attachments (stored as full recordData JSON)
      let attachmentData = null;
      if (typeof r.attachments === 'object' && r.attachments !== null) {
        attachmentData = r.attachments;
      } else if (typeof r.attachments === 'string') {
        try {
          attachmentData = JSON.parse(r.attachments);
        } catch(e) {
          console.error("Failed to parse attachments for record " + r.id + ": " + e.message);
        }
      }
      
      if (attachmentData && typeof attachmentData === 'object') {
        // Merge attachmentData into reconstructed, but row-level ids take priority
        reconstructed = { ...attachmentData, ...reconstructed };
      }
      
      return reconstructed;
    });

    let result;
    if (role === 'ADMIN' || role === 'HR' || role === 'REVIEW') {
      result = records;
    } else {
      result = records.filter(r => r.userId === userId);
    }
    
    // Sort by createdAt descending, with null dates going last
    return result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
  } catch(e) { 
    console.error("gasGetRecords error: " + e.message);
    return []; 
  }
}

function gasSaveRecord(recordData) {
  try {
    if (!recordData.userId) {
      return { success: false, message: "ไม่พบข้อมูลผู้ใช้ (userId)" };
    }
    
    let savedRecord = null;
    writeSheetData(DB_RECORDS, (records) => {
      let idx = -1;
      if (recordData.id) {
        idx = records.findIndex(r => r.id === recordData.id);
      }
      // If no id match, look for DRAFT record of this user
      if (idx < 0) {
        const draftIdx = records.findIndex(r => r.userId === recordData.userId && r.status === 'DRAFT');
        if (draftIdx >= 0) {
          idx = draftIdx;
          if (!recordData.id) {
            recordData.id = records[draftIdx].id;
          }
        }
      }

      const totalDebtSum = (recordData.debts && recordData.debts.length > 0) 
        ? recordData.debts.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0) 
        : 0;
      const totalMonthlyPay = (recordData.debts && recordData.debts.length > 0) 
        ? recordData.debts.reduce((sum, d) => sum + Number(d.monthlyPayment || 0), 0) 
        : 0;

      // Generate ID if not exists
      if (!recordData.id) {
        recordData.id = "REC" + Date.now() + Math.floor(Math.random() * 1000);
      }

      const now = new Date().toISOString();
      const mappedRow = {
        id: recordData.id,
        userId: recordData.userId || "",
        date: recordData.createdAt || now,
        status: recordData.status || "DRAFT",
        borrowerName: ((recordData.firstName || "") + " " + (recordData.lastName || "")).trim(),
        borrowerId: recordData.userId || "",
        borrowerRank: recordData.rank || "",
        borrowerDept: recordData.department || "",
        contractNumber: recordData.debts && recordData.debts.length > 0 
          ? recordData.debts.map(d => (d.contractNo || d.type || "-")).join(", ") 
          : "-",
        loanType: recordData.debts && recordData.debts.length > 0 
          ? [...new Set(recordData.debts.map(d => d.type).filter(Boolean))].join(", ") 
          : "-",
        principalAmount: totalDebtSum,
        interestRate: recordData.debts && recordData.debts.length > 0 
          ? recordData.debts.map(d => d.interestRate || "0").join(", ") 
          : "-",
        installmentAmount: totalMonthlyPay,
        totalInstallments: recordData.debts && recordData.debts.length > 0 
          ? recordData.debts.map(d => d.totalInstallments || "0").join(", ") 
          : "-",
        remainingInstallments: recordData.debts && recordData.debts.length > 0 
          ? recordData.debts.map(d => d.remainingInstallments || "0").join(", ") 
          : "-",
        totalDebt: totalDebtSum,
        monthlyIncome: recordData.netIncome || 0,
        monthlyDeduction: totalMonthlyPay,
        guarantors: recordData.guarantors && recordData.guarantors.length > 0 
          ? recordData.guarantors.map(g => g.name || "").join(", ") 
          : "-",
        attachments: JSON.stringify(recordData),
        createdAt: recordData.createdAt || now,
        updatedAt: now
      };

      if (idx >= 0) {
        // Update existing: preserve original createdAt
        const existingCreatedAt = records[idx].createdAt || mappedRow.createdAt;
        records[idx] = { ...records[idx], ...mappedRow, createdAt: existingCreatedAt, updatedAt: now };
      } else {
        // New record
        mappedRow.createdAt = now;
        records.push(mappedRow);
      }
      savedRecord = recordData;
      return records;
    });
    return { success: true, message: "บันทึกข้อมูลสำเร็จ", record: savedRecord };
  } catch(e) { 
    console.error("gasSaveRecord error: " + e.message);
    return { success: false, message: e.message }; 
  }
}

function gasDeleteRecord(id) {
  try {
    if (!id) {
      return { success: false, message: "ไม่ระบุรหัสข้อมูล (id)" };
    }
    let deleted = false;
    writeSheetData(DB_RECORDS, (records) => {
      const filtered = records.filter(r => r.id !== id);
      if (filtered.length < records.length) deleted = true;
      return filtered;
    });
    if (!deleted) {
      return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
    }
    return { success: true, message: "ลบข้อมูลสำเร็จ" };
  } catch(e) { 
    console.error("gasDeleteRecord error: " + e.message);
    return { success: false, message: e.message }; 
  }
}

function gasGetUsers() {
  try {
    const users = getSheetData(DB_USERS);
    return users.map(u => {
      let temp = {...u};
      delete temp.password;
      return temp;
    });
  } catch(e) { return { error: e.message }; }
}

function gasUserAction(userId, action, payload) {
  try {
    if (!userId || !action) {
      return { success: false, message: "กรุณาระบุ userId และ action" };
    }
    writeSheetData(DB_USERS, (users) => {
      const idx = users.findIndex(u => u.id === userId);
      if (idx >= 0) {
        if (action === 'APPROVE') users[idx].status = 'APPROVED';
        else if (action === 'REJECT') users[idx].status = 'REJECTED';
        else if (action === 'SUSPEND') users[idx].status = 'SUSPENDED';
        else if (action === 'ACTIVATE') users[idx].status = 'ACTIVE'; // Note: original used 'ACTIVE' not 'ACTIVATED' for consistency with frontend
        else if (action === 'DELETE') return users.filter(u => u.id !== userId);
        else if (action === 'CHANGE_ROLE') users[idx].role = payload;
      }
      return users;
    });
    return { success: true, message: "ทำรายการสำเร็จ" };
  } catch(e) { 
    console.error("gasUserAction error: " + e.message);
    return { success: false, message: e.message }; 
  }
}