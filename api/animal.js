const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  try {
    const { answers } = req.body

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `以下の5つの回答をもとに、その人に最も合う動物を1つ診断してください。

回答：
${answers.map((a, i) => `質問${i+1}: ${a}`).join('\n')}

以下のJSON形式のみで返してください（説明不要）：
{
  "animal": "動物名（例：ネコ）",
  "emoji": "動物の絵文字（例：🐱）",
  "description": "その動物に例えた性格の説明を3〜4文で。ポップでかわいい口調で。"
}`
      }]
    })

    const text = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const json = JSON.parse(clean)

    const { error: dbError } = await supabase.from('animals').insert({
      answers: JSON.stringify(answers),
      animal: json.animal,
      emoji: json.emoji,
      description: json.description
    })

    if (dbError) console.error('Supabase error:', dbError)

    res.status(200).json(json)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
