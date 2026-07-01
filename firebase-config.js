// ⚠️ Firebase 콘솔(https://console.firebase.google.com)에서
// 새 프로젝트를 만든 뒤, 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성에서
// 아래 값을 실제 값으로 교체하세요.
// Firestore Database도 만들어야 합니다 (테스트 모드로 시작 가능).

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 오프라인 캐시 활성화 (실패해도 앱은 계속 동작)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.warn("Firestore persistence unavailable:", err.code);
});

const SCORES_COLLECTION = "thisvoca_scores";
