// KFESTA 사이트 설정
// SUPABASE_URL / SUPABASE_ANON 이 비어 있으면 참가문의 폼은 이메일 문의로 폴백된다.
window.KF_CFG = {
  // 배포 사이트 접수 수집: Apps Script 웹 앱 URL (…/exec). 시트 저장 + 메일 알림
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwSEONilJdT522UxC_gAvYeDvrRsCk60GYiOFwy2MVPcYyRhoZK3NF-rTOW9TrtAyTU/exec',
  SUPABASE_URL: '',   // 자체 서버/Supabase 붙일 때
  SUPABASE_ANON: '',

  CONTACT_EMAIL: 'info@firstmkt.co.kr',
  PHONE_KR: '+82 10 2746 1547',
  PHONE_VN: '+84 97 120 1878',
};
