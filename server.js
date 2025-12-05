const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// 🔓 允許所有網站連線
app.use(cors());
app.use(bodyParser.json());

// ------------------------------------------------
// 🔑 設定區 (變數要放在最上面)
// ------------------------------------------------

// 你的 VAPID Keys
const publicVapidKey = 'BA9EFqigQF0HLsJisQtvcbWrjAvtz14BT9DKwaygnNJR51kPnY-TwH9Ui94sLEzZOS4FdOiXI-OKAUl1A2Mh-Fc';
const privateVapidKey = 'wpUqQhxKlvFrlNZ_2ILgVlk2NuD2Tjf7vdWGZAKN1w8';

webpush.setVapidDetails(
    'mailto:test@example.com', 
    publicVapidKey, 
    privateVapidKey
);

// 資料暫存區
let subscriptions = [];      // 訂閱者清單
let messageHistory = [];     // 歷史公告清單 (新功能)

// ------------------------------------------------
// 🛣️ 路由區 (API)
// ------------------------------------------------

// 1. 測試首頁
app.get('/', (req, res) => {
    res.send('Hello! Backend is working on Cloud! ☁️');
});

// 2. 取得歷史公告 (前端佈告欄用)
app.get('/messages', (req, res) => {
    res.json(messageHistory);
});

// 3. 訂閱
app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    console.log('📝 新增訂閱！目前人數:', subscriptions.length);
    res.status(201).json({});
});

// 4. 取消訂閱 (修復手機卡住用)
app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log('👋 有人取消訂閱。目前剩餘人數:', subscriptions.length);
    res.json({ success: true });
});

// 5. 推播廣播 (這裡合併了「存訊息」與「發推播」)
app.post('/broadcast', (req, res) => {
    const { title, message, url } = req.body;

    // --- Part A: 把新訊息存進歷史紀錄 ---
    const newMessage = {
        title: title,
        message: message,
        time: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
        url: url || '#'
    };

    // 加到最前面
    messageHistory.unshift(newMessage);

    // 只保留最新 3 則
    if (messageHistory.length > 3) {
        messageHistory.pop();
    }
    console.log('📚 已更新公告板，目前有', messageHistory.length, '則訊息');


    // --- Part B: 發送推播給所有人 ---
    const notificationPayload = JSON.stringify({
        title: title,
        body: message, // 注意：這裡要對應前端 Service Worker 的 body
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        data: { url: url || '/' }
    });

    console.log(`📡 正在發送推播給 ${subscriptions.length} 位使用者...`);

    const promiseChain = subscriptions.map((sub, index) => {
        return webpush.sendNotification(sub, notificationPayload)
            .catch(err => {
                console.error(`❌ 發送失敗 (第 ${index+1} 位):`, err.statusCode);
                return null;
            });
    });

    Promise.all(promiseChain)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ------------------------------------------------
// 🚀 啟動區
// ------------------------------------------------
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${port}`);
});