# ระบบข้อมูลหนี้สินกำลังพล (DMS)

ระบบจัดการหนี้สินกำลังพล ทบ. (สปบ.กพ.ทบ.) พัฒนาด้วย Google Apps Script + React 19  
**ฐานข้อมูล:** Google Sheets  
**Repository:** https://github.com/worari/DMS.git  
**Web App URL (Production):** https://script.google.com/macros/s/AKfycbwfUO-ImRg744IMSVSKVan0Vz9gfPKaj7htduSoJRX7v6Ah_2pE_Y55H0iv6ijFFnOcIg/exec

---

## 📋 ภาพรวมระบบ

| ชั้น | เทคโนโลยี | ไฟล์ |
|------|-----------|------|
| Frontend | React 19 SPA | `index.html` |
| Backend | Google Apps Script | `Code.gs` |
| Database | Google Sheets (2 sheets) | `Users`, `Records` |
| Dev Server | Node.js | `server.js` |

### ฟีเจอร์หลัก
- 🔐 ระบบ Login/Register พร้อม Approval Workflow
- 👥 จัดการผู้ใช้ (Admin/HR/Review/User)
- 📝 บันทึกข้อมูลหนี้สิน (หลายสัญญา, ผู้ค้ำประกัน)
- 📊 Dashboard แสดงสรุปยอดหนี้
- 📋 Export/พิมพ์รายงาน

---

## 🚀 ขั้นตอนการติดตั้ง (Step by Step)

### ขั้นที่ 1: ติดตั้งเครื่องมือที่จำเป็น

#### 1.1 ติดตั้ง Node.js
ดาวน์โหลดและติดตั้งจาก: https://nodejs.org/ (เวอร์ชัน LTS)

ตรวจสอบว่าติดตั้งสำเร็จ:
```cmd
node --version
npm --version
```

#### 1.2 ติดตั้ง Google Apps Script CLI (`clasp`)
```cmd
npm install -g @google/clasp
```

ตรวจสอบ:
```cmd
clasp --version
```

#### 1.3 Clone โค้ดจาก GitHub
```cmd
cd C:\WebAPP
git clone https://github.com/worari/DMS.git ระบบข้อมูลหนี้สินกำลังพล
cd ระบบข้อมูลหนี้สินกำลังพล
```

---

### ขั้นที่ 2: สร้าง Google Apps Script Project

#### 2.1 เปิด Google Sheets และสร้าง Apps Script
1. ไปที่ https://sheets.google.com
2. สร้าง Google Sheets ใหม่ ตั้งชื่อว่า `DMS_Database`
3. ไปที่เมนู **Extensions → Apps Script**

#### 2.2 เปิดใช้งาน Google Sheets API
ใน Apps Script Editor:
1. คลิก **Services** (เครื่องหมาย `+` ข้าง Services)
2. เลือก **Google Sheets API** → Add

#### 2.3 คัดลอก Script ID
ใน Apps Script Editor:
1. ไปที่ **Project Settings** (⚙️ ด้านซ้าย)
2. คัดลอก **Script ID** (รูปแบบ: `13dlBZn8n...`)

#### 2.4 ตั้งค่า clasp ในโฟลเดอร์โปรเจค
```cmd
cd C:\WebAPP\ระบบข้อมูลหนี้สินกำลังพล
```

แก้ไขไฟล์ `.clasp.json` โดยเปลี่ยน `scriptId` เป็นของคุณ:
```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
```

---

### ขั้นที่ 3: Deploy Backend (Code.gs)

#### 3.1 Login clasp
```cmd
clasp login
```
(จะเปิด browser ให้ login ด้วย Google Account)

#### 3.2 Push โค้ดขึ้น Google Apps Script
```cmd
clasp push
```

