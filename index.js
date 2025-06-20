// ✅ MAIN SETUP
const { Telegraf } = require("telegraf");
const fs = require("fs");
const fetch = require("node-fetch");

const bot = new Telegraf("7966672397:AAGVa7quK-dx-3HmZ1NJziVVXdN3TmQhFik"); // BOT TOKEN INBUILT
const ADMINS = [1081656301, 1361262107]; // Your and sister ID

const jsonFiles = [
  { main: "batches.json", backup: "batchesbackup.json" },
  { main: "settings.json", backup: "settingsbackup.json" },
  { main: "users.json", backup: "usersbackup.json" }
];

let settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));
let users = JSON.parse(fs.readFileSync("users.json", "utf8"));
let batches = JSON.parse(fs.readFileSync("batches.json", "utf8"));

function isAdmin(id) {
  return ADMINS.includes(id);
}
function saveJSON(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}
function formatDate() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

const batchSession = {};
let captionSession = {};
let waitingUploadIndex = -1;

// ✅ START COMMAND
bot.start(async (ctx) => {
  const user = ctx.from;
  console.log("📩 /start received from", ctx.from.id);

  if (!users.find(u => u.id === user.id)) {
    users.push({ id: user.id, name: user.first_name, joined: formatDate() });
    saveJSON("users.json", users);

    if (settings.log_channel_id) {
      await ctx.telegram.sendMessage(settings.log_channel_id,
        `🆕 New User Joined:\n👤 ${user.first_name}\n🆔 ${user.id}\n🕒 ${formatDate()}`
      );
    }
  }

  const msgText = ctx.message.text;
  if (!msgText.includes("batch_")) {
    return ctx.reply(`👋 Hi ${user.first_name}!\n\n🎬 I’m DD4K File Store Bot.\nUse /help to get started.`);
  }

  const batchId = msgText.split("start=")[1];
  const batch = batches[batchId];
  if (!batch) return ctx.reply("❌ Batch not found.");

  ctx.reply(`🎬 ${batch.title}\n🔐 Enter secret code:`);

  bot.once("text", async (codeCtx) => {
    const inputCode = codeCtx.message.text.trim().toLowerCase();
    if (inputCode !== batch.code) return codeCtx.reply("❌ Wrong code! Try again.");

    for (let i = batch.from_id; i <= batch.to_id; i++) {
      try {
        await ctx.telegram.copyMessage(codeCtx.from.id, settings.storage_channel_id, i, {
          caption: settings.custom_caption || undefined,
          parse_mode: "HTML"
        });
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.log("Error:", err);
      }
    }
  });
});

// ✅ ROAST FOR NON-ADMINS
function sendRoast(ctx) {
  const name = ctx.from.first_name;
  const roasts = [
    `😂 Oi ${name}! DD4K bot commands aren't for you. Sit back, enjoy. 🍿`,
    `🤣 ${name}, calm down! You're just a download guy, not the king. 👑`,
    `💀 ${name}, who gave you admin powers? Go take a walk... 😭`
  ];
  ctx.reply(roasts[Math.floor(Math.random() * roasts.length)]);
}

// ✅ /help, /about, /stats
bot.command("help", ctx => ctx.reply("🎬 Use batch link + code to unlock files.\nOnly admins can create batch."));
bot.command("about", ctx => ctx.reply("🤖 DD4K File Store Bot\nBuilt by Monster Twins 👑\n💜 Love from DD4K"));
bot.command("stats", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  ctx.reply(`📊 Stats:\n👥 Users: ${users.length}\n📦 Batches: ${Object.keys(batches).length}\n🕒 ${formatDate()}`);
});

// ✅ /setadmin
bot.command("setadmin", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  ctx.reply("➡️ Forward *any message* from Storage Channel");
  bot.once("message", msg1 => {
    settings.storage_channel_id = msg1.forward_from_chat.id;
    ctx.reply("➡️ Now forward *any message* from Log Channel");
    bot.once("message", msg2 => {
      settings.log_channel_id = msg2.forward_from_chat.id;
      saveJSON("settings.json", settings);
      ctx.reply("✅ Channels saved. Ready for /batch");
    });
  });
});

// ✅ /batch (Create)
bot.command("batch", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  batchSession[ctx.from.id] = { step: 1 };
  ctx.reply("📥 Send *first message* from batch:");
});
bot.on("message", ctx => {
  const session = batchSession[ctx.from.id];
  if (!session) return;
  if (session.step === 1 && ctx.message.forward_from_chat) {
    session.first_msg_id = ctx.message.message_id;
    session.step++;
    ctx.reply("📤 Send *last message* of batch:");
  } else if (session.step === 2) {
    session.last_msg_id = ctx.message.message_id;
    session.step++;
    ctx.reply("🎬 Enter *movie name*:");
  } else if (session.step === 3) {
    const title = ctx.message.text.trim();
    const code = title.substring(0, 4).toLowerCase() + "1619";
    const batchId = "batch_" + title.toLowerCase().replace(/\s+/g, "_");

    batches[batchId] = {
      id: batchId,
      title, code,
      from_id: session.first_msg_id,
      to_id: session.last_msg_id,
      created: formatDate()
    };

    saveJSON("batches.json", batches);
    ctx.reply(`✅ Batch Created!\n\n🎬 ${title}\n🔐 ${code}\n🔗 https://t.me/${ctx.botInfo.username}?start=${batchId}`);
    delete batchSession[ctx.from.id];
  }
});

