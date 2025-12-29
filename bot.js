import fs from "fs"
import dotenv from "dotenv"
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js"

dotenv.config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
})

const command = new SlashCommandBuilder()
  .setName("run")
  .setDescription("Send a DM to all IDs in members.txt")
  .addStringOption(opt =>
    opt.setName("message")
      .setDescription("The message to send")
      .setRequired(true)
  )

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)

async function registerCommand() {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: [command.toJSON()] }
  )
  console.log("Slash command registered")
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== "run") return

  const message = interaction.options.getString("message")
  const ids = fs.readFileSync("members.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)

  await interaction.reply(`📨 Sending messages to ${ids.length} users...`)

  let sent = 0
  let failed = 0

  for (const id of ids) {
    try {
      const user = await client.users.fetch(id)
      await user.send(message)

      sent++
      console.log(`Sent to ${id}`)

      // RATE LIMIT PROTECTION
      await new Promise(r => setTimeout(r, 1500))
    } catch (err) {
      failed++
      console.log(`Failed: ${id}`)
    }
  }

  await interaction.followUp(`✅ Done!\nSent: ${sent}\nFailed: ${failed}`)
})

await registerCommand()
client.login(process.env.TOKEN)