#### 3.3 Deploy เป็น Web App
1. เปิด Apps Script Editor (https://script.google.com)
2. เลือก **Deploy → New Deployment**
3. เลือกประเภท: **Web App**
4. ตั้งค่า:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. กด **Deploy**
6. **คัดลอก Web App URL** ที่ได้ (รูปแบบ: `https://script.google.com/macros/s/.../exec`)

#### 3.4 ตรวจสอบ Deployment
เปิด Web App URL ใน browser ควรเห็นหน้า login ของระบบ

---

### ขั้นที่ 4: ตั้งค่า Google Sheets (ฐานข้อมูล)

หลังจาก Deploy ครั้งแรกและเปิด Web App URL, กลับไปที่ Google Sheets `DMS_Database`:
- **ชีต `Users`** จะถูกสร้างอัตโนมัติพร้อมหัวคอลัมน์
- **ชีต `Records`** จะถูกสร้างอัตโนมัติพร้อมหัวคอลัมน์

#### 4.1 สร้างผู้ใช้ Admin คนแรก
ไปที่ Apps Script Editor → เลือกฟังก์ชัน `gasRegister` → Run  
หรือเปิด Web App แล้วลงทะเบียน → ผู้ใช้คนแรกจะได้ role **ADMIN** โดยอัตโนมัติและสถานะ **APPROVED**

---

### ขั้นที่ 5: รันระบบแบบ Local (Development)

#### 5.1 รัน Dev Server
```cmd
cd C:\WebAPP\ระบบข้อมูลหนี้สินกำลังพล
node server.js
```

Console จะแสดง:
```
✅ ระบบข้อมูลหนี้สินกำลังพล (DMS)
🌐 Server running at http://localhost:3000/
```

#### 5.2 เปิด Browser
ไปที่ http://localhost:3000/

> **หมายเหตุ:** การทำงานผ่าน local dev server ใช้สำหรับทดสอบ UI เท่านั้น  
> การเรียก GAS functions (`google.script.run.*`) จะทำงานเมื่อ deploy ผ่าน Google Apps Script เท่านั้น

---

### ขั้นที่ 6: Push โค้ดอัพเดทขึ้น Production

เมื่อแก้ไขโค้ดแล้ว push ขึ้น GAS:
```cmd
clasp push
```

จากนั้นใน Apps Script Editor:
1. **Deploy → Manage Deployments**
2. คลิก **Edit** (✏️) บน deployment ล่าสุด
3. เลือกเวอร์ชันเป็น **New version**
4. กด **Deploy**

---

## 📁 โครงสร้างไฟล์

```
ระบบข้อมูลหนี้สินกำลังพล/
├── .clasp.json          # Config สำหรับ clasp (GAS Script ID)
├── .claspignore         # ไฟล์ที่ ignore ไม่ push ขึ้น GAS
├── .gitignore           # ไฟล์ที่ ignore ไม่ commit ขึ้น Git
├── README.md            # คู่มือการติดตั้ง (ไฟล์นี้)
├── Code.gs              # Backend - Google Apps Script functions
├── index.html           # Frontend - React 19 SPA (bundle)
└── server.js            # Local Dev Server (Node.js)
```

---

## 🔧 ฟังก์ชัน Backend (Code.gs)

| Function | คำอธิบาย |
|----------|-----------|
| `doGet()` | Entry point - serve `index.html` เป็น Web App |
| `gasLogin(username, password)` | เข้าสู่ระบบ |
| `gasRegister(userData)` | ลงทะเบียนผู้ใช้ใหม่ |
| `gasGetRecords(userId, role)` | ดึงข้อมูลหนี้สิน (user เห็นของตัวเอง, admin/hr/review เห็นทั้งหมด) |
| `gasSaveRecord(recordData)` | บันทึก/อัพเดทข้อมูลหนี้สิน |
| `gasDeleteRecord(id)` | ลบข้อมูลหนี้สิน |
| `gasGetUsers()` | ดึงรายชื่อผู้ใช้ทั้งหมด (admin) |
| `gasUserAction(userId, action, payload)` | จัดการผู้ใช้ (อนุมัติ/ปฏิเสธ/ระงับ/เปลี่ยน role/ลบ) |

---

## 🔐 สิทธิ์และการเข้าถึง (Roles)

| Role | สิทธิ์ |
|------|--------|
| **ADMIN** | ทุกอย่าง + จัดการผู้ใช้ |
| **HR** | ดู/แก้ไข/ลบ records ทั้งหมด |
| **REVIEW** | ดู records ทั้งหมด |
| **USER** | ดู/สร้าง/แก้ไข records ของตัวเอง |

---

## 🐛 แก้ไขปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|--------|---------|
| Web App URL ขึ้น "Sorry, unable to open the file" | ตรวจสอบว่า Deploy เป็น Web App และ Access = Anyone |
| `clasp push` error: "No credentials" | รัน `clasp login` ใหม่ |
| Google Sheets ไม่ถูกสร้าง | เปิด Web App URL 1 ครั้งเพื่อ trigger `doGet()` |
| `node server.js` ไม่ทำงาน | ตรวจสอบว่า `index.html` อยู่ในโฟลเดอร์เดียวกัน |

---

## 📞 การสนับสนุน

GitHub Issues: https://github.com/worari/DMS/issues

---

**เวอร์ชัน:** 1.0.0 | **อัพเดทล่าสุด:** 23 มิถุนายน 2569