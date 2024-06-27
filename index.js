const fs = require('fs');
const { load, dump } = require('js-yaml');
const path = require('path');
const axios = require('axios').default;
const { speed } = require('./test');
const { HttpsProxyAgent } = require('https-proxy-agent');

const httpAgent = new HttpsProxyAgent(`http://127.0.0.1:7890`);
const httpsAgent = new HttpsProxyAgent(`http://127.0.0.1:7890`);
httpsAgent.options.rejectUnauthorized = false;


const configPath = path.join(__dirname, 'config.yaml'); // `config.yaml`;

function uniquees(proxies) {
    const proxiesMap = new Map();
    for (let proxy of proxies) {
        proxiesMap.set(
            `${proxy.server}:${proxy.port}:${proxy.uuid || '-'}:${proxy.password || '-'
            }`,
            proxy
        );
    }
    return [...proxiesMap.values()];
}

async function run() {
    let { proxies: originProxies } = load(fs.readFileSync(configPath, 'utf8'));
    const areaMap = {};
    const countrySet = new Set();

    const config = {
        mode: 'Global',
        'external-controller': '0.0.0.0:9090',
        port: 7890,
        proxies: [],
    }


    const proxies = uniquees(originProxies);
    console.log(
        `去重前有 ${originProxies.length} 个节点, 去重后有 ${proxies.length} 个节点`
    );

    await axios.put('http://127.0.0.1:9090/configs?force=true', { "path": configPath, "payload": "" })
    const proxiesArr = [];
    for (let i = 0; i < proxies.length; i += 30) {
        const p = (
            await Promise.allSettled(proxies.slice(i, i + 30).map((i) => getDelay(i)))
        )
            .filter((i) => i.status === 'fulfilled')
            .map((i) => i.value);
        proxiesArr.push(...p);
        console.log(
            proxiesArr.length,
            p.length,
            i,
            (((i + 30) / proxies.length) * 100).toFixed(2) + '%'
        );
    }
    // const proxiesArr = proxies;
    // 保存有延迟的节点
    fs.writeFileSync(
        configPath,
        dump({
            mode: 'Global',
            'external-controller': '0.0.0.0:9090',
            port: 7890,
            proxies: proxiesArr,
        }),
        'utf8'
    );

    for (let proxy of proxiesArr) {
        const { name } = proxy;
        console.log(name);
        // if (proxy.delay > 900) continue;
        try {
            await changeNode(name);
            const { data: res } = await axios
                // .get('http://ip-api.com/json/?lang=zh-CN', {
                .get('http://ipinfo.io', {
                    // httpsAgent: httpAgent,
                    httpAgent,
                    headers: {
                        'User-Agent':
                            // 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
                            'curl',
                    },

                    timeout: 2000,
                })
                .catch((e) => {
                    console.log(e?.response?.status);
                    return { country: '未知' };
                });

            const speedArr = await speed();
            proxy.speed = speedArr;

            const { country, city, org } = res || {};

            areaMap[country]
                ? (areaMap[country] += 1)
                : (areaMap[country] = 1);
            countrySet.add(country);
            proxy.name =
                country +
                ' - ' +
                city +
                ' - ' +
                org +
                ' - ' +
                areaMap[country];
            config.proxies.push(proxy);
        } catch (error) {
            console.log(11111, error?.response?.status);
        }
    }
    config.proxies.sort((a, b) => a.name.localeCompare(b.name));


    fs.writeFileSync(configPath, dump(config), 'utf8');




}
async function changeNode(name) {
    try {
        await axios.put(`http://127.0.0.1:9090/proxies/GLOBAL`, {
            name: name + '',
        });
    } catch (error) {
        console.log(error);
    }
}
/** 获取节点延迟 */
async function getDelay(i) {
    const { name } = i;
    // return { ...i, delay: 100 };
    const {
        data: { delay },
    } = await axios.get(
        `http://127.0.0.1:9090/proxies/${encodeURIComponent(
            name
        )}/delay?timeout=3000&url=${encodeURIComponent(
            // 'http://www.gstatic.com/generate_204'
            'https://www.google.com/generate_204'
            // 'http://cp.cloudflare.com/generate_204'
        )}`
    );
    console.log(name, delay);

    return { ...i, delay };
}

run()