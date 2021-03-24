const request = require('request-promise')
const uuidv4 = require("uuid/v4")
const sign = require('jsonwebtoken').sign
const morgan = require("morgan")
const express = require("express")
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server, { pingInterval: 2000, pingTimeout: 5000 })
const wsClient = require('ws')
const redis = require('redis')
const cache = redis.createClient({ host: "upbit-redis", port: 6379 })

const access_key = process.env.UPBIT_OPEN_API_ACCESS_KEY || ''
const secret_key = process.env.UPBIT_OPEN_API_SECRET_KEY || ''
const server_url = process.env.UPBIT_OPEN_API_SERVER_URL || 'https://api.upbit.com'
const server_wss = process.env.UPBIT_OPEN_API_SERVER_WSS || 'wss://api.upbit.com/websocket/v1'

const socket = new wsClient(server_wss)
socket.on("connect", () => {
    console.log(`[*] upbit websocket connected`)
})

function getWallet() {
    const payload = {
        access_key: access_key,
        nonce: uuidv4(),
    }
    
    const token = sign(payload, secret_key)
    
    const options = {
        method: "GET",
        url: server_url + "/v1/accounts",
        headers: {Authorization: `Bearer ${token}`},
    }

    return request(options)
        .then((wallet) => {
            var mWallet = JSON.parse(wallet)
            var wallet = mWallet.filter(item => item.currency != "KRW")
            
            socket.send(JSON.stringify(currencyFormat(wallet)))
            return mWallet
        })
        .catch((error) => {
            console.log(error)
            return error
        })
}

function currencyFormat(items) {
    var result = []
    items.forEach(item => {
        result.push("KRW-" + item.currency)
    })
    return [{"ticket":uuidv4()},{"type":"ticker","codes":result,"isOnlyRealtime":true}]
}

app.use(morgan("combined"))
app.use('/static', express.static(__dirname + '/static'))
app.set('view engine', 'ejs')
app.enable('trust proxy')

app.get("/", (req, res) => {
    res.render("index")
})

var lastPrice = {}

io.sockets.on('connection', (client) => {
    client.on('wallet', () => {
        cache.get('wallet', (err, cdata) => {
            if(err || cdata == null) {
                getWallet()
                    .then((data) => {
                        cache.setex('wallet', 3, JSON.stringify(data))
                        client.emit('wallet', data)
                        data.forEach(item => {
                            if(item.currency != "KRW")
                                client.emit('message', lastPrice[item.currency])
                        })
                    })
                    .catch((err) => {
                        console.log(err)
                        client.emit('error', err)
                    })
                return
            }
            const data = JSON.parse(cdata)
            client.emit('wallet', data)
            data.forEach(item => {
                if(item.currency != "KRW")
                    client.emit('message', lastPrice[item.currency])
            })
        })
    })
})

socket.on('message', (data) => {
    const result = JSON.parse(Buffer.from(data).toString())
    lastPrice[result.code.substr(4)] = result
    io.emit('message', result)
})

server.listen(3000, () => {
    console.log("[*] upbit wallet watchdog")
})