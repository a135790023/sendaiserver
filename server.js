const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors'); // 記得要 npm install cors

const app = express();

// 🔓 允許所有網站連線 (解決 CORS 問題)
app.use(cors());
app.use(bodyParser.json());

// ... 原本的 import ...

let subscriptions = [];

// ✨ 1. 新增：用來存歷史訊息的陣列
let messageHistory = []; 

// ... 原本的 subscribe API ...

// ✨ 2. 新增：提供 API 讓前端「讀取歷史訊息」
app.get('/messages', (req, res) => {
    res.json(messageHistory);
});

app.post('/broadcast', (req, res) => {
    const { title, message, url } = req.body;

    // ✨ 3. 修改：在發送推播的同時，把內容存起來
    const newMessage = {
        title: title,
        message: message,
        time: new Date().toLocaleString(), // 加上時間
        url: url
    };

    // 把新訊息加到「最前面」 (unshift)
    messageHistory.unshift(newMessage);

    // 只保留最新 3 則 (如果超過 3 則，就把舊的切掉)
    if (messageHistory.length > 3) {
        messageHistory = messageHistory.slice(0, 3);
    }

    // ... 下面接原本的發送推播程式碼 ...

// 🔑 你的 VAPID Keys (請確認這裡是你最新的 key)
const publicVapidKey = 'BA9EFqigQF0HLsJisQtvcbWrjAvtz14BT9DKwaygnNJR51kPnY-TwH9Ui94sLEzZOS4FdOiXI-OKAUl1A2Mh-Fc';
const privateVapidKey = 'wpUqQhxKlvFrlNZ_2ILgVlk2NuD2Tjf7vdWGZAKN1w8';

webpush.setVapidDetails('mailto:test@example.com', publicVapidKey, privateVapidKey);

// ⚠️ 注意：雲端重啟後這裡會清空
let subscriptions = [];

// 測試用路由 (讓你知道伺服器活著)
app.get('/', (req, res) => {
    res.send('Hello! Backend is working on Cloud! ☁️');
});

// 訂閱路由
app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    console.log('📝 新增訂閱！目前人數:', subscriptions.length);
    res.status(201).json({});
});
// 3. 提供 API 讓前端「取消訂閱」
app.post('/unsubscribe', (req, res) => {
    // 前端會傳來 endpoint (這是每個訂閱者的唯一 ID)
    const { endpoint } = req.body;
    
    // 找出並移除該訂閱者
    // 邏輯：保留那些「endpoint 不等於」傳進來的人
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    
    console.log('👋 有人取消訂閱了。目前剩餘人數:', subscriptions.length);
    res.json({ success: true });
});
// 推播路由
app.post('/broadcast', (req, res) => {
    const { title, message, url } = req.body;
    const payload = JSON.stringify({
        title: title, 
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        data: { url: url || '/' }
    });

    Promise.all(subscriptions.map(sub => webpush.sendNotification(sub, payload).catch(e => console.log(e))))
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ⭐ 關鍵：使用雲端分配的 Port
const port = process.env.PORT || 5000;
// 加入 '0.0.0.0' 參數，讓它接受來自任何 IP 的連線
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${port}`);
});