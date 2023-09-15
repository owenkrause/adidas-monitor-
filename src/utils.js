import fs from 'fs'
import axios from 'axios'
import dotenv from 'dotenv'
import { HttpsProxyAgent } from 'hpagent'
import { WebhookClient, EmbedBuilder } from 'discord.js'

dotenv.config()

export const sleep = ms => new Promise(r => setTimeout(r, ms))

export const getTime = () => {
  const date = new Date()
  return `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]`
}

export const instance = axios.create({
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
  }
})

export const sendWebhook = (product, sizes) => {
  const webhooks = [ process.env.scalar, process.env.viralBricks ]
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'https://www.adidas.com/', url: 'https://www.adidas.com/' })
    .setThumbnail(product.image)
    .setTitle(`${product.title} - ${product.color}`)
    .setURL(`https://www.adidas.com/us/~/${product.pid}.html`)
    .setDescription(`${product.pid}\n$${product.price} - ${product.discountable ? 'Discountable' : 'Excluded from discounts'}`)

  // some formatting incase there are a ton of sizes
  // splits them into two columns
  let first = ''
  let second = ''
  if( sizes.length > 8 ) { 
    first = sizes.slice(0, Math.round(sizes.length / 2)).join('')
    second = sizes.slice(Math.round(sizes.length / 2)).join('')
  } else {
    first = sizes.join('')
    second = '\u200b'
  }
  embed.addFields(
    { name: 'Sizes Restocked', value: first, inline: true },
    { name: '\u200b', value: second, inline: true }
  )
  webhooks.forEach( webhook => {
    (new WebhookClient({ url: webhook })).send({ embeds: [embed] })
  })
}

// axios default proxy config sucks
// only worked with some proxies
// using proxy agent worked for all proxies I have tested
// supports ip auth and user pass
export const getProxy = () => {
  const proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n')
  const index = Math.floor(Math.random() * proxies.length)
  const proxy = proxies[index].trim().split(':')
  return new HttpsProxyAgent({
    keepAlive: true,
    proxy: `http://${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`
  })
}