import { WebSocket, WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
// import ora from 'ora';
import userStore from './user.js';
import messageStore from './message.js';

// const appStartTime = Date.now();
// const consoleSpinner = ora({ spinner: 'soccerHeader' }).start('开始运行...');
let msgCount = 0n;

const formatTime = () => dayjs().format('YYYY-MM-DD HH:mm:ss');

const wss = new WebSocketServer({
  port: 3100,
  clientTracking: true,
  maxPayload: 42949672960,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

const broadcast = <T>(message: { type: string; data?: T }) => {
  console.log(message);
  console.log(Date.now());
  msgCount++;
  const data = JSON.stringify(message);
  userStore.getUserListWithWS().forEach((item) => {
    if (item.ws.readyState === WebSocket.OPEN) {
      item.ws.send(data);
    }
  });
};

wss.on('connection', (ws, req) => {
  // 获取连接者的 id
  const ip = req.socket.remoteAddress;
  let cufoon_chat_uid: string | undefined;
  const needLogin = setTimeout(() => {
    ws.close();
  }, 10000);
  // 当接收到客户端发过来的消息的时候
  ws.on('message', (content) => {
    const data = JSON.parse(content.toString());
    console.log('message', data);
    const type = data.type || 'none';
    if (cufoon_chat_uid !== undefined) {
      const username = userStore.getUserName(cufoon_chat_uid);
      // 清空聊天记录
      if (type === 'system-clear-messages') {
        console.log('system-clear-messages');
        messageStore.clearHistory();
        broadcast({ type: 'system-clear-messages' });
        return;
      }
      // 聊天室消息
      if (type === 'text') {
        const msg = {
          type: 'room-message',
          data: {
            name: username,
            uid: cufoon_chat_uid,
            content: data.text,
            time: formatTime(),
            mid: nanoid()
          }
        };
        broadcast(msg);
        messageStore.saveHistory(msg);
        return;
      }
      if (type === 'image') {
        const msg = {
          type: 'room-message',
          data: {
            name: username,
            uid: cufoon_chat_uid,
            content: data.text,
            contentType: 'image',
            time: formatTime(),
            mid: nanoid()
          }
        };
        broadcast(msg);
        messageStore.saveHistory(msg);
        return;
      }
      // 私信消息
      if (type === 'user-text') {
        const timeStr = formatTime();
        // 发给私信接收者
        userStore.getUser(data.uid)?.ws.send(
          JSON.stringify({
            type: 'user-message',
            data: {
              from: username,
              uid: cufoon_chat_uid,
              content: data.content,
              time: timeStr
            }
          })
        );
        // 回馈给私信的发送者
        ws.send(
          JSON.stringify({
            type: 'user-message',
            data: {
              name: username,
              uid: cufoon_chat_uid,
              content: data.content,
              time: timeStr
            }
          })
        );
      }
      return;
    }
    // 进入聊天室的情况
    if (type === 'login') {
      const uid = userStore.genUid();
      const loginName = data.name || '无名';
      userStore.addUser(uid, {
        uid,
        name: loginName,
        ip,
        time: Date.now(),
        ws
      });
      cufoon_chat_uid = uid;
      clearTimeout(needLogin);
      ws.send(`
      {
        "type": "login-success",
        "data": {
          "uid": ${JSON.stringify(uid)},
          "history": ${messageStore.getHistory()}
        }
      }
      `);
      broadcast({
        type: 'system-login',
        data: `--> ${loginName} <-- 加入聊天！`
      });
      broadcast({ type: 'system-user-list', data: userStore.getUserList() });
      return;
    }
  });

  // 连接断开的时候
  ws.on('close', () => {
    if (cufoon_chat_uid !== undefined) {
      broadcast({
        type: 'system-logout',
        data: `--> ${userStore.getUserName(cufoon_chat_uid)} <-- 离开聊天。`
      });
      userStore.removeUser(cufoon_chat_uid);
      broadcast({ type: 'system-user-list', data: userStore.getUserList() });
    }
  });
});

// const bytes2MiB = (n: number) => `${(n / (1024 * 1024)).toFixed(3)}MiB`;

// setInterval(() => {
//   const mem = process.memoryUsage();
//   const memData = {
//     rss: bytes2MiB(mem.rss),
//     heapTotal: bytes2MiB(mem.heapTotal),
//     heapUsed: bytes2MiB(mem.heapUsed),
//     external: bytes2MiB(mem.external),
//     arrayBuffers: bytes2MiB(mem.arrayBuffers)
//   };
//   const nowTime = dayjs();
//   const hours = nowTime.diff(appStartTime, 'hour', false);
//   const minutes = nowTime.diff(appStartTime, 'minute', false) % 60;
//   const seconds = nowTime.diff(appStartTime, 'second', false) % 60;
//   consoleSpinner.start(
//     `正在运行中...
// 运行时间: ${hours > 0 ? `${hours}小时` : ''}${
//       minutes > 0 ? `${minutes}分钟` : ''
//     }${seconds}秒
// 当前连接数: ${wss.clients.size}
// 已产生消息: ${msgCount}条
// 当前内存使用: {
//   rss: ${memData.rss}
//   heapTotal: ${memData.heapTotal}
//   heapUsed: ${memData.heapUsed}
//   external: ${memData.external}
//   arrayBuffers: ${memData.arrayBuffers}
// }`
//   );
// }, 1200);
