"""
Минибот — только открывает Mini App.
Запускать отдельно от самого приложения.

Установка: pip install python-telegram-bot
Запуск:    python bot.py
"""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)

# ── Замени на свои значения ───────────────────────────────────────────────────
BOT_TOKEN = "8755960128:AAEnFMxCndddyMJiHOvgHfLFDjpleTBfz-w"

# После деплоя на GitHub Pages ссылка будет такой:
# https://ТВО_ЛОГИН.github.io/gym-diary/
WEBAPP_URL = "https://hurricaneslav.github.io/gym-diary/"
# ─────────────────────────────────────────────────────────────────────────────


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[
        InlineKeyboardButton(
            text="💪 Открыть дневник",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ]]
    await update.message.reply_text(
        "Привет! Нажми кнопку чтобы открыть дневник тренировок 👇",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))

print("Бот запущен. Напиши /start своему боту в Telegram.")
app.run_polling()
