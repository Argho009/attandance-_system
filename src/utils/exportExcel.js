import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToExcel = (sheets, filename) => {
  const wb = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `${filename}.xlsx`);
};

export const exportCredentials = (rows) => {
  // Spec: output columns: college_id | initial_password
  // Label prominently that it doesn't reflect user-changed passwords
  const sheet = {
    name: 'Credentials',
    data: rows.map(r => ({
      college_id: r.college_id,
      initial_password: r.initial_password,
      Note: "Initial credentials only — does not reflect user-changed passwords"
    }))
  };
  exportToExcel([sheet], 'User_Credentials');
};
