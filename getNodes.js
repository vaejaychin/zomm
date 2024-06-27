const { load, dump } = require('js-yaml');
const axios = require('axios').default;
const { encode } = require('js-base64');
const fs = require('fs')

const urls = fs.readFileSync('./1.txt', 'utf8').split('\n').map(i => i.trim()).filter(Boolean)

const arr = []
async function getNode(url) {
    try {

        const { data } = await axios.get(`https://api.2c.lol/sub?target=clash&url=${encodeURIComponent(url)}&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`)

        const { proxies } = load(data)

        console.log(url, proxies.length)

        if (proxies.length > 0) {
            arr.push(...proxies)
        }
    } catch (error) {

    }
}

async function run() {
    await Promise.all(urls.map(url =>

        getNode(url)

    ))

    fs.writeFileSync('config.yaml', dump({
        proxies: arr.map((i, index) => ({ ...i, name : index })),
        mode: 'Global',
        'external-controller': '0.0.0.0:9090',
        port: 7890,
    }))

}

run()