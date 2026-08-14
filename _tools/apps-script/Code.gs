/**
 * KFESTA 접수 수집 (참가신청 + 참가문의)
 * 배포: 확장 프로그램 → Apps Script에 붙여넣기 → 배포 → 새 배포 → 웹 앱
 *      실행 계정: 나 / 액세스 권한: 모든 사용자 → 웹 앱 URL(/exec)을 config.js SHEET_ENDPOINT에 입력
 */

var MAIL_TO = 'info@firstmkt.co.kr'; // 알림 수신 메일 (여러 명이면 쉼표로)

var APPLY_HEADERS = [
  ['created_at', '접수일시'], ['company', '기업명'], ['company_en', '기업명(영문)'], ['ceo', '대표자'],
  ['biz_no', '사업자번호'], ['founded', '설립연도'], ['employees', '직원수'], ['address', '소재지'],
  ['website', '홈페이지'], ['name', '담당자'], ['position', '직함'], ['phone', '연락처'], ['email', '이메일'],
  ['product_name', '제품명'], ['category', '품목'], ['product_desc', '제품소개'], ['product_spec', '사양'],
  ['certifications', '인증'], ['store_url', '판매링크'], ['export_exp', '수출경험'], ['export_countries', '수출국가'],
  ['vn_exp', '베트남경험'], ['trade_types', '희망거래'], ['referral', '신청경로'], ['questions', '문의사항'],
];
var INQ_HEADERS = [
  ['created_at', '접수일시'], ['name', '이름'], ['phone', '연락처'], ['email', '이메일'],
  ['company', '기업명'], ['position', '직함'], ['category', '분야'],
];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type === 'apply' ? 'apply' : 'inquiry';
    var data = payload.data || {};
    data.created_at = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    var sheetName = type === 'apply' ? '참가신청' : '문의';
    var headers = type === 'apply' ? APPLY_HEADERS : INQ_HEADERS;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers.map(function (h) { return h[1]; }));
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(headers.map(function (h) { return data[h[0]] || ''; }));

    // 담당자 메일 알림
    var subject = type === 'apply'
      ? '[KFESTA 참가신청] ' + (data.company || '')
      : '[KFESTA 문의] ' + (data.company || data.name || '');
    var body = headers.map(function (h) { return h[1] + ': ' + (data[h[0]] || '-'); }).join('\n')
      + '\n\n시트: ' + ss.getUrl();
    MailApp.sendEmail(MAIL_TO, subject, body);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('KFESTA collector OK');
}