// ✅ /deletebatch
bot.command("deletebatch", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  ctx.reply("🗑️ Send movie title to delete:");
  bot.once("text", ctx2 => {
    const title = ctx2.message.text.trim().toLowerCase().replace(/\s+/g, "_");
    const batchId = `batch_${title}`;
    if (batches[batchId]) {
      delete batches[batchId];
      saveJSON("batches.json", batches);
      ctx2.reply("✅ Deleted.");
    } else ctx2.reply("❌ Batch not found.");
  });
});

// ✅ /batches
bot.command("batches", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  if (Object.keys(batches).length === 0) return ctx.reply("📭 No batches yet.");
  let msg = "📦 All Batches:\n";
  for (const id in batches) {
    const b = batches[id];
    msg += `🎬 ${b.title} | Code: ${b.code}\n`;
  }
  ctx.reply(msg);
});

// ✅ /customcaption
bot.command("customcaption", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  if (settings.custom_caption) {
    ctx.reply(`📝 Current Caption:\n${settings.custom_caption}\n\n1. 🔄 Change\n2. ❌ Delete\n3. Cancel`);
    captionSession[ctx.from.id] = true;
  } else {
    ctx.reply("✍️ Send new caption in HTML (e.g. <b>DD4K</b>)");
    captionSession[ctx.from.id] = "new";
  }
});
bot.on("text", ctx => {
  const cap = captionSession[ctx.from.id];
  if (!cap) return;

  const txt = ctx.message.text;
  if (cap === true) {
    if (txt === "1") {
      captionSession[ctx.from.id] = "new";
      ctx.reply("✍️ Send new caption (HTML):");
    } else if (txt === "2") {
      settings.custom_caption = "";
      saveJSON("settings.json", settings);
      ctx.reply("🗑️ Caption deleted.");
      delete captionSession[ctx.from.id];
    } else {
      ctx.reply("❌ Cancelled.");
      delete captionSession[ctx.from.id];
    }
  } else if (cap === "new") {
    settings.custom_caption = txt;
    saveJSON("settings.json", settings);
    ctx.reply("✅ Caption saved!");
    delete captionSession[ctx.from.id];
  }
});

// ✅ /backupjson
bot.command("backupjson", async ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  let allGood = true;

  for (const file of jsonFiles) {
    try {
      fs.copyFileSync(file.main, file.backup);
      await ctx.reply(`✅ Backed up ${file.main} → ${file.backup}`);
    } catch {
      allGood = false;
      await ctx.reply(`❌ Failed to backup ${file.main}`);
    }
  }

  if (allGood) {
    ctx.reply("📤 Send backups now?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Yes, send", callback_data: "send_backups" }],
          [{ text: "❌ No", callback_data: "no_send" }]
        ]
      }
    });
  }
});

// ✅ /migrate (restore json)
bot.command("migrate", ctx => {
  if (!isAdmin(ctx.from.id)) return sendRoast(ctx);
  ctx.reply("🔄 Choose restore method:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📂 From Glitch Files", callback_data: "migrate_local" }],
        [{ text: "📥 Upload JSONs", callback_data: "migrate_upload" }]
      ]
    }
  });
});

// ✅ Callback Handling
bot.on("callback_query", async query => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id;

  if (!isAdmin(userId)) return;

  if (data === "send_backups") {
    for (const f of jsonFiles) {
      try {
        await bot.telegram.sendDocument(chatId, { source: f.backup });
      } catch {
        await bot.telegram.sendMessage(chatId, `❌ Failed to send ${f.backup}`);
      }
    }
  }

  if (data === "migrate_local") {
    for (const f of jsonFiles) {
      try {
        const content = fs.readFileSync(f.backup);
        fs.writeFileSync(f.main, content);
        await bot.telegram.sendMessage(chatId, `✅ Restored ${f.main}`);
      } catch {
        await bot.telegram.sendMessage(chatId, `❌ Failed to restore ${f.main}`);
      }
    }
  }

  if (data === "migrate_upload") {
    waitingUploadIndex = 0;
    bot.telegram.sendMessage(chatId, `📤 Send backup for: ${jsonFiles[waitingUploadIndex].main}`);
  }

  bot.telegram.answerCbQuery(query.id);
});

// ✅ JSON Upload Handler
bot.on("document", async ctx => {
  if (waitingUploadIndex === -1 || !isAdmin(ctx.from.id)) return;

  const fileId = ctx.message.document.file_id;
  const targetFile = jsonFiles[waitingUploadIndex].main;
  const link = await ctx.telegram.getFileLink(fileId);
  const res = await fetch(link.href);
  const content = await res.text();

  fs.writeFileSync(targetFile, content);
  await ctx.reply(`✅ Restored ${targetFile}`);

  waitingUploadIndex++;
  if (waitingUploadIndex < jsonFiles.length) {
    ctx.reply(`📤 Send backup for: ${jsonFiles[waitingUploadIndex].main}`);
  } else {
    waitingUploadIndex = -1;
    ctx.reply("✅ All JSONs restored!");
  }
});

// ✅ LAUNCH BOT (for Replit/Glitch Console Running)
bot.launch();
console.log("🤖 Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
